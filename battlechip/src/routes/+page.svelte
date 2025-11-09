<script lang="ts">
	import { onMount } from 'svelte';
	import { gameStore } from '$lib/stores/game';
	import Grid from '$lib/components/Grid.svelte';
	import ResourcePlacement from '$lib/components/ResourcePlacement.svelte';
	import { createEmptyGrid } from '$lib/utils/grid';
	import type { Coordinate, Grid as GridType } from '$lib/types/game';

	let playerName = '';
	let gameId = '';
	let myGrid: GridType = createEmptyGrid();
	let opponentGrid: GridType = createEmptyGrid();
	let message = '';
	let score = 0;

	$: phase = $gameStore.phase;
	$: isMyTurn = $gameStore.isMyTurn;
	$: opponentName = $gameStore.opponentName;
	$: currentGameId = $gameStore.gameId;

	onMount(() => {
		gameStore.connect();
	});

	function createGame() {
		if (!playerName.trim()) {
			alert('Please enter your name');
			return;
		}
		gameStore.createGame(playerName);
		message = '[INITIALIZING NETWORK...]';
	}

	function joinGame() {
		if (!playerName.trim() || !gameId.trim()) {
			alert('Please enter your name and game ID');
			return;
		}
		gameStore.joinGame(gameId.toUpperCase(), playerName);
	}

	function handleResourcesPlaced() {
		const socket = gameStore.getSocket();
		if (socket && $gameStore.gameId && $gameStore.playerId) {
			socket.emit('player-ready', $gameStore.gameId, $gameStore.playerId);
			message = '[RESOURCES DEPLOYED] - [WAITING FOR OPPONENT...]';
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
		<div class="lobby">
			<div class="terminal">
				<div class="terminal-header">[SYSTEM ACCESS]</div>
				<div class="terminal-body">
					<div class="input-group">
						<label for="name">&gt; USERNAME:</label>
						<input
							id="name"
							type="text"
							bind:value={playerName}
							placeholder="Enter your handle..."
							class="terminal-input"
						/>
					</div>

					<div class="button-group">
						<button class="terminal-btn" on:click={createGame}>
							[CREATE NEW NETWORK]
						</button>
					</div>

					<div class="divider">- OR -</div>

					<div class="input-group">
						<label for="gameId">&gt; GAME ID:</label>
						<input
							id="gameId"
							type="text"
							bind:value={gameId}
							placeholder="Enter game code..."
							class="terminal-input"
							style="text-transform: uppercase;"
						/>
					</div>

					<div class="button-group">
						<button class="terminal-btn" on:click={joinGame}>
							[INFILTRATE NETWORK]
						</button>
					</div>

					{#if currentGameId}
						<div class="game-code">
							<p>[NETWORK ID]</p>
							<p class="code">{currentGameId}</p>
							<p class="hint">Share this code with your opponent</p>
						</div>
					{/if}

					{#if message}
						<div class="message">{message}</div>
					{/if}
				</div>
			</div>
		</div>
	{:else if phase === 'placement'}
		<div class="placement-phase">
			<div class="phase-header">
				<h2>[DEPLOYMENT PHASE]</h2>
				{#if opponentName}
					<p class="opponent-info">[OPPONENT DETECTED: {opponentName}]</p>
				{/if}
			</div>
			<ResourcePlacement grid={myGrid} onComplete={handleResourcesPlaced} />
			{#if message}
				<div class="message">{message}</div>
			{/if}
		</div>
	{:else if phase === 'battle'}
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
	{:else if phase === 'game-over'}
		<div class="game-over">
			<h2 class="game-over-title">[NETWORK COMPROMISED]</h2>
			<p class="final-score">Final Score: {score}</p>
			<button class="terminal-btn" on:click={() => window.location.reload()}>
				[DISCONNECT]
			</button>
		</div>
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

	.lobby {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.terminal {
		background: #000;
		border: 3px solid #0f0;
		box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
		min-width: 500px;
		max-width: 600px;
	}

	.terminal-header {
		background: #0f0;
		color: #000;
		padding: 0.5rem 1rem;
		font-weight: bold;
		text-align: center;
	}

	.terminal-body {
		padding: 2rem;
	}

	.input-group {
		margin-bottom: 1.5rem;
	}

	.input-group label {
		display: block;
		margin-bottom: 0.5rem;
		color: #0f0;
	}

	.terminal-input {
		width: 100%;
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 0.75rem;
		font-family: inherit;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.terminal-input:focus {
		outline: none;
		box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
	}

	.button-group {
		margin-bottom: 1.5rem;
	}

	.terminal-btn {
		width: 100%;
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 1rem;
		font-family: inherit;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.terminal-btn:hover {
		background: #003300;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
	}

	.divider {
		text-align: center;
		color: #0a0;
		margin: 1.5rem 0;
	}

	.game-code {
		background: #001100;
		border: 2px solid #0f0;
		padding: 1rem;
		text-align: center;
		margin-top: 1.5rem;
	}

	.game-code .code {
		font-size: 2rem;
		font-weight: bold;
		letter-spacing: 0.3rem;
		margin: 0.5rem 0;
		text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
	}

	.game-code .hint {
		font-size: 0.9rem;
		color: #0a0;
		margin: 0.5rem 0 0 0;
	}

	.message {
		margin-top: 1rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
		text-align: center;
		animation: fadeIn 0.3s ease;
	}

	.placement-phase {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.phase-header {
		text-align: center;
	}

	.phase-header h2 {
		font-size: 2rem;
		margin: 0 0 1rem 0;
		text-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
	}

	.opponent-info {
		color: #0a0;
		margin: 0;
	}

	.battle-phase {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.battle-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #000;
		border: 2px solid #0f0;
		padding: 1rem 2rem;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
	}

	.status-panel h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
	}

	.status-panel p {
		margin: 0;
		color: #0a0;
	}

	.turn-indicator {
		font-size: 1.5rem;
		font-weight: bold;
		padding: 1rem 2rem;
		border: 2px solid #555;
		transition: all 0.3s ease;
	}

	.turn-indicator.active {
		border-color: #0f0;
		box-shadow: 0 0 20px rgba(0, 255, 0, 1);
		animation: pulse 1.5s infinite;
	}

	.grids-container {
		display: flex;
		justify-content: center;
		gap: 3rem;
		flex-wrap: wrap;
	}

	.grid-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.grid-wrapper h4 {
		margin: 0;
		font-size: 1.3rem;
		text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
	}

	.battle-message {
		text-align: center;
		font-size: 1.5rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
		animation: messageSlide 0.3s ease;
	}

	.game-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		gap: 2rem;
	}

	.game-over-title {
		font-size: 3rem;
		text-shadow: 0 0 30px rgba(255, 0, 0, 1);
		color: #f00;
		animation: glitch 0.5s infinite;
	}

	.final-score {
		font-size: 2rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pulse {
		0%, 100% {
			box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		}
		50% {
			box-shadow: 0 0 30px rgba(0, 255, 0, 1);
		}
	}

	@keyframes messageSlide {
		from {
			transform: translateY(-20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes glitch {
		0%, 100% {
			text-shadow: 0 0 30px rgba(255, 0, 0, 1);
		}
		50% {
			text-shadow: 0 0 30px rgba(255, 0, 0, 1), 5px 0 rgba(0, 255, 0, 0.5), -5px 0 rgba(0, 0, 255, 0.5);
		}
	}
</style>
