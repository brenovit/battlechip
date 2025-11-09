<script lang="ts">
	import type { ResourceType, Coordinate, Orientation, Grid } from '$lib/types/game';
	import { RESOURCES, GRID_SIZE } from '$lib/types/game';
	import { canPlaceResource, placeResource } from '$lib/utils/grid';

	export let grid: Grid;
	export let onComplete: () => void;

	let selectedResource: ResourceType | null = null;
	let orientation: Orientation = 'horizontal';
	let placedResources = new Set<ResourceType>();

	const resourceList: ResourceType[] = ['database', 'backup', 'server', 'firewall', 'iot-cluster', 'router'];

	function handleCellClick(coord: Coordinate) {
		if (!selectedResource) return;

		const success = placeResource(grid, selectedResource, coord, orientation);
		if (success) {
			placedResources.add(selectedResource);
			placedResources = placedResources;
			selectedResource = null;
			grid = grid;
		}
	}

	function toggleOrientation() {
		orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal';
	}

	function isResourcePlaced(type: ResourceType): boolean {
		return placedResources.has(type);
	}

	function allPlaced(): boolean {
		return placedResources.size === resourceList.length;
	}

	function getCellPreview(coord: Coordinate): boolean {
		if (!selectedResource) return false;
		const resource = RESOURCES[selectedResource];
		if (!canPlaceResource(grid, coord, resource.size, orientation)) return false;

		for (let i = 0; i < resource.size; i++) {
			const checkCoord = orientation === 'horizontal' 
				? { row: coord.row, col: coord.col + i }
				: { row: coord.row + i, col: coord.col };
			
			if (checkCoord.row === coord.row && checkCoord.col === coord.col) return true;
		}
		return false;
	}
</script>

<div class="placement-container">
	<div class="placement-panel">
		<h2 class="panel-title">[DEPLOY RESOURCES]</h2>
		
		<div class="resources-list">
			{#each resourceList as type}
				{@const resource = RESOURCES[type]}
				<button
					class="resource-btn"
					class:selected={selectedResource === type}
					class:placed={isResourcePlaced(type)}
					on:click={() => selectedResource = type}
					disabled={isResourcePlaced(type)}
				>
					<span class="resource-emoji">{resource.emoji}</span>
					<span class="resource-name">{resource.name}</span>
					<span class="resource-size">({resource.size})</span>
				</button>
			{/each}
		</div>

		{#if selectedResource}
			<div class="controls">
				<button class="control-btn" on:click={toggleOrientation}>
					[ROTATE] {orientation === 'horizontal' ? '→' : '↓'}
				</button>
				<button class="control-btn" on:click={() => selectedResource = null}>
					[CANCEL]
				</button>
			</div>
		{/if}

		{#if allPlaced()}
			<button class="ready-btn" on:click={onComplete}>
				[SYSTEMS ONLINE] - [READY]
			</button>
		{/if}
	</div>

	<div class="grid-container">
		<div class="grid-header">
			<div class="col-label"></div>
			{#each Array(GRID_SIZE) as _, col}
				<div class="col-label">{col}</div>
			{/each}
		</div>
		<div class="grid">
			{#each grid.cells as row, rowIdx}
				<div class="grid-row">
					<div class="row-label">{rowIdx}</div>
					{#each row as cell}
						<button
							class="cell"
							class:has-resource={!!cell.resourceType}
							class:preview={getCellPreview(cell.coordinate)}
							on:click={() => handleCellClick(cell.coordinate)}
						>
							{#if cell.resourceType}
								<span class="resource-marker">█</span>
							{/if}
						</button>
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.placement-container {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		padding: 2rem;
		font-family: 'Courier New', monospace;
	}

	.placement-panel {
		background: #000;
		border: 2px solid #0f0;
		padding: 1.5rem;
		min-width: 300px;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
	}

	.panel-title {
		color: #0f0;
		text-align: center;
		margin: 0 0 1.5rem 0;
		font-size: 1.2rem;
		text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
	}

	.resources-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.resource-btn {
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: inherit;
		font-size: 1rem;
	}

	.resource-btn:not(:disabled):hover {
		background: #003300;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
	}

	.resource-btn.selected {
		background: #003300;
		border-color: #00ff00;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
	}

	.resource-btn.placed {
		opacity: 0.5;
		cursor: not-allowed;
		border-color: #005500;
	}

	.resource-emoji {
		font-size: 1.5rem;
	}

	.resource-name {
		flex: 1;
	}

	.resource-size {
		color: #0a0;
	}

	.controls {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.control-btn {
		flex: 1;
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
		font-family: inherit;
	}

	.control-btn:hover {
		background: #003300;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
	}

	.ready-btn {
		width: 100%;
		background: #002200;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 1rem;
		cursor: pointer;
		font-family: inherit;
		font-size: 1.1rem;
		font-weight: bold;
		animation: pulse 1.5s infinite;
	}

	.ready-btn:hover {
		background: #004400;
		box-shadow: 0 0 20px rgba(0, 255, 0, 1);
	}

	@keyframes pulse {
		0%, 100% {
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 20px rgba(0, 255, 0, 1);
		}
	}

	.grid-container {
		display: inline-block;
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
		color: #0f0;
		position: relative;
	}

	.cell:hover {
		background: #003300;
		border-color: #00ff00;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
	}

	.cell.has-resource {
		background: #002200;
		border-color: #00aa00;
	}

	.cell.preview {
		background: #003300;
		border-color: #00ff00;
		animation: preview-blink 0.5s infinite;
	}

	@keyframes preview-blink {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.resource-marker {
		font-size: 1.2rem;
	}
</style>
