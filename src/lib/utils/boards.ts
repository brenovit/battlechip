/** Helpers turning VisibleState into Grid.svelte cell models. */
import type { GridCell, Placement, PublicBoard, VisibleState } from '$lib/types/game';
import { placementCells } from '$shared/placement';
import { GRID_SIZE } from '$shared/types';

export function emptyCells(size = GRID_SIZE): GridCell[][] {
	return Array.from({ length: size }, () => Array.from({ length: size }, () => ({ state: 'unknown' as const })));
}

/** A public board (opponent / observer) as grid cells. */
export function publicCells(board: PublicBoard): GridCell[][] {
	return board.cells.map((row) => row.map((c) => ({ state: c.state, item: c.item ?? null, revealed: c.revealed })));
}

/** My own board: layout + incoming shots. */
export function ownCells(view: VisibleState): GridCell[][] {
	if (!view.own || view.viewer.kind !== 'player') return emptyCells(view.gridSize);
	const pub = view.boards[view.viewer.slot];
	return view.own.layout.map((row, r) => row.map((item, c) => ({ state: pub.cells[r][c].state, item, revealed: pub.cells[r][c].revealed })));
}

/** Cells for a list of (local, not yet submitted) placements. */
export function placementGrid(placements: Placement[], size = GRID_SIZE): GridCell[][] {
	const cells = emptyCells(size);
	for (const p of placements) for (const c of placementCells(p)) if (cells[c.row]?.[c.col]) cells[c.row][c.col].item = p.item;
	return cells;
}
