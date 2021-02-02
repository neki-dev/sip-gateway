# sip-gateway.js
> Simple gateway for SIP via WebSocket

## Install


```sh
npm i sip-gateway
```

## Usage

```js
const sipGateway = require('sip-gateway');
sipGateway.listen(3000, {
    /* configuration */ 
}, () => {
    console.log('Gateway server listening on :3000');
});
```

## Configuration
| Param | Type | Default |
| --- | --- | --- |
| portSIP | int | 5060 |
| ssl | boolean | false |
| sslCert | string | - |
| sslKey | string | - |
| maxListeners | int | 1000 |
| timeout | int | 60000 |