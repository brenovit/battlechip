/** Server tunables (override via env). */
const num = (name: string, def: number) => {
	const v = Number(process.env[name]);
	return Number.isFinite(v) && v > 0 ? v : def;
};

export const CONFIG = {
	port: num('PORT', 50680),
	turnMs: num('TURN_MS', 30_000),
	placementMs: num('PLACEMENT_MS', 180_000),
	/** Grace period after a player disconnects before they forfeit. */
	disconnectGraceMs: num('DISCONNECT_GRACE_MS', 60_000),
	/** Consecutive turn timeouts before a player forfeits for idling. */
	maxConsecutiveTimeouts: num('MAX_TIMEOUTS', 3),
	/** Lobby rooms without an opponent expire after this. */
	lobbyTtlMs: num('LOBBY_TTL_MS', 30 * 60_000),
	/** Finished rooms are cleaned up after this. */
	finishedTtlMs: num('FINISHED_TTL_MS', 10 * 60_000),
	observerDelayTurns: num('OBSERVER_DELAY_TURNS', 2),
	botMinDelayMs: num('BOT_MIN_DELAY_MS', 600),
	botMaxDelayMs: num('BOT_MAX_DELAY_MS', 1500),
	maxMessageBytes: 16 * 1024,
	/** Per-connection message rate limit (token bucket). */
	msgBurst: 30,
	msgPerSec: 10,
	/** Join/observe/resume attempts per IP per minute. */
	joinPerMinute: 20,
	/** Comma-separated allowed origins; empty = same-origin (+ localhost in dev). */
	allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean),
	emoteCooldownMs: 1500
};
