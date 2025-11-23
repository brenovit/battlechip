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

	$: phase = $gameStore.phase;
	
	$: if (phase) {
		console.log('[PAGE] Phase changed to:', phase);
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
		<BattlePhase bind:myGrid bind:opponentGrid bind:score />
	{:else if phase === 'game-over'}
		<GameOver {score} onRestart={() => window.location.reload()} />
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
		padding: 2rem;
		background: 
			repeating-linear-gradient(
				0deg,
				rgba(0, 255, 0, 0.03) 0px,
				transparent 1px,
				transparent 2px,
				rgba(0, 255, 0, 0.03) 3px
			);
	}

	.header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.title {
		font-size: 4rem;
		margin: 0;
		text-shadow: 0 0 20px rgba(0, 255, 0, 1);
		letter-spacing: 0.5rem;
	}

	.glitch {
		position: relative;
		display: inline-block;
	}

	.subtitle {
		font-size: 1.2rem;
		color: #0a0;
		margin: 0.5rem 0 0 0;
	}
</style>
