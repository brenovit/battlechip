/**
 * GameEvent: the complete discriminated union of everything that can happen in a game.
 *
 * Events are produced by the pure engine (shot/turn/powerup events) and by the server room
 * (timer, presence, emotes, rematch...). The server stores the FULL event stream in the move log
 * and sends each recipient only the events it may see (see `eventVisibleTo`).
 *
 * RULE: an event payload must never contain hidden board information (positions of
 * un-exposed hardware) unless its audience is restricted accordingly.
 *
 * Agents may ADD new event types. When you do, TypeScript will force you to classify the new
 * type in EVENT_AUDIENCE (deny-by-default design).
 */
import type { Coord, EmoteId, ItemId, Phase, Placement, Slot } from './types.js';
import type { GameOverReason, PlayerStats } from './engine/state.js';

/** Where a shot came from. */
export type ShotSource = 'normal' | 'timeout' | 'extra' | 'botnet' | 'ability';

export interface FairnessReveal {
	/** Revealed placements, salts and commitments for both players (only at game over). */
	placements: [Placement[], Placement[]];
	salts: [string, string];
	commitments: [string, string];
}

export type GameEvent =
	// ---- lifecycle -------------------------------------------------------------------------
	| { type: 'phase_changed'; phase: Phase }
	| { type: 'player_joined'; slot: Slot; name: string; isBot: boolean }
	| { type: 'player_ready'; slot: Slot; commitment?: string }
	| { type: 'battle_started'; firstTurn: Slot }
	| { type: 'turn_changed'; slot: Slot; turnNumber: number }
	/** Turn timer started; `deadline` is an epoch-ms timestamp (server clock). */
	| { type: 'timer'; slot: Slot; deadline: number; durationMs: number }
	/** The player let the timer run out; a random shot follows (source 'timeout'). */
	| { type: 'turn_timeout'; slot: Slot }
	| {
			type: 'game_over';
			winner: Slot;
			reason: GameOverReason;
			stats: [PlayerStats, PlayerStats];
			scores: [number, number];
	  }
	// ---- shots -----------------------------------------------------------------------------
	| { type: 'shot_fired'; actor: Slot; target: Coord; shotId: number; source: ShotSource }
	| { type: 'hit'; actor: Slot; target: Coord; shotId: number }
	| { type: 'miss'; actor: Slot; target: Coord; shotId: number }
	/** Shot landed on a cell that needs more hits to expose (Firewall passive). */
	| { type: 'shielded'; actor: Slot; target: Coord; shotId: number; hitsRemaining: number }
	/** A redirected shot landed on an already-resolved cell: no effect. */
	| { type: 'shot_wasted'; actor: Slot; target: Coord; shotId: number }
	| { type: 'item_destroyed'; actor: Slot; owner: Slot; item: ItemId; cells: Coord[] }
	| { type: 'cell_revealed'; actor: Slot; owner: Slot; cell: Coord; reason: string }
	| { type: 'score_changed'; slot: Slot; score: number; delta: number; reason: string }
	// ---- powerups (section 4) ---------------------------------------------------------------
	/** Router passive: incoming shot redirected to an adjacent cell. */
	| { type: 'deflect'; actor: Slot; owner: Slot; from: Coord; to: Coord; shotId: number }
	/** Router destroyed: owner's shot landed one cell off. */
	| { type: 'latency_offset'; actor: Slot; from: Coord; to: Coord; shotId: number }
	/** Backup passive: a damaged cell was restored. */
	| { type: 'repair'; owner: Slot; cell: Coord }
	/** Database destroyed: attacker learns the remaining hardware count of a row/column. */
	| { type: 'data_leak'; actor: Slot; owner: Slot; axis: 'row' | 'col'; index: number; count: number }
	/** Server destroyed: attacker gets an immediate extra shot. */
	| { type: 'overload_extra_shot'; actor: Slot }
	/** IoT destroyed: attacker's next shot also reveals one adjacent cell. */
	| { type: 'hijack_reveal'; actor: Slot; owner: Slot; cell: Coord; hasHardware: boolean }
	| { type: 'ability_used'; actor: Slot; ability: string; target?: Coord }
	/** Server passive ability: hardware count inside a 3x3 area. */
	| { type: 'ping_result'; actor: Slot; center: Coord; count: number }
	/** IoT passive ability: 3 random shots in one turn (each also emits shot_fired/hit/miss). */
	| { type: 'botnet_spray'; actor: Slot; targets: Coord[] }
	// ---- presence / social (room level) -----------------------------------------------------
	| { type: 'player_left'; slot: Slot; graceDeadline: number }
	| { type: 'player_rejoined'; slot: Slot }
	| { type: 'emote'; slot: Slot; emote: EmoteId }
	| { type: 'observer_count'; count: number }
	| { type: 'rematch_requested'; slot: Slot }
	| { type: 'rematch_started' }
	/** Fairness proof reveal at the end of the game. */
	| { type: 'fairness_reveal'; reveal: FairnessReveal };

