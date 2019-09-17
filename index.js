const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
const net = require('net');

/*
 *	Configuration
 */

const CONFIG_DEBUG = true;
const CONFIG_LOCAL_HOST = 'localhost';
const CONFIG_LOCAL_PORT = 1337;
const CONFIG_DEFAULT_SIP_PORT = 5060;
const CONFIG_SIP_TIMEOUT = 120;
const CONFIG_SIP_MAX_LISTERNS = 1000;
const CONFIG_SIP_SSL = true;

/*
 * Creating local server
 */

let serverWebsocket = undefined;
let serverHttps = undefined;

const serverHandler = () => {
	console.log('@ SIPGateway listening on ' + (CONFIG_SIP_SSL ? 'wss' : 'ws') + '://' + CONFIG_LOCAL_HOST + ':' + CONFIG_LOCAL_PORT);
};

if (CONFIG_SIP_SSL) {
	// Creating HTTPS server for WSS
	serverHttps = https.createServer({
		cert: fs.readFileSync('./ssl/localhost.crt'),
		key: fs.readFileSync('./ssl/localhost.key')
	});
	serverHttps.listen(CONFIG_LOCAL_PORT, serverHandler);
}

serverWebsocket = new WebSocket.Server({
	server: CONFIG_SIP_SSL ? serverHttps : undefined,
	host: CONFIG_SIP_SSL ? undefined : CONFIG_LOCAL_HOST,
	port: CONFIG_SIP_SSL ? undefined : CONFIG_LOCAL_PORT,
	handleProtocols: p => {
		// Allow only SIP protocol
		return (p.indexOf('sip') == -1) ? 'invalid_protocol' : 'sip';
	}
}, serverHandler); 

serverWebsocket.on('connection', socket => {

	let stream = undefined;

	// Creating connection with SIP
	const createStream = (host, port) => {

		const s = net.connect(port || CONFIG_DEFAULT_SIP_PORT, host);

		s.setTimeout(CONFIG_SIP_TIMEOUT * 1000); 
		s.setEncoding('binary');
		s.setMaxListeners(CONFIG_SIP_MAX_LISTERNS);

		// Data from SIP to client
		s.on('data', data => {

			socket.send(data);

			if (CONFIG_DEBUG) {
				console.log('------------------------------');
				console.log('---------- <<====== ----------');
				console.log('------------------------------\n');
				console.log(data);
			}

		});

		return s;

	};
	
	// Data from client to SIP
	socket.on('message', data => {

		if (!stream) {
			// Get SIP host from request header
			const target = data.split('\n')[0].split(' ')[1];
			stream = createStream(target.split((target.indexOf('@') == -1) ? ':' : '@')[1]);
		}

		stream.write(data, 'binary');

		if (CONFIG_DEBUG) {
			console.log('------------------------------');
			console.log('---------- ======>> ----------');
			console.log('------------------------------\n');
			console.log(data);
		}

	});
	
	// Closing connection with SIP
	socket.on('close', data => {

		if (stream) {
			stream.destroy();
		}

	});

});