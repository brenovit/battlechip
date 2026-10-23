import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import type { Rng } from '../shared/rng.js';
import type { Placement } from '../shared/types.js';

/** Server RNG backed by node:crypto. Use for everything authoritative (deploy, deflect, bots...). */
export function cryptoRng(): Rng {
	return {
		next: () => randomInt(0, 0x100000000) / 0x100000000,
		int: (max: number) => randomInt(0, Math.max(1, max))
	};
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** Cryptographically random game code (default 6 chars, ~30 bits). */
export function generateGameCode(length = 6): string {
	let s = '';
	for (let i = 0; i < length; i++) s += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
	return s;
}

export function generateToken(): string {
	return randomBytes(24).toString('base64url');
}

export function safeEqual(a: string, b: string): boolean {
	const x = Buffer.from(a);
	const y = Buffer.from(b);
	return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Usernames: strip control chars and markup-relevant characters, collapse whitespace, cap length.
 * (The client additionally renders names only via text interpolation, never {@html}.)
 */
export function sanitizeName(raw: string): string {
	const cleaned = raw
		.normalize('NFKC')
		.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
		.replace(/[<>&"'`\\/]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 20);
	return cleaned || 'Operator';
}

/** Fairness commitment: sha256(canonical board JSON + salt). */
export function commitBoard(placements: Placement[], salt: string): string {
	return createHash('sha256').update(JSON.stringify(placements) + salt).digest('hex');
}

export function newSalt(): string {
	return randomBytes(16).toString('hex');
}

/** Simple token bucket. */
export class TokenBucket {
	private tokens: number;
	private last = Date.now();
	constructor(
		private capacity: number,
		private refillPerSec: number
	) {
		this.tokens = capacity;
	}
	take(n = 1): boolean {
		const now = Date.now();
		this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refillPerSec);
		this.last = now;
		if (this.tokens < n) return false;
		this.tokens -= n;
		return true;
	}
}

/** Keyed fixed-window limiter (e.g. join attempts per IP). */
export class WindowLimiter {
	private hits = new Map<string, { count: number; reset: number }>();
	constructor(
		private max: number,
		private windowMs: number
	) {}
	allow(key: string): boolean {
		const now = Date.now();
		const h = this.hits.get(key);
		if (!h || h.reset < now) {
			this.hits.set(key, { count: 1, reset: now + this.windowMs });
			if (this.hits.size > 10000) this.prune(now);
			return true;
		}
		h.count++;
		return h.count <= this.max;
	}
	private prune(now: number) {
		for (const [k, v] of this.hits) if (v.reset < now) this.hits.delete(k);
	}
}