export type GameEventType = GameEvent['type'];
export type EventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;

/** Event as transported / logged: stamped by the room. */
export type StampedEvent = GameEvent & {
	/** Monotonic event id within the room. */
	eid: number;
	/** Engine turnNumber when the event was produced. */
	turn: number;
	/** Server epoch ms. */
	ts: number;
};

/**
 * Audience classes:
 * - public:          both players and observers
 * - actor:           only the player in `event.actor`
 * - actor+observers: the acting player and observers (not the opponent)
 * - players:         both players, not observers
 */
export type Audience = 'public' | 'actor' | 'actor+observers' | 'players';

export const EVENT_AUDIENCE: { [K in GameEventType]: Audience } = {
	phase_changed: 'public',
	player_joined: 'public',
	player_ready: 'public',
	battle_started: 'public',
	turn_changed: 'public',
	timer: 'public',
	turn_timeout: 'public',
	game_over: 'public',
	shot_fired: 'public',
	hit: 'public',
	miss: 'public',
	shielded: 'public',
	shot_wasted: 'public',
	item_destroyed: 'public',
	cell_revealed: 'public',
	score_changed: 'public',
	deflect: 'public',
	latency_offset: 'public',
	repair: 'public',
	data_leak: 'actor+observers',
	overload_extra_shot: 'public',
	hijack_reveal: 'public',
	ability_used: 'public',
	ping_result: 'actor+observers',
	botnet_spray: 'public',
	player_left: 'public',
	player_rejoined: 'public',
	emote: 'public',
	observer_count: 'public',
	rematch_requested: 'players',
	rematch_started: 'public',
	fairness_reveal: 'public'
};

/** Events delivered to observers immediately (not subject to the observer delay). */
export const OBSERVER_LIVE_EVENTS: ReadonlySet<GameEventType> = new Set<GameEventType>([
	'player_joined',
	'player_left',
	'player_rejoined',
	'emote',
	'observer_count',
	'rematch_started',
	'phase_changed',
	'game_over',
	'fairness_reveal'
]);

export type Recipient = { kind: 'player'; slot: Slot } | { kind: 'observer' };

export function eventActor(e: GameEvent): Slot | undefined {
	return 'actor' in e ? e.actor : undefined;
}

/** Deny-by-default visibility check used by the server before sending any event. */
export function eventVisibleTo(e: GameEvent, r: Recipient): boolean {
	const audience = EVENT_AUDIENCE[e.type];
	if (!audience) return false;
	switch (audience) {
		case 'public':
			return true;
		case 'players':
			return r.kind === 'player';
		case 'actor':
			return r.kind === 'player' && eventActor(e) === r.slot;
		case 'actor+observers':
			return r.kind === 'observer' || eventActor(e) === r.slot;
		default:
			return false;
	}
}
