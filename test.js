
let IDEA = require('./index.js')

let { Interface } = require('readline')

let rl = new Interface({
  input: process.stdin,
  output: process.stdout,
	terminal: false
})

function request(question) {
	return new Promise(resolve => rl.question(question, resolve))
}


async function main() {
	let key = await request('Key: ')
	let cipher = new IDEA(key)

	let text = await request('Encrypt: ')
	let encrypted = cipher.encrypt(text)

	console.log('Resolt:', [...encrypted].map(byte => byte.toString(16)).join(''))
	console.log('Decrypted:', cipher.decrypt(encrypted).toString())

	rl.close()
}

main()
