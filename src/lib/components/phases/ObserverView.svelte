<script lang="ts">
	import { gameStore } from '$lib/stores/game';
	import Grid from '$lib/components/Grid.svelte';
	import type { Grid as GridType } from '$lib/types/game';
	import { createEmptyGrid } from '$lib/utils/grid';

	$: player1State = $gameStore.player1State;
	$: player2State = $gameStore.player2State;
	$: phase = $gameStore.phase;
	$: currentTurn = $gameStore.currentTurn;

	let player1Grid: GridType = createEmptyGrid();
	let player2Grid: GridType = createEmptyGrid();

	$: if (player1State?.grid) {
		player1Grid = player1State.grid;
	}

	$: if (player2State?.grid) {
		player2Grid = player2State.grid;
	}

	$: player1Name = player1State?.name || 'Player 1';
	$: player2Name = player2State?.name || 'Player 2';
	$: player1Score = player1State?.score || 0;
	$: player2Score = player2State?.score || 0;
</script>

<div class="observer-view">
	<div class="observer-header">
		<h2 class="observer-title">[OBSERVER MODE]</h2>
		<p class="observer-subtitle">Spectating the battle - no interference allowed</p>
	</div>

	{#if phase === 'lobby' || phase === 'placement'}
		<div class="waiting-message">
			<p>[WAITING FOR BATTLE TO START...]</p>
			{#if player1State && !player2State}
				<p class="sub-message">Waiting for second player to join...</p>
			{:else if player1State && player2State}
				<p class="sub-message">Players are setting up their networks...</p>
			{/if}
		</div>
	{:else if phase === 'battle' || phase === 'game-over'}
		<div class="battle-status">
			<div class="turn-indicator" class:player1-turn={currentTurn === 0} class:player2-turn={currentTurn === 1}>
				{#if phase === 'battle'}
					{currentTurn === 0 ? `[${player1Name}'S TURN]` : `[${player2Name}'S TURN]`}
				{:else}
					[GAME OVER]
				{/if}
			</div>
		</div>

		<div class="grids-container">
			<div class="grid-wrapper">
				<div class="player-header">
					<h3>[{player1Name}]</h3>
					<p class="score">Score: {player1Score}</p>
				</div>
				<Grid isOwnGrid={true} cells={player1Grid.cells} />
			</div>

			<div class="grid-wrapper">
				<div class="player-header">
					<h3>[{player2Name}]</h3>
					<p class="score">Score: {player2Score}</p>
				</div>
				<Grid isOwnGrid={true} cells={player2Grid.cells} />
			</div>
		</div>
	{/if}
</div>

<style>
	.observer-view {
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
		.observer-view {
			padding: 1rem;
		}
	}

	.observer-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
		width: 100%;
		box-sizing: border-box;
	}

	.observer-title {
		color: #0f0;
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
	}

	@media (min-width: 768px) {
		.observer-title {
			font-size: 2rem;
		}
	}

	.observer-subtitle {
		color: #0a0;
		margin: 0;
		font-size: 0.9rem;
	}

	.waiting-message {
		text-align: center;
		padding: 2rem;
		border: 2px solid #0a0;
		background: #001100;
		margin: 2rem 0;
	}

	.waiting-message p {
		color: #0f0;
		font-size: 1.2rem;
		margin: 0.5rem 0;
	}

	.sub-message {
		color: #0a0 !important;
		font-size: 1rem !important;
	}

	.battle-status {
		width: 100%;
		margin-bottom: 1rem;
	}

	.turn-indicator {
		text-align: center;
		padding: 1rem;
		border: 2px solid #0a0;
		color: #0a0;
		font-size: 1.3rem;
		font-weight: bold;
		background: #001100;
	}

	@media (min-width: 768px) {
		.turn-indicator {
			font-size: 1.5rem;
		}
	}

	.turn-indicator.player1-turn {
		border-color: #0f0;
		color: #0f0;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
		animation: glow 1.5s ease-in-out infinite;
	}

	.turn-indicator.player2-turn {
		border-color: #0ff;
		color: #0ff;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
		animation: glow-cyan 1.5s ease-in-out infinite;
	}

	@keyframes glow {
		0%, 100% {
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 25px rgba(0, 255, 0, 0.8);
		}
	}

	@keyframes glow-cyan {
		0%, 100% {
			box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
		}
		50% {
			box-shadow: 0 0 25px rgba(0, 255, 255, 0.8);
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

	.player-header {
		text-align: center;
		margin-bottom: 1rem;
		padding: 0.75rem;
		background: #001100;
		border: 2px solid #0f0;
	}

	.player-header h3 {
		color: #0f0;
		margin: 0 0 0.5rem 0;
		font-size: 1.3rem;
	}

	.score {
		color: #0a0;
		margin: 0;
		font-size: 1rem;
	}
</style>
