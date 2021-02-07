const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const net = require('net');

module.exports = {

    /**
     * Listen gateway server
     *
     * @param {number} port
     * @param {Object} [config]
     * @param {number} [config.portSIP=5060]
     * @param {boolean} [config.ssl=false]
     * @param {string} [config.sslCert]
     * @param {string} [config.sslKey]
     * @param {number} [config.maxListeners=1000]
     * @param {number} [config.timeout=60000]
     * @param {function} [config.onConnect]
     * @param {function} [config.onDisconnect]
     * @param {function} [config.onSend]
     * @param {function} [config.onReceive]
     * @param {function} [callback]
     *
     * @return {?WebSocket.Server}
     */
    listen(port, config = {}, callback) {

        config = {
            portSIP: 5060,
            ssl: false,
            maxListeners: 1000,
            timeout: 60000,
            ...config,
        };

        const serverConfiguration = {};
        if (config.ssl) {
            if (config.sslCert && config.sslKey) {
                // Creating HTTPS server for WSS
                serverConfiguration.server = https.createServer({
                    cert: fs.readFileSync(config.sslCert),
                    key: fs.readFileSync(config.sslKey)
                });
                serverConfiguration.server.listen(port, callback);
            } else {
                console.error('Undefined path of SSL certificate');
                return null;
            }
        } else {
            serverConfiguration.port = port;
        }

        const server = new WebSocket.Server({
            ...serverConfiguration,
            // Allow only SIP protocol
            handleProtocols: (p) => (p.indexOf('sip') === -1) ? 'invalid_protocol' : 'sip',
        }, callback);

        // Creating connection with SIP
        const createStream = (socket, host) => {
            const s = net.connect(config.portSIP, host);
            s.setTimeout(config.timeout);
            s.setEncoding('binary');
            s.setMaxListeners(config.maxListeners);
            // Data from SIP to client
            s.on('data', (data) => {
                if (config.onSend) {
                    const res = config.onSend(data, s);
                    if (res === false) {
                        return;
                    }
                }
                socket.send(data);
            });
            return s;
        };

        server.on('connection', (socket) => {

            if (config.onConnect) {
                config.onConnect(socket);
            }

            let stream = undefined;

            // Data from client to SIP
            socket.on('message', (data) => {
                if (!stream) {
                    // Get SIP host from request header
                    const target = data.split('\n')[0].split(' ')[1];
                    const delimiter = (target.indexOf('@') === -1) ? ':' : '@';
                    const host = target.split(delimiter)[1];
                    stream = createStream(socket, host);
                }
                if (config.onReceive) {
                    const res = config.onReceive(data, stream);
                    if (res === false) {
                        return;
                    }
                }
                stream.write(data, 'binary');
            });

            // Closing connection with SIP
            socket.on('close', () => {
                if (config.onDisconnect) {
                    config.onDisconnect(socket);
                }
                if (stream) {
                    stream.destroy();
                }
            });

        });

        return server;

    },

};