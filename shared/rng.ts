/**
 * Injectable RNG. The engine never calls Math.random(); it always receives an `Rng`.
 * - Production server: `cryptoRng()` from server/rng.ts (node:crypto backed).
 * - Tests / simulations: `seededRng(seed)` (deterministic).
 */
export interface Rng {
	/** Float in [0, 1). */
	next(): number;
	/** Integer in [0, maxExclusive). */
	int(maxExclusive: number): number;
}

/** Pick a random element (throws on empty arrays). */
export function pick<T>(rng: Rng, arr: readonly T[]): T {
	if (arr.length === 0) throw new Error('pick() on empty array');
	return arr[rng.int(arr.length)];
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
	const out = arr.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = rng.int(i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Deterministic sfc32 PRNG seeded from a 32-bit integer or a string. */
export function seededRng(seed: number | string): Rng {
	let h = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
	// splitmix32 to derive 4 state words
	const sm = () => {
		h = (h + 0x9e3779b9) | 0;
		let z = h;
		z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
		z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
		return (z ^ (z >>> 16)) >>> 0;
	};
	let a = sm(),
		b = sm(),
		c = sm(),
		d = sm();
	const next = () => {
		a >>>= 0;
		b >>>= 0;
		c >>>= 0;
		d >>>= 0;
		let t = (a + b) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		d = (d + 1) | 0;
		t = (t + d) | 0;
		c = (c + t) | 0;
		return (t >>> 0) / 4294967296;
	};
	return {
		next,
		int: (max: number) => Math.floor(next() * max)
	};
}

function hashString(s: string): number {
	let h = 2166136261 >>> 0;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
