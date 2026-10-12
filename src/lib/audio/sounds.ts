/**
 * Zero-asset procedural WebAudio sound synthesizer.
 * Generates retro-cyberpunk sound effects dynamically.
 */

class SoundEngine {
	private ctx: AudioContext | null = null;
	private muted: boolean = false;

	constructor() {
		if (typeof window !== 'undefined') {
			this.muted = localStorage.getItem('battlechip.muted') === 'true';
		}
	}

	private getContext(): AudioContext | null {
		if (typeof window === 'undefined') return null;
		if (!this.ctx) {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioContextClass) {
				this.ctx = new AudioContextClass();
			}
		}
		if (this.ctx && this.ctx.state === 'suspended') {
			this.ctx.resume().catch(() => {});
		}
		return this.ctx;
	}

	public isMuted(): boolean {
		return this.muted;
	}

	public setMuted(muted: boolean) {
		this.muted = muted;
		if (typeof window !== 'undefined') {
			localStorage.setItem('battlechip.muted', muted ? 'true' : 'false');
		}
	}

	public toggleMute(): boolean {
		this.setMuted(!this.muted);
		return this.muted;
	}

	/** Soft mechanical click for UI and hardware drop */
	public playClick() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(800, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);

		gain.gain.setValueAtTime(0.15, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.04);
	}

	/** High blip for rotation */
	public playRotate() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(600, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.06);

		gain.gain.setValueAtTime(0.12, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.06);
	}

	/** Cybernetic boot-up scanline sweep */
	public playBoot() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(220, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

		gain.gain.setValueAtTime(0.1, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.15);
	}

	/** Laser data packet launch */
	public playShot() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(1400, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);

		gain.gain.setValueAtTime(0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.18);
	}

	/** Direct impact explosion crunch */
	public playHit() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		// Filtered noise explosion
		const bufferSize = ctx.sampleRate * 0.25;
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(800, ctx.currentTime);
		filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0.3, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

		noise.connect(filter);
		filter.connect(gain);
		gain.connect(ctx.destination);
		noise.start();
	}

	/** Shield barrier reflection */
	public playShield() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(900, ctx.currentTime);
		osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.1);
		osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.2);

		gain.gain.setValueAtTime(0.2, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.22);
	}

	/** Sonar radar ping for miss */
	public playMiss() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.setValueAtTime(320, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.15);

		gain.gain.setValueAtTime(0.08, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.15);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.15);
	}

	/** Two-tone alert siren for destroyed hardware */
	public playAlarm() {
		if (this.muted) return;
		const ctx = this.getContext();
		if (!ctx) return;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'square';
		osc.frequency.setValueAtTime(440, ctx.currentTime);
		osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
		osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
		osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);

		gain.gain.setValueAtTime(0.15, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start();
		osc.stop(ctx.currentTime + 0.4);
	}
}

export const sounds = new SoundEngine();
