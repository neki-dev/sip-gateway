## Simple gateway for SIP via WebSocket
.
* ### Install

```sh
npm i sip-gateway
```

* ###Configuration
| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| portSIP | number | 5060 | Port of SIP server |
| ssl | boolean | false | Using SSL |
| sslCert | string | - | Path to .srt |
| sslKey | string | - | Path to .key |
| timeout | number | 60000 | Connection timeout |
| maxListeners | number | 1000 | Max listeners |
| onConnect | function | - | Callback for connect event |
| onDisconnect | function | - | Callback for disconnect event |
| onSend | function | - | Callback for send event |
| onReceive | function | - | Callback for receive event |

* ### Usage

```js
const sipGateway = require('sip-gateway');
sipGateway.listen(3000, {
    /* configuration */ 
}, () => {
    /* callback */
});
```

* ### Example

```js
const sipGateway = require('sip-gateway');
sipGateway.listen(3000, {
    portSIP: 5061,
    ssl: true,
    sslCert: '/root/ssl/test.cert',
    sslKey: '/root/ssl/test.key',
    onReceive: (data, stream) => {
        if (!someFunctionForCheckData(data)) {
            // Return false for stop receive
            return false;
        }       
    },
    onConnect: (socket) => {
        // ...
    },
}, () => {
    console.log('Listening on wss://127.0.0.1:3000');
});
```