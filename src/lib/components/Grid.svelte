<script lang="ts">
	import type { Coord, GridCell } from '$lib/types/game';
	import { ITEMS } from '$lib/types/game';

	interface Props {
		cells: GridCell[][];
		/** Show item glyphs for cells that carry an item (own board). */
		showItems?: boolean;
		onCellClick?: ((c: Coord) => void) | null;
		onCellHover?: ((c: Coord | null) => void) | null;
		disabled?: boolean;
		label?: string;
	}
	let { cells, showItems = false, onCellClick = null, onCellHover = null, disabled = false, label = '' }: Props = $props();
</script>

<div class="grid-container" class:disabled aria-label={label}>
	<div class="grid-header">
		<div class="col-label"></div>
		{#each cells[0] ?? [] as _, col}
			<div class="col-label">{col}</div>
		{/each}
	</div>
	{#each cells as row, r}
		<div class="grid-row">
			<div class="row-label">{r}</div>
			{#each row as cell, c}
				{@const item = cell.item ? ITEMS[cell.item] : null}
				<button
					class="cell cell-{cell.state}"
					class:has-item={showItems && !!item}
					class:revealed={cell.revealed}
					class:hl-valid={cell.highlight === 'valid'}
					class:hl-invalid={cell.highlight === 'invalid'}
					style={item && (showItems || cell.state === 'destroyed') ? `--accent:${item.accent}` : ''}
					disabled={disabled || !onCellClick}
					onclick={() => onCellClick?.({ row: r, col: c })}
					onpointerenter={() => onCellHover?.({ row: r, col: c })}
					onpointerleave={() => onCellHover?.(null)}
					title={item && (showItems || cell.state === 'destroyed') ? item.name : cell.state === 'shielded' ? 'Shielded: Firewall protection (requires 1 more hit)' : ''}
				>
					{#if cell.state === 'destroyed' && item}
						<span class="icon-destroyed">{item.glyph}</span>
					{:else if cell.state === 'hit'}
						<span class="icon-hit">⚡</span>
					{:else if cell.state === 'shielded'}
						<span class="icon-shielded">◈</span>
					{:else if cell.state === 'miss'}
						<span class="icon-miss">·</span>
					{:else if showItems && item}
						<span>{item.glyph}</span>
					{:else if cell.revealed}
						<span class="icon-revealed">?</span>
					{/if}
				</button>
			{/each}
		</div>
	{/each}
</div>

<style>
	.grid-container {
		display: inline-block;
		font-family: 'Courier New', monospace;
		background: #000;
		padding: 0.75rem;
		border: 2px solid #0f0;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
	}
	.grid-container.disabled {
		opacity: 0.6;
	}
	.grid-header,
	.grid-row {
		display: flex;
	}
	.col-label,
	.row-label {
		width: 2.2rem;
		height: 2.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #0f0;
		font-weight: bold;
	}
	.cell {
		width: 2.2rem;
		height: 2.2rem;
		border: 1px solid #0a0;
		background: #001100;
		color: #0f0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1rem;
		padding: 0;
		cursor: pointer;
	}
	.cell:disabled {
		cursor: default;
	}
	.cell:not(:disabled):hover {
		background: #003300;
	}
	.has-item {
		background: color-mix(in srgb, var(--accent, #0f0) 25%, #001100);
		border-color: var(--accent, #0f0);
	}
	.cell-miss {
		background: #110011;
		border-color: #550055;
	}
	.cell-hit {
		background: #330000;
		border-color: #f00;
	}
	.cell-shielded {
		background: #001a2c;
		border-color: #00b4d8;
		box-shadow: inset 0 0 6px rgba(0, 180, 216, 0.4);
	}
	.icon-shielded {
		color: #00e5ff;
		font-size: 1.1rem;
		text-shadow: 0 0 4px #00e5ff;
	}
	.cell-destroyed {
		background: #1a1a1a;
		border-color: var(--accent, #666);
		box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.8);
	}
	.icon-destroyed {
		filter: drop-shadow(0 0 4px var(--accent, #666));
	}
	.revealed {
		outline: 2px dashed #ffd166;
		outline-offset: -2px;
	}
	.icon-revealed {
		color: #ffd166;
		font-weight: bold;
	}
	.hl-valid {
		background: rgba(0, 255, 0, 0.35);
	}
	.hl-invalid {
		background: rgba(255, 0, 0, 0.35);
	}
</style>
