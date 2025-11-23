<script lang="ts">
	import { gameStore } from '$lib/stores/game';
	import Grid from '$lib/components/Grid.svelte';
	import type { Grid as GridType, Coordinate } from '$lib/types/game';

	export let myGrid: GridType;
	export let opponentGrid: GridType;
	export let score: number;

	let message = '';

	$: opponentName = $gameStore.opponentName;
	$: isMyTurn = $gameStore.isMyTurn;

	function handleAttack(coord: Coordinate) {
		if (!isMyTurn) {
			message = '[ERROR] - Not your turn';
			return;
		}

		gameStore.attack(coord, (result) => {
			message = result.message;
			score += result.points;

			if (result.status !== 'miss') {
				opponentGrid.cells[coord.row][coord.col].status = result.status;
				if (result.resourceType) {
					opponentGrid.cells[coord.row][coord.col].resourceType = result.resourceType;
				}
			} else {
				opponentGrid.cells[coord.row][coord.col].status = 'miss';
			}
			opponentGrid = opponentGrid;
		});
	}
</script>

<div class="battle-phase">
	<div class="battle-header">
		<div class="status-panel">
			<h3>[YOUR NETWORK]</h3>
			<p>Score: {score}</p>
		</div>
		<div class="turn-indicator" class:active={isMyTurn}>
			{isMyTurn ? '[YOUR TURN]' : '[OPPONENT TURN]'}
		</div>
		<div class="status-panel">
			<h3>[ENEMY NETWORK]</h3>
			<p>Operator: {opponentName || 'Unknown'}</p>
		</div>
	</div>

	<div class="grids-container">
		<div class="grid-wrapper">
			<h4>[DEFENSIVE GRID]</h4>
			<Grid isOwnGrid={true} cells={myGrid.cells} />
		</div>

		<div class="grid-wrapper">
			<h4>[ATTACK GRID]</h4>
			<Grid cells={opponentGrid.cells} onCellClick={handleAttack} />
		</div>
	</div>

	{#if message}
		<div class="battle-message">{message}</div>
	{/if}
</div>

<style>
	.battle-phase {
		padding: 2rem;
		max-width: 1600px;
		margin: 0 auto;
	}

	.battle-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
	}

	.status-panel {
		flex: 1;
		text-align: center;
		color: #0f0;
	}

	.status-panel h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
	}

	.status-panel p {
		margin: 0;
		font-size: 1rem;
	}

	.turn-indicator {
		flex: 1;
		text-align: center;
		padding: 1rem;
		border: 2px solid #0a0;
		color: #0a0;
		font-size: 1.5rem;
		font-weight: bold;
	}

	.turn-indicator.active {
		border-color: #0f0;
		color: #0f0;
		background: #002200;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
		animation: glow 1.5s ease-in-out infinite;
	}

	@keyframes glow {
		0%, 100% {
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 25px rgba(0, 255, 0, 0.8);
		}
	}

	.grids-container {
		display: flex;
		gap: 2rem;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.grid-wrapper {
		flex: 1;
		max-width: 600px;
	}

	.grid-wrapper h4 {
		color: #0f0;
		text-align: center;
		margin-bottom: 1rem;
		font-size: 1.3rem;
	}

	.battle-message {
		margin-top: 2rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		text-align: center;
		font-size: 1.2rem;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
	}
</style>
