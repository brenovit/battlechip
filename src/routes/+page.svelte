<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores/game';
	import Lobby from '$lib/components/phases/Lobby.svelte';
	import PlacementPhase from '$lib/components/phases/PlacementPhase.svelte';
	import BattlePhase from '$lib/components/phases/BattlePhase.svelte';
	import GameOver from '$lib/components/phases/GameOver.svelte';
	import { createEmptyGrid } from '$lib/utils/grid';
	import type { Coordinate, Grid as GridType } from '$lib/types/game';

	let playerName = '';
	let gameId = '';
	let myGrid: GridType = createEmptyGrid();
	let opponentGrid: GridType = createEmptyGrid();
	let message = '';
	let score = 0;
	let isPlayerReady = false;
	let isOpponentReady = false;

	// Random name generator data
	const adjectives = ['Cyber', 'Shadow', 'Ghost', 'Quantum', 'Digital', 'Binary', 'Neon', 'Apex', 'Void', 'Echo', 'Prism', 'Nexus', 'Dark', 'Storm', 'Iron', 'Steel', 'Chrome', 'Hyper', 'Ultra', 'Mega'];
	const nouns = ['Hacker', 'Operator', 'Agent', 'Runner', 'Phantom', 'Warrior', 'Knight', 'Sentinel', 'Reaper', 'Hunter', 'Ninja', 'Samurai', 'Sniper', 'Blade', 'Viper', 'Wolf', 'Raven', 'Phoenix', 'Dragon', 'Tiger'];

	$: phase = $gameStore.phase;
	$: isMyTurn = $gameStore.isMyTurn;
	$: opponentName = $gameStore.opponentName;
	$: currentGameId = $gameStore.gameId;
	
	// Debug logging for phase changes
	$: if (phase) {
		console.log('[PAGE] Phase changed to:', phase);
	}

	onMount(() => {
		console.log('[PAGE] onMount() called - CLIENT-SIDE JAVASCRIPT IS RUNNING');
		gameStore.connect();
		
		// Listen for opponent attacks on our grid
		const socket = gameStore.getSocket();
		if (socket) {
			socket.on('opponent-attacked', (coordinate: Coordinate, wasHit: boolean) => {
				if (wasHit) {
					myGrid.cells[coordinate.row][coordinate.col].status = 'hit';
					// Check if resource is destroyed
					const resource = myGrid.resources.find(r => 
						r.coordinates.some(c => c.row === coordinate.row && c.col === coordinate.col)
					);
					if (resource) {
						const allHit = resource.coordinates.every(coord => 
							myGrid.cells[coord.row][coord.col].status === 'hit' ||
							myGrid.cells[coord.row][coord.col].status === 'destroyed'
						);
						if (allHit) {
							// Mark all cells as destroyed
							resource.coordinates.forEach(coord => {
								myGrid.cells[coord.row][coord.col].status = 'destroyed';
							});
						}
					}
				} else {
					myGrid.cells[coordinate.row][coordinate.col].status = 'miss';
				}
				myGrid = myGrid;
			});

			socket.on('opponent-ready', () => {
				isOpponentReady = true;
				message = '[OPPONENT READY] - [WAITING FOR BATTLE TO START...]';
			});
		}
	});

	function generateRandomName() {
		const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
		const noun = nouns[Math.floor(Math.random() * nouns.length)];
		const num = Math.floor(Math.random() * 99) + 1;
		playerName = `${adj}${noun}${num}`;
	}

	function copyNetworkId() {
		if (currentGameId) {
			navigator.clipboard.writeText(currentGameId).catch(() => {
				// Fallback for browsers that don't support clipboard API
				const textArea = document.createElement('textarea');
				textArea.value = currentGameId;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
				alert('Network ID copied to clipboard!');
			});
		}
	}

	function createGame() {
		if (!playerName.trim()) {
			alert('Please enter your name');
			return;
		}
		gameStore.createGame(playerName);
		message = '[INITIALIZING NETWORK...]';
	}

	function joinGame() {
		console.log('[PAGE] joinGame() called - playerName:', playerName, 'gameId:', gameId);
		if (!playerName.trim() || !gameId.trim()) {
			alert('Please enter your name and game ID');
			return;
		}
		console.log('[PAGE] Calling gameStore.joinGame()');
		gameStore.joinGame(gameId.toUpperCase(), playerName);
		console.log('[PAGE] gameStore.joinGame() returned');
	}

	function handleResourcesPlaced() {
		const socket = gameStore.getSocket();
		if (socket && $gameStore.gameId && $gameStore.playerId) {
			// Send resource placements to server
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

			console.log('[CLIENT] Emitting place-resources event', {
				gameId: $gameStore.gameId,
				playerId: $gameStore.playerId,
				resourceCount: resourcePlacements.length
			});
			socket.emit('place-resources', $gameStore.gameId, $gameStore.playerId, resourcePlacements);
			message = '[RESOURCES DEPLOYED] - [CONFIRM WHEN READY]';
			
			// Trigger Svelte reactivity by reassigning the grid
			myGrid = myGrid;
		}
	}

	function confirmReady() {
		const socket = gameStore.getSocket();
		console.log('[CLIENT] confirmReady() called');
		console.log('[CLIENT] Current phase:', phase);
		console.log('[CLIENT] isPlayerReady:', isPlayerReady, 'isOpponentReady:', isOpponentReady);
		
		if (socket && $gameStore.gameId && $gameStore.playerId) {
			console.log('[CLIENT] Emitting player-ready event', {
				gameId: $gameStore.gameId,
				playerId: $gameStore.playerId
			});
			socket.emit('player-ready', $gameStore.gameId, $gameStore.playerId);
			isPlayerReady = true;
			if (isOpponentReady) {
				message = '[BOTH PLAYERS READY] - [INITIATING BATTLE...]';
				console.log('[CLIENT] Both players ready, expecting battle-started event');
			} else {
				message = '[YOU ARE READY] - [WAITING FOR OPPONENT...]';
				console.log('[CLIENT] Waiting for opponent to ready');
			}
		} else {
			console.error('[CLIENT] Cannot emit player-ready - missing socket, gameId, or playerId', {
				hasSocket: !!socket,
				gameId: $gameStore.gameId,
				playerId: $gameStore.playerId
			});
		}
	}

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
		<Lobby 
			bind:playerName 
			bind:gameId 
			{currentGameId}
			{message}
			onCreateGame={createGame}
			onJoinGame={joinGame}
			onGenerateRandomName={generateRandomName}
			onCopyNetworkId={copyNetworkId}
		/>
	{:else if phase === 'placement'}
		<PlacementPhase 
			grid={myGrid}
			{opponentName}
			{isPlayerReady}
			{isOpponentReady}
			{message}
			onResourcesPlaced={handleResourcesPlaced}
			onConfirmReady={confirmReady}
		/>
	{:else if phase === 'battle'}
		<BattlePhase 
			{myGrid}
			{opponentGrid}
			{opponentName}
			{isMyTurn}
			{score}
			{message}
			onAttack={handleAttack}
		/>
	{:else if phase === 'game-over'}
		<GameOver 
			{score}
			onRestart={() => window.location.reload()}
		/>
	{/if}
</div>

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
