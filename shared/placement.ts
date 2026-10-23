/**
 * Placement geometry + validation. Used by the server (authoritative) and by the client
 * (local preview / ghost validity). Never trust the client's result; the server re-validates.
 */
import { GRID_SIZE, inBounds, type Coord, type ItemId, type Orientation, type Placement } from './types.js';
import { ITEMS, ITEM_IDS, isItemId } from './items.js';
import type { Rng } from './rng.js';

export function placementCells(p: { item: ItemId; row: number; col: number; orientation: Orientation }): Coord[] {
	const size = ITEMS[p.item].size;
	const cells: Coord[] = [];
	for (let i = 0; i < size; i++) {
		cells.push(p.orientation === 'horizontal' ? { row: p.row, col: p.col + i } : { row: p.row + i, col: p.col });
	}
	return cells;
}

export type PlacementErrorCode =
	| 'not-array'
	| 'bad-item'
	| 'bad-coords'
	| 'bad-orientation'
	| 'out-of-bounds'
	| 'overlap'
	| 'duplicate-item'
	| 'missing-item';

export interface PlacementValidation {
	ok: boolean;
	errors: { code: PlacementErrorCode; item?: string; message: string }[];
}

/**
 * Validate a single placement against already-placed ones (for interactive placement UIs).
 * Does not check inventory completeness.
 */
export function canPlace(p: Placement, existing: readonly Placement[], size: number = GRID_SIZE): boolean {
	if (!isItemId(p.item)) return false;
	if (p.orientation !== 'horizontal' && p.orientation !== 'vertical') return false;
	const occupied = new Set<string>();
	for (const e of existing) {
		if (e.item === p.item) continue; // re-placing the same item
		for (const c of placementCells(e)) occupied.add(`${c.row},${c.col}`);
	}
	return placementCells(p).every((c) => inBounds(c, size) && !occupied.has(`${c.row},${c.col}`));
}

/**
 * Full authoritative validation: integer coords, valid orientation, in bounds, no overlap,
 * exact inventory (each item exactly once, nothing else).
 */
export function validatePlacements(input: unknown, size: number = GRID_SIZE): PlacementValidation {
	const errors: PlacementValidation['errors'] = [];
	if (!Array.isArray(input)) {
		return { ok: false, errors: [{ code: 'not-array', message: 'Placements must be an array' }] };
	}
	const seen = new Set<string>();
	const occupied = new Map<string, string>();
	for (const raw of input as unknown[]) {
		const p = raw as Partial<Placement> | null;
		if (!p || typeof p !== 'object' || !isItemId(p.item)) {
			errors.push({ code: 'bad-item', message: 'Unknown item' });
			continue;
		}
		if (seen.has(p.item)) {
			errors.push({ code: 'duplicate-item', item: p.item, message: `${p.item} placed twice` });
			continue;
		}
		seen.add(p.item);
		if (!Number.isInteger(p.row) || !Number.isInteger(p.col)) {
			errors.push({ code: 'bad-coords', item: p.item, message: 'Coordinates must be integers' });
			continue;
		}
		if (p.orientation !== 'horizontal' && p.orientation !== 'vertical') {
			errors.push({ code: 'bad-orientation', item: p.item, message: 'Invalid orientation' });
			continue;
		}
		const cells = placementCells(p as Placement);
		if (!cells.every((c) => inBounds(c, size))) {
			errors.push({ code: 'out-of-bounds', item: p.item, message: `${p.item} is out of bounds` });
			continue;
		}
		for (const c of cells) {
			const key = `${c.row},${c.col}`;
			const other = occupied.get(key);
			if (other) {
				errors.push({ code: 'overlap', item: p.item, message: `${p.item} overlaps ${other}` });
				break;
			}
			occupied.set(key, p.item);
		}
	}
	for (const id of ITEM_IDS) {
		if (!seen.has(id)) errors.push({ code: 'missing-item', item: id, message: `${id} not placed` });
	}
	return { ok: errors.length === 0, errors };
}

/** Normalise a validated placement list (canonical order, only known fields). */
export function normalizePlacements(placements: readonly Placement[]): Placement[] {
	return ITEM_IDS.map((id) => {
		const p = placements.find((x) => x.item === id)!;
		return { item: p.item, row: p.row, col: p.col, orientation: p.orientation };
	});
}

/** Uniform random valid layout. MUST be called with a server RNG when used authoritatively. */
export function randomLayout(rng: Rng, size: number = GRID_SIZE): Placement[] {
	for (let attempt = 0; attempt < 1000; attempt++) {
		const placed: Placement[] = [];
		let failed = false;
		for (const id of ITEM_IDS) {
			const options: Placement[] = [];
			for (const orientation of ['horizontal', 'vertical'] as const) {
				for (let row = 0; row < size; row++) {
					for (let col = 0; col < size; col++) {
						const p: Placement = { item: id, row, col, orientation };
						if (canPlace(p, placed, size)) options.push(p);
					}
				}
			}
			if (options.length === 0) {
				failed = true;
				break;
			}
			placed.push(options[rng.int(options.length)]);
		}
		if (!failed) return placed;
	}
	throw new Error('randomLayout: could not generate a layout');
}
