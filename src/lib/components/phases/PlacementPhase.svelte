<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores/game';
	import ResourcePlacement from '$lib/components/ResourcePlacement.svelte';
	import { createEmptyGrid } from '$lib/utils/grid';
	import type { Grid } from '$lib/types/game';

	export let myGrid: Grid;

	let message = '';
	let isPlayerReady = false;
	let isOpponentReady = false;

	$: opponentName = $gameStore.opponentName;

	onMount(() => {
		const socket = gameStore.getSocket();
		if (socket) {
			socket.on('opponent-ready', () => {
				isOpponentReady = true;
				message = '[OPPONENT READY] - [WAITING FOR BATTLE TO START...]';
			});
		}
	});

	function handleResourcesPlaced() {
		const socket = gameStore.getSocket();
		if (socket && $gameStore.gameId && $gameStore.playerId) {
			const resourcePlacements = myGrid.resources.map(resource => {
				const firstCoord = resource.coordinates[0];
				const isHorizontal = resource.coordinates.length > 1 && 
					resource.coordinates[0].row === resource.coordinates[1].row;
				
				return {
					type: resource.type,
					start: firstCoord,
					orientation: isHorizontal ? 'horizontal' : 'vertical'
				};
			});

			console.log('[PLACEMENT] Emitting place-resources event', {
				gameId: $gameStore.gameId,
				playerId: $gameStore.playerId,
				resourceCount: resourcePlacements.length
			});
			socket.emit('place-resources', $gameStore.gameId, $gameStore.playerId, resourcePlacements);
			message = '[RESOURCES DEPLOYED] - [CONFIRM WHEN READY]';
			myGrid = myGrid;
		}
	}

	function confirmReady() {
		const socket = gameStore.getSocket();
		console.log('[PLACEMENT] confirmReady() called');
		console.log('[PLACEMENT] isPlayerReady:', isPlayerReady, 'isOpponentReady:', isOpponentReady);
		
		if (socket && $gameStore.gameId && $gameStore.playerId) {
			console.log('[PLACEMENT] Emitting player-ready event', {
				gameId: $gameStore.gameId,
				playerId: $gameStore.playerId
			});
			socket.emit('player-ready', $gameStore.gameId, $gameStore.playerId);
			isPlayerReady = true;
			if (isOpponentReady) {
				message = '[BOTH PLAYERS READY] - [INITIATING BATTLE...]';
				console.log('[PLACEMENT] Both players ready, expecting battle-started event');
			} else {
				message = '[YOU ARE READY] - [WAITING FOR OPPONENT...]';
				console.log('[PLACEMENT] Waiting for opponent to ready');
			}
		} else {
			console.error('[PLACEMENT] Cannot emit player-ready - missing socket, gameId, or playerId', {
				hasSocket: !!socket,
				gameId: $gameStore.gameId,
				playerId: $gameStore.playerId
			});
		}
	}
</script>

<div class="placement-phase">
	<div class="phase-header">
		<h2>[DEPLOYMENT PHASE]</h2>
		{#if opponentName}
			<p class="opponent-info">[OPPONENT DETECTED: {opponentName}]</p>
		{/if}
		<div class="ready-status">
			<div class="status-indicator" class:ready={isPlayerReady}>
				[YOU: {isPlayerReady ? '✓ READY' : '⧗ DEPLOYING'}]
			</div>
			<div class="status-indicator" class:ready={isOpponentReady}>
				[OPPONENT: {isOpponentReady ? '✓ READY' : '⧗ DEPLOYING'}]
			</div>
		</div>
	</div>
	<ResourcePlacement grid={myGrid} onComplete={handleResourcesPlaced} />
	{#if message}
		<div class="message">{message}</div>
	{/if}
	{#if myGrid.resources.length === 6 && !isPlayerReady}
		<div class="ready-confirmation">
			<button class="confirm-ready-btn" on:click={confirmReady}>
				[CONFIRM READY] - [START BATTLE]
			</button>
			<p class="ready-hint">Click to confirm you are ready to begin the battle</p>
		</div>
	{/if}
</div>

<style>
	.placement-phase {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.phase-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.phase-header h2 {
		color: #0f0;
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.opponent-info {
		color: #0a0;
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}

	.ready-status {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 1rem;
	}

	.status-indicator {
		padding: 0.5rem 1rem;
		border: 2px solid #0a0;
		color: #0a0;
		background: #001100;
	}

	.status-indicator.ready {
		border-color: #0f0;
		color: #0f0;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
	}

	.message {
		margin-top: 1rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		text-align: center;
	}

	.ready-confirmation {
		text-align: center;
		margin-top: 2rem;
		padding: 2rem;
		background: #001100;
		border: 3px solid #0f0;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
	}

	.confirm-ready-btn {
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 1rem 2rem;
		font-family: inherit;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.2s ease;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 25px rgba(0, 255, 0, 0.9);
		}
	}

	.confirm-ready-btn:hover {
		background: #003300;
		box-shadow: 0 0 30px rgba(0, 255, 0, 1);
	}

	.ready-hint {
		color: #0a0;
		margin-top: 1rem;
		font-size: 0.9rem;
	}
</style>
