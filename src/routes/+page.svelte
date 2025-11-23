<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores/game';
	import Message from '$lib/components/Message.svelte';
	import Lobby from '$lib/components/phases/Lobby.svelte';
	import PlacementPhase from '$lib/components/phases/PlacementPhase.svelte';
	import BattlePhase from '$lib/components/phases/BattlePhase.svelte';
	import GameOver from '$lib/components/phases/GameOver.svelte';
	import { createEmptyGrid } from '$lib/utils/grid';
	import type { Grid as GridType } from '$lib/types/game';

	let myGrid: GridType = createEmptyGrid();
	let opponentGrid: GridType = createEmptyGrid();
	let score = 0;
	let damageCaused = 0;
	let damageTaken = 0;
	let previousPhase: string = 'lobby';

	$: phase = $gameStore.phase;
	
	$: if (phase) {
		console.log('[PAGE] Phase changed to:', phase);
		
		// Reset grids and stats when returning to placement phase (rematch)
		if (phase === 'placement' && previousPhase === 'game-over') {
			console.log('[PAGE] Rematch detected - resetting grids and stats');
			myGrid = createEmptyGrid();
			opponentGrid = createEmptyGrid();
			score = 0;
			damageCaused = 0;
			damageTaken = 0;
		}
		
		previousPhase = phase;
	}

	onMount(() => {
		console.log('[PAGE] onMount() called');
		gameStore.connect();
	});
</script>

<svelte:head>
	<title>BattleChip - Network Warfare</title>
</svelte:head>

<div class="container">
	<header class="header">
		<h1 class="title">
			<span class="glitch" data-text="BATTLECHIP">BATTLECHIP</span>
		</h1>
		<p class="subtitle">[NETWORK WARFARE SIMULATOR v1.0]</p>
	</header>

	{#if phase === 'lobby'}
		<Lobby />
	{:else if phase === 'placement'}
		<PlacementPhase bind:myGrid />
	{:else if phase === 'battle'}
		<BattlePhase bind:myGrid bind:opponentGrid bind:score bind:damageCaused bind:damageTaken />
	{:else if phase === 'game-over'}
		<GameOver {score} {damageCaused} {damageTaken} playerIndex={$gameStore.playerIndex} winner={$gameStore.winner} onRestart={() => window.location.reload()} />
	{/if}
</div>

<Message />

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #000;
		color: #0f0;
		font-family: 'Courier New', monospace;
		overflow-x: hidden;
	}

	.container {
		min-height: 100vh;
		padding: 1rem;
		background: 
			repeating-linear-gradient(
				0deg,
				rgba(0, 255, 0, 0.03) 0px,
				transparent 1px,
				transparent 2px,
				rgba(0, 255, 0, 0.03) 3px
			);
	}

	@media (min-width: 768px) {
		.container {
			padding: 1.5rem;
		}
	}

	.header {
		text-align: center;
		margin-bottom: 1rem;
	}

	@media (min-width: 768px) {
		.header {
			margin-bottom: 1.5rem;
		}
	}

	.title {
		font-size: 2rem;
		margin: 0;
		text-shadow: 0 0 20px rgba(0, 255, 0, 1);
		letter-spacing: 0.3rem;
	}

	@media (min-width: 768px) {
		.title {
			font-size: 3rem;
			letter-spacing: 0.5rem;
		}
	}

	.glitch {
		position: relative;
		display: inline-block;
	}

	.subtitle {
		font-size: 0.9rem;
		color: #0a0;
		margin: 0.25rem 0 0 0;
	}

	@media (min-width: 768px) {
		.subtitle {
			font-size: 1rem;
		}
	}
</style>
