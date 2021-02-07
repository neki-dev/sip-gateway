## Simple gateway for SIP via WebSocket
.
## Install

```sh
npm i sip-gateway
```

## Configuration
| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| portSIP | number | 5060 | Port of SIP server |
| ssl | boolean | false | Using SSL |
| sslCert | string | - | Path to .srt |
| sslKey | string | - | Path to .key |
| timeout | number | 60000 | Connection timeout |
| maxListeners | number | 1000 | Max listeners |
| onReceive | function | - | Callback for receive event |
| onSend | function | - | Callback for send event |

## Usage

```js
const sipGateway = require('sip-gateway');
sipGateway.listen(3000, {
    /* configuration */ 
}, () => {
    console.log('Gateway server listening on :3000');
});
```