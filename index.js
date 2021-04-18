
function generateKeys(key) {
	if(key.length != 16)
		throw Error('Ключ должен быть 128 бит в длину')

	// Allocating memory
	let keys = new Uint16Array(52)

	// The key is split into eight 16 bit subkeys
	let dv = new DataView(key.buffer, key.byteOffset, key.byteLength)
	for(let i = 0; i < 8; i++)
		keys[i] = dv.getUint16(i)

	// The remaining 44 subkeys are filled in
	for(let i = 8; i < 52; i++) {
		// There is a left rotation of 25 bits
		let b1 = keys[i - ((i + 1) % 8 ? 7 : 15)] << 9
		let b2 = keys[i - ((i + 2) % 8 < 2 ? 14 : 6)] >> 7
		keys[i] = b1 | b2
	}

	return keys
}

function invertKeys(keys) {
	let invKeys = new Uint16Array(52), p = 0

	// Round 9 (Final Transformation)
	invKeys[48] = modInv(keys[p++])
	invKeys[49] = addInv(keys[p++])
	invKeys[50] = addInv(keys[p++])
	invKeys[51] = modInv(keys[p++])

	// Rounds [8 - 2]
	for(let r = 7; r > 0; r--) {
		let i = r * 6
		invKeys[i + 4] = keys[p++]
		invKeys[i + 5] = keys[p++]
		invKeys[i    ] = modInv(keys[p++])
		invKeys[i + 2] = addInv(keys[p++])
		invKeys[i + 1] = addInv(keys[p++])
		invKeys[i + 3] = modInv(keys[p++])
	}

	// Round 1
	invKeys[4] = keys[p++]
	invKeys[5] = keys[p++]
	invKeys[0] = modInv(keys[p++])
	invKeys[1] = addInv(keys[p++])
	invKeys[2] = addInv(keys[p++])
	invKeys[3] = modInv(keys[p  ])

	return invKeys
}

function block(dv, offset, keys) {
	let x1 = dv.getUint16(offset)
	let x2 = dv.getUint16(offset + 2)
	let x3 = dv.getUint16(offset + 4)
	let x4 = dv.getUint16(offset + 6)

	let k = 0 // Round-by-round crawl
	for(let round = 0; round < 8; round++) {
		let y1 = mul(x1, keys[k++]) // K1
		let y2 = add(x2, keys[k++]) // K2
		let y3 = add(x3, keys[k++]) // K3
		let y4 = mul(x4, keys[k++]) // K4

		let y5 = y1 ^ y3
		let y6 = y2 ^ y4

		// MA-box
		let y7 = mul(y5, keys[k++]) // K5
		let y8 = add(y6, y7)
		let y9 = mul(y8, keys[k++]) // K6
		let y10 = add(y7, y9)

		x1 = y1 ^ y9
		x2 = y3 ^ y9
		x3 = y2 ^ y10
		x4 = y4 ^ y10
	}

	dv.setUint16(offset,     mul(x1, keys[48]))
	dv.setUint16(offset + 2, add(x3, keys[49]))
	dv.setUint16(offset + 4, add(x2, keys[50]))
	dv.setUint16(offset + 6, mul(x4, keys[51]))
}

function completeData(data) {
	let {length} = data

	// The length is extended to the desired size
	length += 8 - (length % 8 || 8)

	// Allocating memory
	let res = new Uint8Array(length)

	// The buffer is copied to the reserved memory
	res.set(data)

	return res
}


class ECB {
	crypt(data, keys) {
		let offset = data.length
		let dv = new DataView(data.buffer)

		// Passing through the blocks
		while(offset)
			block(dv, offset -= 8, keys)

		return data
	}

	encrypt = this.crypt
	decrypt = this.crypt
}


const decoder = new TextDecoder
const encoder = new TextEncoder

class IDEA {
	constructor(key, mode = ECB) {
		if(!key) throw Error('Ключ не указан')

		if(key.length < 7)
			throw Error('The key must be at least 7 bytes long')

		if(typeof key == 'string') {
			let charKey = encoder.encode(key)

			key = new Uint8Array(16)

			for(let i = 0, j = 0; i < charKey.length; i++, j = (j + 1) % key.length)
				key[j] ^= charKey[i]
		}

		this.key = key
		this.mode = new mode
	}

	get encryptionKeys() {
		Object.defineProperty(this, 'encryptionKeys', {
			value: generateKeys(this.key)
		}) // Updating the getter to the calculated value
		return this.encryptionKeys
	}

	get decryptionKeys() {
		Object.defineProperty(this, 'decryptionKeys', {
			value: invertKeys(this.encryptionKeys)
		})
		return this.decryptionKeys
	}

	encrypt(data) {
		if(typeof data == 'string')
			data = encoder.encode(data)

		return this.mode.encrypt(
			completeData(data),
			this.encryptionKeys
		)
	}

	decrypt(data) {
		let res = this.mode.decrypt(
			completeData(data),
			this.decryptionKeys
		)
		res.toString = () => decoder.decode(res)
		return res
	}

	static ECB = ECB
}
module.exports = IDEA

// Ops
function modInv(a, m = 0x10001) {
	let m0 = m, y = 0, x = 1
	if(m == 1) return 0

	while(a > 1) {
		let q = parseInt(a / m), t = m

		m = a % m
		a = t
		t = y

		y = x - q * y
		x = t
	}

	return x < 0? x + m0 : x
}

function mul(a, b) {
	let m = a * b
	if(m) return (m % 0x10001) & 0xFFFF
	if(a || b) return (1 - a - b) & 0xFFFF
	return 1
}

function addInv(x) {
	return (0x10000 - x) & 0xFFFF
}

function add(x, y) {
	return (x + y) & 0xFFFF
}