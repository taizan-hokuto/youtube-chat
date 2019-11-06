declare function require(x: string): any;
const textEncoding = require('text-encoding');
const TextEncoder = textEncoding.TextEncoder;
const btoa = require('btoa');

function genVid(videoID?: string): string {
	const item: Uint8Array[] = [
		Uint8Array.of(0x0A, 0x0F, 0x0A, 0x0D, 0x0A, 0x0B),
		(new TextEncoder).encode(videoID),
		Uint8Array.of(0x1A, 0x43, 0xAA, 0xB9, 0xC1, 0xBD, 0x01, 0x3D, 0x0A, 0x3B),
		(new TextEncoder).encode("https://www.youtube.com/live_chat?v=" + videoID + "&is_popout=1"),
		Uint8Array.of(0x20, 0x02),
	];
	const ret = new Uint8Array(concatenation(item))
	return  escape2(arrayToBase64String(ret))
}

function arrayToBase64String(a: Uint8Array): string {
	return btoa(String.fromCharCode(...a));
}

function concatenation(segments: any){
	var sumLength = 0;
	for(var i = 0; i < segments.length; ++i){
		sumLength += segments[i].byteLength;
	}
	var whole = new Uint8Array(sumLength);
	var pos = 0;
	for(var i = 0; i < segments.length; ++i){
		whole.set(new Uint8Array(segments[i]),pos);
		pos += segments[i].byteLength;
	}
	return whole.buffer;
}

function construct(videoID?: string , ...timeStamps: number[]): string {
	const vid = genVid(videoID)
	const timestamp0 = chain_ts(timeStamps[0])
	const timestamp1 = chain_ts(timeStamps[1])
	const timestamp2 = chain_ts(timeStamps[2])
	const timestamp3 = chain_ts(timeStamps[3])
	const timestamp4 = chain_ts(timeStamps[4])

	const header = Uint8Array.of(0xD2, 0x87, 0xCC, 0xC8, 0x03)
	const bodyItem: Uint8Array[] = [
		Uint8Array.of(0x1A), chain(vid.length), (new TextEncoder).encode(vid),
		Uint8Array.of(0x28),
		timestamp0,
		Uint8Array.of(0x30, 0x00, 0x38, 0x00, 0x40, 0x02, 0x4A, 0x2B,
			0x08, 0x00, 0x10, 0x00, 0x18, 0x00, 0x20, 0x00, // #2nd byte 00<->01
			0x2A, 0x0E, 0x73, 0x74, 0x61, 0x74, 0x69, 0x63,
			0x63, 0x68, 0x65, 0x63, 0x6B, 0x73, 0x75, 0x6D,
			0x3A, 0x00, 0x40, 0x00, 0x4A, 0x02, 0x08, 0x01,
			0x50),
		timestamp1,
		Uint8Array.of(0x58, 0x03, 0x50),
		timestamp2,
		Uint8Array.of(0x58),
		timestamp3,
		Uint8Array.of(0x68, 0x01, 0x82, 0x01, 0x04, 0x08, 0x01, 0x10,
			0x00, 0x88, 0x01, 0x00, 0xA0, 0x01),
		timestamp4];

	const body = new Uint8Array(concatenation(bodyItem))
	const args = concatenation([header, chain(body.length), body])
	return escape(arrayToBase64String(new Uint8Array(args)))

}

function gentimes():number[] {
	const utms: number  = new Date().getTime() * 1000
	const utms0: number = Math.floor(utms - Math.random()*1*1000000)
	const utms1: number = Math.floor(utms - Math.random()*10*1000000)
	const utms2: number = Math.floor(utms0 - 30.0*1000000-Math.random()*5*1000000)
	const utms3: number = Math.floor(utms - Math.random()*30*60*1000000)
	const utms4: number = Math.floor(utms)
	return [utms0, utms1, utms2, utms3, utms4]
}

export function getparam(videoID?: string): string{
	return construct(videoID,...gentimes());
}

function chain(val: number) {
	if (val < 0) {
		return null
	}
	var buff = new Uint8Array(16)
	var i: number = 0
	for (;val>>7 > 0;i++){
		var cval = val&0xFF | 0x80
		buff[i]= cval
		val >>= 7
	}
	buff[i]= val
	return buff.slice(0,i+1)
}

function chain_ts(val: number) {
	if (val < 0) {
		return null
	}
	val=Math.floor(val/Math.pow(2,21))
	var buff = new Uint8Array(16)
	buff[0] = Math.floor(Math.random()*128) | 0x80
	buff[1] = Math.floor(Math.random()*128) | 0x80
	buff[2] = Math.floor(Math.random()*128) | 0x80
	var i: number = 0
	for (;val>>7 > 0;i++){
		var cval = val&0xFF | 0x80
		buff[i+3]= cval
		val >>= 7
	}
	buff[i+3]= val
	return buff.slice(0,i+4)
}

function escape (str: string): string {
	return str.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=/g, '%253D')
}

function escape2(str: string): string {
	return str.replace(/\+/g, '-')
	.replace(/\//g, '_')
	.replace(/=/g, '%3D')
}

