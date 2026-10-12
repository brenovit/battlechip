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
					title={item && (showItems || cell.state === 'destroyed') ? item.name : ''}
				>
					{#if cell.state === 'destroyed' && item}
						<span>{item.glyph}</span>
					{:else if cell.state === 'hit'}
						<span>⚡</span>
					{:else if cell.state === 'shielded'}
						<span>🛡</span>
					{:else if cell.state === 'miss'}
						<span>·</span>
					{:else if showItems && item}
						<span>{item.glyph}</span>
					{:else if cell.revealed}
						<span>?</span>
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
		background: #002233;
		border-color: #0af;
	}
	.cell-destroyed {
		background: #222;
		border-color: var(--accent, #666);
	}
	.revealed {
		outline: 1px dashed #ff0;
	}
	.hl-valid {
		background: rgba(0, 255, 0, 0.35);
	}
	.hl-invalid {
		background: rgba(255, 0, 0, 0.35);
	}
</style>
