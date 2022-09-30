## Simple gateway for SIP via WebSocket
.
* ### Install

```sh
npm i sip-gateway
```

* ### Configuration
| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| port | number | - | Port of gateway server |
| host | string | (localhost) | Host of gateway server |
| portSIP | number | 5060 | Port of SIP server |
| hostSIP | string | (autodetect) | Host of SIP server |
| ssl | Object | - | Using SSL |
| ssl.cert | string | - | Path to .crt file |
| ssl.key | string | - | Path to .key file |
| timeout | number | 60000 | Connection timeout |
| maxListeners | number | - | Max listeners |
| onListen | function | - | Callback for listen event |
| onSend | function | - | Callback for send event |
| onReceive | function | - | Callback for receive event |

* ### Events
| Name | Parameters | Description |
| --- | --- | --- |
| connect | socket | New socket connection |
| disconnect | socket | Socket disconnection |
| streamCreate | stream | Create stream |
| streamDestroy | stream | Destroy stream |
| transferData | data, stream | Transfer stream data |

* ### Usage

```js
const sipGateway = require('sip-gateway');
sipGateway.start({
    // Configuration 
});
```

* ### Example

```js
const sipGateway = require('sip-gateway');
sipGateway.listen({
    port: 3000,
    portSIP: 5061,
    ssl: { 
        cert: '/root/ssl/test.crt',
        key: '/root/ssl/test.key',
    },
    onSend: (data, stream) => {
        if (!someFunctionForCheckData(data)) {
            // Return false for stop send (if needed)
            return false;
        }       
    },
    onReceive: (data, stream) => {
        if (!someFunctionForCheckData(data)) {
            // Return false for stop receive (if needed)
            return false;
        }       
    },
    onListen: (socket) => {
        console.log('Listening on wss://127.0.0.1:3000');
    },
});

sipGateway.on('connect', (socket) => {
    console.log('Add socket', socket);
});

sipGateway.on('disconnect', (socket) => {
    console.log('Remove socket', socket);
});

sipGateway.on('streamCreate', (stream) => {
    console.log('Add stream', stream);
});

sipGateway.on('streamDestroy', (stream) => {
    console.log('Remove stream', stream);
});

sipGateway.on('transferData', (data, stream) => {
    console.log('Message:', data);
});
```