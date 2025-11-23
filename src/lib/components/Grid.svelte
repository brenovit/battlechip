<script lang="ts">
	import type { Coordinate, CellStatus, ResourceType } from '$lib/types/game';
	import { GRID_SIZE } from '$lib/types/game';

	export let isOwnGrid = false;
	export let cells: Array<Array<{ coordinate: Coordinate; status: CellStatus; resourceType?: ResourceType }>> = [];
	export let onCellClick: ((coord: Coordinate) => void) | null = null;

	function getCellClass(status: CellStatus, hasResource: boolean, isOwn: boolean): string {
		if (isOwn) {
			if (status === 'destroyed') return 'cell-destroyed';
			if (status === 'hit') return 'cell-hit';
			if (hasResource) return 'cell-resource';
		} else {
			if (status === 'destroyed') return 'cell-destroyed';
			if (status === 'hit') return 'cell-hit';
			if (status === 'miss') return 'cell-miss';
		}
		return 'cell-empty';
	}

	function handleCellClick(coord: Coordinate) {
		if (onCellClick) {
			onCellClick(coord);
		}
	}
</script>

<div class="grid-container">
	<div class="grid-header">
		<div class="col-label"></div>
		{#each Array(GRID_SIZE) as _, col}
			<div class="col-label">{col}</div>
		{/each}
	</div>
	<div class="grid">
		{#each cells as row, rowIdx}
			<div class="grid-row">
				<div class="row-label">{rowIdx}</div>
				{#each row as cell}
					<button
						class="cell {getCellClass(cell.status, !!cell.resourceType, isOwnGrid)}"
						on:click={() => handleCellClick(cell.coordinate)}
						disabled={isOwnGrid || !onCellClick}
					>
						{#if cell.status === 'hit'}
							<span class="hit-marker">⚡</span>
						{:else if cell.status === 'destroyed'}
							<span class="destroyed-marker">⚡</span>
						{:else if cell.status === 'miss'}
							<span class="miss-marker">·</span>
						{:else if isOwnGrid && cell.resourceType}
							<span class="resource-marker">█</span>
						{/if}
					</button>
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	.grid-container {
		display: inline-block;
		font-family: 'Courier New', monospace;
		background: #000;
		padding: 1rem;
		border: 2px solid #0f0;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
	}

	.grid-header {
		display: flex;
		margin-bottom: 0.25rem;
	}

	.col-label,
	.row-label {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #0f0;
		font-weight: bold;
		text-shadow: 0 0 5px rgba(0, 255, 0, 0.8);
	}

	.grid {
		display: flex;
		flex-direction: column;
	}

	.grid-row {
		display: flex;
	}

	.cell {
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid #0f0;
		background: #001100;
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		position: relative;
		color: #0f0;
	}

	.cell:not(:disabled):hover {
		background: #003300;
		border-color: #00ff00;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		transform: scale(1.05);
	}

	.cell:disabled {
		cursor: not-allowed;
	}

	.cell-empty {
		background: #001100;
	}

	.cell-resource {
		background: #002200;
		border-color: #00aa00;
	}

	.cell-miss {
		background: #110011;
		border-color: #550055;
	}

	.cell-hit {
		background: #220000;
		border-color: #ff0000;
		box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
		animation: hit-pulse 0.5s ease;
	}

	.cell-destroyed {
		background: #333333;
		border-color: #666666;
		box-shadow: 0 0 10px rgba(128, 128, 128, 0.5);
	}

	.hit-marker,
	.destroyed-marker,
	.miss-marker,
	.resource-marker {
		position: absolute;
		animation: fadeIn 0.3s ease;
	}

	.destroyed-marker {
		color: #888888;
	}

	@keyframes hit-pulse {
		0% {
			transform: scale(1);
			box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
		}
		50% {
			transform: scale(1.1);
			box-shadow: 0 0 20px rgba(255, 0, 0, 1);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.5);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
