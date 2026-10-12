/**
 * Data-driven item configuration. Adding a new item = adding an entry here (plus its id to
 * ItemId in shared/types.ts). All gameplay effects live in the hooks of each entry and are
 * resolved on the server by the engine; clients only use the metadata (name, size, glyph...).
 *
 * Implements Section 4 Powerups:
 * - Firewall (3): Adjacent cells need 2 hits to expose; on destroy reveals 1 random enemy hardware cell
 * - Database (5): Crown jewel; on destroy attacker gets Data Leak (row or col remaining count)
 * - Backup (4): Auto-repair first time another item hit; on destroy repair lost & attacker gets +1 score
 * - Server (4): Ping 3x3 active scan (cooldown 4); on destroy Overload grants attacker extra shot
 * - IoT Cluster (3): Botnet spray 3 shots (1 use); on destroy Hijacked reveals adjacent cell on next shot
 * - Router (2): 25% Deflect chance; on destroy Latency grants 50% chance next shot drifts 1 cell
 */
import { neighbors4, otherSlot, type Coord, type ItemId } from './types.js';
import type { AbilityDef, ItemDef } from './engine/hooks.js';

export const ABILITIES = {
	ping: {
		id: 'ping',
		name: 'Ping',
		description: 'Scan a 3x3 area and learn how many hardware cells are inside.',
		glyph: '📶',
		target: 'cell',
		cooldown: 4,
		usesPerGame: null,
		requiresAlive: true,
		endsTurn: true,
		enabled: true,
		execute: (ctx, self, actor, target) => {
			if (!target) return;
			const defender = otherSlot(actor);
			let count = 0;
			for (let dr = -1; dr <= 1; dr++) {
				for (let dc = -1; dc <= 1; dc++) {
					const c: Coord = { row: target.row + dr, col: target.col + dc };
					if (ctx.inBounds(c)) {
						if (ctx.itemAt(defender, c)) count++;
					}
				}
			}
			ctx.emit({ type: 'ping_result', actor, center: { ...target }, count });
		}
	},
	botnet: {
		id: 'botnet',
		name: 'Botnet Spray',
		description: 'Once per game, fire 3 random shots in one turn.',
		glyph: '🕸️',
		target: 'none',
		cooldown: 0,
		usesPerGame: 1,
		requiresAlive: true,
		endsTurn: true,
		enabled: true,
		execute: (ctx, self, actor) => {
			const defender = otherSlot(actor);
			const targetable = ctx.targetableCells(defender);
			if (targetable.length === 0) return;
			const chosen: Coord[] = [];
			const pool = [...targetable];
			for (let i = 0; i < 3 && pool.length > 0; i++) {
				const idx = Math.floor(ctx.rng.next() * pool.length);
				chosen.push(pool.splice(idx, 1)[0]);
			}
			ctx.emit({ type: 'botnet_spray', actor, targets: chosen.map((c) => ({ ...c })) });
			for (const t of chosen) {
				ctx.fireShot(actor, t, 'botnet');
			}
		}
	}
} satisfies Record<string, AbilityDef>;

