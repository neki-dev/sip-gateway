const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const dgram = require('dgram');

/**
 * Create socket stream
 *
 * @param {WebSocket.WebSocket} socket
 * @param {Object} params
 * @param {number} params.port
 * @param {string} params.host
 * @param {string} [params.transport='tcp']
 * @param {number} [params.timeout]
 * @param {number} [params.maxListeners]
 * @param {Function} [params.callback]
 * @param {Function} [params.onError]
 *
 * @returns {net.Socket|dgram.Socket}
 */
function createStream(socket, {
  host, port, transport = 'tcp', timeout, maxListeners, callback, onError,
}) {
  let stream;

  const onData = (data) => {
    if (callback) {
      const result = callback(data, stream);
      if (result === false) {
        return;
      }
    }

    socket.send(data);
  };

  if (transport === 'udp') {
    stream = dgram.createSocket(net.isIP(host) === 6 ? 'udp6' : 'udp4');

    // dgram connects asynchronously, so queue data until the socket is ready
    const queue = [];
    let connected = false;
    stream.on('connect', () => {
      connected = true;
      while (queue.length > 0) {
        stream.send(queue.shift());
      }
    });

    // Adapt the dgram API to the stream interface used by the gateway
    stream.write = (data) => (connected ? stream.send(data) : queue.push(data));
    stream.destroy = () => stream.close();
    stream.on('message', onData);

    stream.connect(port, host);
  } else {
    stream = net.connect(port, host);
    stream.setEncoding('binary');

    if (timeout !== undefined) {
      stream.setTimeout(timeout);
    }

    stream.on('data', onData);
  }

  if (maxListeners !== undefined) {
    stream.setMaxListeners(maxListeners);
  }

  stream.on('error', (err) => {
    if (onError) {
      onError(err, stream);
    }
  });

  return stream;
}

/**
 * Get host from SIP message
 *
 * @param {Buffer|string} data
 *
 * @returns {string|undefined}
 */
function parseHost(data) {
  const meta = data.toString().split('\n')[0];
  const target = meta.split(' ')[1];

  if (!target) {
    return undefined;
  }

  return target.split(/[:@]/).pop();
}

/**
 * Verify SIP protocol
 *
 * @param {Set<string>} protocols
 *
 * @returns {string}
 */
function handleProtocols(protocols) {
  return (protocols.has('sip')) ? 'sip' : 'invalid_protocol';
}

/**
 * Start gateway server
 *
 * @param {Object} params
 * @param {number} params.port
 * @param {string} [params.host]
 * @param {number} [params.portSIP=5060]
 * @param {string} [params.hostSIP]
 * @param {number} [params.timeout=60000]
 * @param {number} [params.maxListeners]
 * @param {string} [params.transport='tcp'] Transport protocol to SIP server (tcp/udp)
 * @param {Function} [params.onListen]
 * @param {Function} [params.onSend]
 * @param {Function} [params.onReceive]
 * @param {Object} [params.ssl]
 * @param {string} params.ssl.cert
 * @param {string} params.ssl.key
 *
 * @returns {WebSocket.Server}
 */
module.exports = function start({
  port, host,
  portSIP = 5060, hostSIP,
  maxListeners, timeout = 60000, ssl,
  transport = 'tcp',
  onListen, onSend, onReceive,
}) {
  if (transport !== 'tcp' && transport !== 'udp') {
    throw new TypeError(`Unknown transport: ${transport}`);
  }

  const config = {
    handleProtocols,
  };

  if (ssl) {
    config.server = https.createServer({
      cert: fs.readFileSync(ssl.cert),
      key: fs.readFileSync(ssl.key),
    });
  } else {
    config.server = http.createServer();
  }
  config.server.listen(port, host, onListen);

  const ws = new WebSocket.Server(config);
  ws.on('connection', (socket) => {
    let stream;

    socket.on('message', (data) => {
      if (!stream) {
        const streamHost = hostSIP || parseHost(data);

        // Ignore messages without a request line (e.g. keep-alives)
        if (!streamHost) {
          return;
        }

        stream = createStream(socket, {
          host: streamHost,
          port: portSIP,
          transport,
          timeout,
          maxListeners,
          callback: onSend,
          onError: (err) => ws.emit('streamError', err, stream),
        });

        ws.emit('streamCreate', stream);
      }

      if (onReceive) {
        const result = onReceive(data, stream);
        if (result === false) {
          return;
        }
      }

      stream.write(data, 'binary');
      ws.emit('transferData', data, stream);
    });

    socket.on('close', () => {
      ws.emit('disconnect', socket);

      if (stream) {
        ws.emit('streamDestroy', stream);
        stream.destroy();
      }
    });

    ws.emit('connect', socket);
  });

  return ws;
};
