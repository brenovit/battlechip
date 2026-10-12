/**
 * Bot strategies implementing Section 6 AI Player.
 * - Easy: random placement, random unfired shots.
 * - Medium: checkerboard parity hunt, target line-tracking on hit, ability usage.
 * - Hard: Monte Carlo probability density solver over remaining items, smart ability usage.
 */
import { inBounds, neighbors4, otherSlot, type Coord, type Difficulty, type ItemId, type Placement } from '../../shared/types.js';
import { randomLayout } from '../../shared/placement.js';
import type { Rng } from '../../shared/rng.js';
import type { VisibleState } from '../../shared/engine/view.js';
import { ITEMS } from '../../shared/items.js';

export type BotMove = { type: 'fire'; target: Coord } | { type: 'ability'; ability: string; target?: Coord };

export interface BotStrategy {
	readonly difficulty: Difficulty;
	deploy(rng: Rng, gridSize: number): Placement[];
	chooseMove(view: VisibleState, rng: Rng): BotMove;
}

/** Cells on the opponent board that can still be fired at. */
export function openTargets(view: VisibleState): Coord[] {
	if (view.viewer.kind !== 'player') return [];
	const board = view.boards[otherSlot(view.viewer.slot)];
	const out: Coord[] = [];
	board.cells.forEach((row, r) =>
		row.forEach((c, col) => {
			if (c.state === 'unknown' || c.state === 'shielded') out.push({ row: r, col });
		})
	);
	return out;
}

// -----------------------------------------------------------------------------
// Easy Bot
// -----------------------------------------------------------------------------
export const easyBot: BotStrategy = {
	difficulty: 'easy',
	deploy: (rng, gridSize) => randomLayout(rng, gridSize),
	chooseMove(view, rng) {
		const t = openTargets(view);
		if (t.length === 0) return { type: 'fire', target: { row: 0, col: 0 } };
		return { type: 'fire', target: t[rng.int(t.length)] };
	}
};

// -----------------------------------------------------------------------------
// Medium Bot: Checkerboard parity hunting + line-tracking target mode
// -----------------------------------------------------------------------------
export const mediumBot: BotStrategy = {
	difficulty: 'medium',
	deploy: (rng, gridSize) => randomLayout(rng, gridSize),
	chooseMove(view, rng) {
		if (view.viewer.kind !== 'player') return { type: 'fire', target: { row: 0, col: 0 } };
		const defender = otherSlot(view.viewer.slot);
		const board = view.boards[defender];
		const open = openTargets(view);
		if (open.length === 0) return { type: 'fire', target: { row: 0, col: 0 } };

		// Ability check: Ping when ready & server is alive
		const serverItem = view.own?.items.find((i) => i.id === 'server');
		const pingAb = view.own?.abilities?.['ping'];
		if (serverItem && !serverItem.destroyed && pingAb && pingAb.cooldown === 0) {
			const center: Coord = { row: 4, col: 4 };
			return { type: 'ability', ability: 'ping', target: center };
		}

		// Ability check: Botnet when available, IoT cluster alive & open targets >= 10
		const iotItem = view.own?.items.find((i) => i.id === 'iot-cluster');
		const botnetAb = view.own?.abilities?.['botnet'];
		if (iotItem && !iotItem.destroyed && botnetAb && botnetAb.usesLeft && botnetAb.usesLeft > 0 && open.length >= 10) {
			return { type: 'ability', ability: 'botnet' };
		}

		// Find unsunk hits (cells with state 'hit' that are not part of destroyed items)
		const unsunkHits: Coord[] = [];
		board.cells.forEach((row, r) => {
			row.forEach((c, col) => {
				if (c.state === 'hit') unsunkHits.push({ row: r, col });
			});
		});

		// Target mode: if there are unsunk hits
		if (unsunkHits.length > 0) {
			// If two or more hits exist, try to detect orientation
			if (unsunkHits.length >= 2) {
				const sameRow = unsunkHits.every((h) => h.row === unsunkHits[0].row);
				const sameCol = unsunkHits.every((h) => h.col === unsunkHits[0].col);
				if (sameRow) {
					const r = unsunkHits[0].row;
					const cols = unsunkHits.map((h) => h.col).sort((a, b) => a - b);
					const left: Coord = { row: r, col: cols[0] - 1 };
					const right: Coord = { row: r, col: cols[cols.length - 1] + 1 };
					const lineCandidates = [left, right].filter((c) =>
						inBounds(c, view.gridSize) && (board.cells[c.row][c.col].state === 'unknown' || board.cells[c.row][c.col].state === 'shielded')
					);
					if (lineCandidates.length > 0) {
						return { type: 'fire', target: lineCandidates[rng.int(lineCandidates.length)] };
					}
				} else if (sameCol) {
					const c = unsunkHits[0].col;
					const rows = unsunkHits.map((h) => h.row).sort((a, b) => a - b);
					const up: Coord = { row: rows[0] - 1, col: c };
					const down: Coord = { row: rows[rows.length - 1] + 1, col: c };
					const lineCandidates = [up, down].filter((pt) =>
						inBounds(pt, view.gridSize) && (board.cells[pt.row][pt.col].state === 'unknown' || board.cells[pt.row][pt.col].state === 'shielded')
					);
					if (lineCandidates.length > 0) {
						return { type: 'fire', target: lineCandidates[rng.int(lineCandidates.length)] };
					}
				}
			}

			// Single hit or non-aligned: probe orthogonal neighbors of unsunk hits
			const neighbors: Coord[] = [];
			for (const h of unsunkHits) {
				for (const n of neighbors4(h, view.gridSize)) {
					const s = board.cells[n.row][n.col].state;
					if (s === 'unknown' || s === 'shielded') {
						if (!neighbors.some((x) => x.row === n.row && x.col === n.col)) {
							neighbors.push(n);
						}
					}
				}
			}
			if (neighbors.length > 0) {
				return { type: 'fire', target: neighbors[rng.int(neighbors.length)] };
			}
		}

		// Hunting mode: Checkerboard parity pattern
		const parityTargets = open.filter((c) => (c.row + c.col) % 2 === 0);
		if (parityTargets.length > 0) {
			return { type: 'fire', target: parityTargets[rng.int(parityTargets.length)] };
		}

		return { type: 'fire', target: open[rng.int(open.length)] };
	}
};

