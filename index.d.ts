
type Buf = string | Uint8Array | Buffer

declare class IDEA {
	constructor(key: Buf, mode?: IDEA.ECB)

	encrypt(data: Buf): Uint8Array
	decrypt(data: Buf): Uint8Array
}

declare namespace IDEA {
	class ECB {
		encrypt<T>(data: Buf, key: Buf): T
		decrypt<T>(data: Buf, key: Buf): T
	}
}

export = IDEA
