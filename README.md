# idea-cipher
 International Data Encryption Algorithm js implementation

# Usage
```js
let IDEA = require('idea-cipher')

let cipher = new IDEA('secure key')
let encrypted = cipher.encrypt('private message')
let decrypted = cipher.decrypt(encrypted)
```

[Based on](https://github.com/davidmigloz/IDEA-cipher)