// -----------------------------------------------------------------------------
// Hard Bot: Probability density solver
// -----------------------------------------------------------------------------
export const hardBot: BotStrategy = {
	difficulty: 'hard',
	deploy: (rng, gridSize) => randomLayout(rng, gridSize),
	chooseMove(view, rng) {
		if (view.viewer.kind !== 'player') return { type: 'fire', target: { row: 0, col: 0 } };
		const defender = otherSlot(view.viewer.slot);
		const board = view.boards[defender];
		const open = openTargets(view);
		if (open.length === 0) return { type: 'fire', target: { row: 0, col: 0 } };

		// Ability usage: Ping when ready, server alive & high uncertainty
		const serverItem = view.own?.items.find((i) => i.id === 'server');
		const pingAb = view.own?.abilities?.['ping'];
		if (serverItem && !serverItem.destroyed && pingAb && pingAb.cooldown === 0 && open.length > 40) {
			return { type: 'ability', ability: 'ping', target: { row: 4, col: 4 } };
		}

		// Identify remaining enemy items
		const destroyedSet = new Set(board.destroyedItems.map((d) => d.item));
		const remainingSizes: number[] = [];
		for (const [id, item] of Object.entries(ITEMS)) {
			if (!destroyedSet.has(id as ItemId)) {
				remainingSizes.push(item.size);
			}
		}

		// Probability density matrix
		const size = view.gridSize;
		const density = Array.from({ length: size }, () => Array(size).fill(0));

		// For each remaining item size, test all valid placements
		for (const shipLen of remainingSizes) {
			// Horizontal
			for (let r = 0; r < size; r++) {
				for (let c = 0; c <= size - shipLen; c++) {
					let valid = true;
					let hitsContained = 0;
					for (let i = 0; i < shipLen; i++) {
						const st = board.cells[r][c + i].state;
						if (st === 'miss' || st === 'destroyed') {
							valid = false;
							break;
						}
						if (st === 'hit') hitsContained++;
					}
					if (valid) {
						// Heavily weight placements that overlap existing unsunk hits
						const weight = hitsContained > 0 ? 25 * hitsContained : 1;
						for (let i = 0; i < shipLen; i++) {
							const st = board.cells[r][c + i].state;
							if (st === 'unknown' || st === 'shielded') {
								density[r][c + i] += weight;
							}
						}
					}
				}
			}

			// Vertical
			for (let r = 0; r <= size - shipLen; r++) {
				for (let c = 0; c < size; c++) {
					let valid = true;
					let hitsContained = 0;
					for (let i = 0; i < shipLen; i++) {
						const st = board.cells[r + i][c].state;
						if (st === 'miss' || st === 'destroyed') {
							valid = false;
							break;
						}
						if (st === 'hit') hitsContained++;
					}
					if (valid) {
						const weight = hitsContained > 0 ? 25 * hitsContained : 1;
						for (let i = 0; i < shipLen; i++) {
							const st = board.cells[r + i][c].state;
							if (st === 'unknown' || st === 'shielded') {
								density[r + i][c] += weight;
							}
						}
					}
				}
			}
		}

		// Find highest density targetable cell
		let maxVal = -1;
		let bestCandidates: Coord[] = [];
		for (const pt of open) {
			const val = density[pt.row][pt.col];
			if (val > maxVal) {
				maxVal = val;
				bestCandidates = [pt];
			} else if (val === maxVal) {
				bestCandidates.push(pt);
			}
		}

		if (bestCandidates.length > 0) {
			return { type: 'fire', target: bestCandidates[rng.int(bestCandidates.length)] };
		}

		return { type: 'fire', target: open[rng.int(open.length)] };
	}
};

const STRATEGIES: Record<Difficulty, BotStrategy> = {
	easy: easyBot,
	medium: mediumBot,
	hard: hardBot
};

export function getStrategy(d: Difficulty): BotStrategy {
	return STRATEGIES[d] ?? easyBot;
}
