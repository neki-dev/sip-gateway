const WebSocket = require('ws');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');

/**
 * Create socket stream
 *
 * @param {WebSocket.WebSocket} socket
 * @param {Object} params
 * @param {number} params.port
 * @param {string} params.host
 * @param {number} [params.timeout]
 * @param {number} [params.maxListeners]
 * @param {Function} [params.callback]
 *
 * @returns {net.Socket}
 */
function createStream(socket, {
  host, port, timeout, maxListeners, callback,
}) {
  const stream = net.connect(port, host);

  stream.setEncoding('binary');
  if (timeout !== undefined) {
    stream.setTimeout(timeout);
  }
  if (maxListeners !== undefined) {
    stream.setMaxListeners(maxListeners);
  }

  stream.on('data', (data) => {
    if (callback) {
      const result = callback(data, stream);
      if (result === false) {
        return;
      }
    }

    socket.send(data);
  });

  return stream;
}

/**
 * Get host from SIP message
 *
 * @param {string} data
 *
 * @returns {string}
 */
function parseHost(data) {
  const meta = data.split('\n')[0];
  const target = meta.split(' ')[1];
  const host = target.split(/(:|@)/)[1];

  return host;
}

/**
 * Verify SIP protocol
 *
 * @param {string} protocol
 *
 * @returns {string}
 */
function handleProtocols(protocol) {
  return (protocol.indexOf('sip') === -1) ? 'invalid_protocol' : 'sip';
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
  onListen, onSend, onReceive,
}) {
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
  config.server.listen(port, host);

  const ws = new WebSocket.Server(config, onListen);
  ws.on('connection', (socket) => {
    let stream;

    socket.on('message', (data) => {
      if (!stream) {
        stream = createStream(socket, {
          host: hostSIP || parseHost(data),
          port: portSIP,
          timeout,
          maxListeners,
          callback: onSend,
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