export const ITEMS: Record<ItemId, ItemDef> = {
	firewall: {
		id: 'firewall',
		name: 'Firewall',
		size: 3,
		glyph: '🛡️',
		accent: '#ff9f1c',
		points: 150,
		description: "The network's main line of defense.",
		passive: { name: 'Hardened Perimeter', description: 'Adjacent cells need 2 hits to expose.' },
		onDestroyedEffect: {
			name: 'Breach',
			description: "Reveals 1 random enemy hardware cell on the attacker's grid."
		},
		getHitsRequired: (ctx, self, cell) => {
			if (self.destroyed) return undefined;
			const isAdjacent = self.cells.some(
				(sc) => Math.abs(sc.row - cell.row) + Math.abs(sc.col - cell.col) === 1
			);
			return isAdjacent ? 2 : undefined;
		},
		onDestroyed: (ctx, self) => {
			const defender = self.owner;
			const attacker = otherSlot(defender);
			const unrevealed: Coord[] = [];
			for (const item of ctx.state.players[defender].items) {
				for (const c of item.cells) {
					if (!ctx.cellAt(defender, c).revealed && ctx.cellAt(defender, c).state !== 'destroyed') {
						unrevealed.push(c);
					}
				}
			}
			if (unrevealed.length > 0) {
				const picked = unrevealed[Math.floor(ctx.rng.next() * unrevealed.length)];
				ctx.revealCell(defender, picked, attacker, 'firewall_breach');
			}
		}
	},
	database: {
		id: 'database',
		name: 'Database',
		size: 5,
		glyph: '🗄️',
		accent: '#ffd400',
		points: 500,
		description: 'The crown jewel. Contains all the critical data.',
		passive: { name: 'Crown Jewel', description: 'The attacker needs it to win a bonus.' },
		onDestroyedEffect: {
			name: 'Data Leak',
			description: 'Attacker learns the remaining hardware count of a row or column.'
		},
		onDestroyed: (ctx, self) => {
			const defender = self.owner;
			const attacker = otherSlot(defender);
			const axis: 'row' | 'col' = ctx.rng.next() < 0.5 ? 'row' : 'col';
			const index = Math.floor(ctx.rng.next() * ctx.state.config.gridSize);
			let count = 0;
			for (let i = 0; i < ctx.state.config.gridSize; i++) {
				const c: Coord = axis === 'row' ? { row: index, col: i } : { row: i, col: index };
				const item = ctx.itemAt(defender, c);
				if (item && !item.destroyed) count++;
			}
			ctx.emit({ type: 'data_leak', actor: attacker, owner: defender, axis, index, count });
		}
	},
	backup: {
		id: 'backup',
		name: 'Backup',
		size: 4,
		glyph: '💾',
		accent: '#4cc9f0',
		points: 300,
		description: 'Offline data storage. A high-value secondary target.',
		passive: {
			name: 'Auto-Repair',
			description: 'The first time another item is hit, one damaged cell is restored (once).'
		},
		onDestroyedEffect: { name: 'Restore Lost', description: 'Owner loses repair; attacker gets +1 score.' },
		onHit: (ctx, self, info) => {
			if (self.destroyed || self.data.repairUsed) return;
			if (info.item.id !== self.id) {
				self.data.repairUsed = true;
				ctx.repairCell(self.owner, info.cell);
			}
		},
		onDestroyed: (ctx, self) => {
			self.data.repairUsed = true;
			const attacker = otherSlot(self.owner);
			ctx.addScore(attacker, 1, 'backup_destroyed_bonus');
		}
	},
	server: {
		id: 'server',
		name: 'Server',
		size: 4,
		glyph: '🖥️',
		accent: '#7bff00',
		points: 250,
		description: 'The main application server. Holds the logic.',
		passive: { name: 'Ping', description: 'Scan a 3x3 area for hardware (cooldown 4 turns).' },
		onDestroyedEffect: { name: 'Overload', description: 'Attacker gets an immediate extra shot.' },
		abilities: [ABILITIES.ping],
		onDestroyed: (ctx, self) => {
			const attacker = otherSlot(self.owner);
			ctx.grantExtraShot(attacker, 1);
			ctx.emit({ type: 'overload_extra_shot', actor: attacker });
		}
	},
	'iot-cluster': {
		id: 'iot-cluster',
		name: 'IoT Cluster',
		size: 3,
		glyph: '📱',
		accent: '#c77dff',
		points: 100,
		description: 'A swarm of "smart" devices, often a weak point.',
		passive: { name: 'Botnet Spray', description: 'Once per game, fire 3 random shots in one turn.' },
		onDestroyedEffect: {
			name: 'Hijacked',
			description: "Attacker's next shot also reveals one adjacent cell."
		},
		abilities: [ABILITIES.botnet],
		onDestroyed: (ctx, self) => {
			const attacker = otherSlot(self.owner);
			ctx.state.players[attacker].effects.hijacked = true;
		},
		onAfterShot: (ctx, self, result, role) => {
			if (role === 'attacker' && ctx.state.players[result.attacker].effects.hijacked) {
				delete ctx.state.players[result.attacker].effects.hijacked;
				const neighbors = neighbors4(result.target, ctx.state.config.gridSize);
				const unrevealed = neighbors.filter((n) => !ctx.cellAt(result.defender, n).revealed);
				if (unrevealed.length > 0) {
					const cell = unrevealed[Math.floor(ctx.rng.next() * unrevealed.length)];
					const hasHardware = !!ctx.itemAt(result.defender, cell);
					ctx.revealCell(result.defender, cell, result.attacker, 'hijack_reveal');
					ctx.emit({ type: 'hijack_reveal', actor: result.attacker, owner: result.defender, cell, hasHardware });
				}
			}
		}
	},
	router: {
		id: 'router',
		name: 'Router',
		size: 2,
		glyph: '📡',
		accent: '#ff4d6d',
		points: 50,
		description: 'The entry point that directs network traffic.',
		passive: { name: 'Deflect', description: '25% chance an incoming shot is redirected to an adjacent cell.' },
		onDestroyedEffect: { name: 'Latency', description: "Owner's next shot has a 50% chance to land one cell off." },
		onBeforeShot: (ctx, self, shot, role) => {
			if (role === 'defender' && !self.destroyed) {
				if (ctx.rng.next() < 0.25) {
					const neighbors = neighbors4(shot.target, ctx.state.config.gridSize);
					if (neighbors.length > 0) {
						const next = neighbors[Math.floor(ctx.rng.next() * neighbors.length)];
						ctx.emit({
							type: 'deflect',
							actor: shot.attacker,
							owner: self.owner,
							from: { ...shot.target },
							to: { ...next },
							shotId: shot.shotId
						});
						shot.target = next;
					}
				}
			} else if (role === 'attacker' && self.data.latencyPending) {
				self.data.latencyPending = false;
				if (ctx.rng.next() < 0.5) {
					const neighbors = neighbors4(shot.target, ctx.state.config.gridSize);
					if (neighbors.length > 0) {
						const next = neighbors[Math.floor(ctx.rng.next() * neighbors.length)];
						ctx.emit({
							type: 'latency_offset',
							actor: shot.attacker,
							from: { ...shot.target },
							to: { ...next },
							shotId: shot.shotId
						});
						shot.target = next;
					}
				}
			}
		},
		onDestroyed: (ctx, self) => {
			self.data.latencyPending = true;
		}
	}
};

/** Canonical inventory order (used for deployment panels, validation, random deploy). */
export const ITEM_IDS: readonly ItemId[] = ['database', 'backup', 'server', 'firewall', 'iot-cluster', 'router'];

export function isItemId(x: unknown): x is ItemId {
	return typeof x === 'string' && Object.prototype.hasOwnProperty.call(ITEMS, x);
}

export function getAbility(id: string): AbilityDef | undefined {
	for (const item of Object.values(ITEMS)) {
		const a = item.abilities?.find((ab) => ab.id === id);
		if (a) return a;
	}
	return undefined;
}

/** Ability -> owning item. */
export function abilityOwner(id: string): ItemId | undefined {
	for (const item of Object.values(ITEMS)) {
		if (item.abilities?.some((ab) => ab.id === id)) return item.id;
	}
	return undefined;
}
