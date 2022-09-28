const WebSocket = require('ws');
const fs = require('fs');
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
 * Start gateway server
 *
 * @param {Object} params
 * @param {number} params.port
 * @param {number} [params.portSIP=5060]
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
  port, portSIP = 5060, maxListeners, timeout = 60000, ssl, onListen, onSend, onReceive,
}) {
  const serverConfiguration = {};
  if (ssl) {
    serverConfiguration.server = https.createServer({
      cert: fs.readFileSync(ssl.cert),
      key: fs.readFileSync(ssl.key),
    });
    serverConfiguration.server.listen(port);
  } else {
    serverConfiguration.port = port;
  }

  const server = new WebSocket.Server({
    ...serverConfiguration,
    handleProtocols: (p) => ((p.indexOf('sip') === -1) ? 'invalid_protocol' : 'sip'),
  }, onListen);

  server.on('connection', (socket) => {
    let stream;

    socket.on('message', (data) => {
      if (!stream) {
        const target = data.split('\n')[0].split(' ')[1];
        const delimiter = (target.indexOf('@') === -1) ? ':' : '@';
        const host = target.split(delimiter)[1];
        stream = createStream(socket, {
          host,
          port: portSIP,
          timeout,
          maxListeners,
          callback: onSend,
        });
      }

      if (onReceive) {
        const result = onReceive(data, stream);
        if (result === false) {
          return;
        }
      }

      stream.write(data, 'binary');
      server.emit('transferData', data);
    });

    socket.on('close', () => {
      server.emit('disconnect', socket);

      if (stream) {
        stream.destroy();
      }
    });
  });

  return server;
};
