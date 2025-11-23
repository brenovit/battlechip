<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gameStore } from '$lib/stores/game';
	import { messageStore } from '$lib/stores/message';
	import Grid from '$lib/components/Grid.svelte';
	import type { Grid as GridType, Coordinate } from '$lib/types/game';

	export let myGrid: GridType;
	export let opponentGrid: GridType;
	export let score: number;
	export let damageCaused: number = 0;
	export let damageTaken: number = 0;

	$: opponentName = $gameStore.opponentName;
	$: isMyTurn = $gameStore.isMyTurn;

	onMount(() => {
		const socket = gameStore.getSocket();
		if (socket) {
			socket.on('opponent-attacked', handleOpponentAttack);
		}
	});

	onDestroy(() => {
		const socket = gameStore.getSocket();
		if (socket) {
			socket.off('opponent-attacked', handleOpponentAttack);
		}
	});

	function handleOpponentAttack(coordinate: Coordinate, wasHit: boolean) {
		if (wasHit) {
			myGrid.cells[coordinate.row][coordinate.col].status = 'hit';
			damageTaken += 1;
			
			const resource = myGrid.resources.find(r => 
				r.coordinates.some(c => c.row === coordinate.row && c.col === coordinate.col)
			);
			if (resource) {
				const allHit = resource.coordinates.every(coord => 
					myGrid.cells[coord.row][coord.col].status === 'hit' ||
					myGrid.cells[coord.row][coord.col].status === 'destroyed'
				);
				if (allHit) {
					resource.coordinates.forEach(coord => {
						myGrid.cells[coord.row][coord.col].status = 'destroyed';
					});
				}
			}
		} else {
			myGrid.cells[coordinate.row][coordinate.col].status = 'miss';
		}
		myGrid = myGrid;
	}

	function handleAttack(coord: Coordinate) {
		if (!isMyTurn) {
			messageStore.show('[ERROR] - Not your turn', 'error');
			return;
		}

		gameStore.attack(coord, (result) => {
			// Check if already targeted - if so, don't update the grid
			if (result.message === '[ALREADY TARGETED]') {
				messageStore.show(result.message, 'warning');
				return;
			}

			const msgType = result.status === 'miss' ? 'warning' : result.status === 'destroyed' ? 'success' : 'info';
			messageStore.show(result.message, msgType);
			score += result.points;
			
			// Track damage caused (hits and destroyed count as damage)
			if (result.status === 'hit' || result.status === 'destroyed') {
				damageCaused += 1;
			}

			if (result.status !== 'miss') {
				// If resource destroyed, update all cells of that resource
				if (result.status === 'destroyed' && result.destroyedCoordinates) {
					for (const destroyedCoord of result.destroyedCoordinates) {
						opponentGrid.cells[destroyedCoord.row][destroyedCoord.col].status = 'destroyed';
						if (result.resourceType) {
							opponentGrid.cells[destroyedCoord.row][destroyedCoord.col].resourceType = result.resourceType;
						}
					}
				} else {
					opponentGrid.cells[coord.row][coord.col].status = result.status;
					if (result.resourceType) {
						opponentGrid.cells[coord.row][coord.col].resourceType = result.resourceType;
					}
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
</div>

<style>
	.battle-phase {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		max-width: 1600px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	@media (min-width: 768px) {
		.battle-phase {
			padding: 1rem;
		}
	}

	.battle-header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #001100;
		border: 2px solid #0f0;
		width: 100%;
		box-sizing: border-box;
	}

	@media (min-width: 768px) {
		.battle-header {
			gap: 1rem;
			margin-bottom: 1.5rem;
			padding: 1rem;
		}
	}

	@media (min-width: 768px) {
		.battle-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
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
		flex-direction: column;
		gap: 2rem;
		justify-content: center;
		margin-bottom: 2rem;
		width: 100%;
	}

	@media (min-width: 1024px) {
		.grids-container {
			flex-direction: row;
		}
	}

	.grid-wrapper {
		flex: 1;
		max-width: 600px;
		width: 100%;
		box-sizing: border-box;
	}

	.grid-wrapper h4 {
		color: #0f0;
		text-align: center;
		margin-bottom: 1rem;
		font-size: 1.3rem;
	}
</style>
