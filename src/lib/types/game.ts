/** Client-facing type re-exports. The single source of truth is `shared/`. */
export * from '$shared/types';
export type { PublicCell, PublicBoard, OwnBoard, OwnItem, VisibleState, Viewer } from '$shared/engine/view';
export type { PublicCellState } from '$shared/engine/state';
export type { GameEvent, StampedEvent } from '$shared/events';
export type { RoomInfo, SessionInfo, UpdatePayload } from '$shared/protocol';
export { ITEMS, ITEM_IDS } from '$shared/items';

import type { ItemId } from '$shared/types';
import type { PublicCellState } from '$shared/engine/state';

/** Generic cell model rendered by Grid.svelte. */
export interface GridCell {
	state: PublicCellState;
	/** Item occupying the cell, when known to this viewer (own board, or destroyed item). */
	item?: ItemId | null;
	revealed?: boolean;
	/** Extra CSS class hook for overlays (placement preview etc.). */
	highlight?: 'valid' | 'invalid' | null;
}
