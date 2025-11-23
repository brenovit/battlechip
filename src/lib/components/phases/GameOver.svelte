<script lang="ts">
	import { gameStore } from '$lib/stores/game';

	export let score: number;
	export let damageCaused: number;
	export let damageTaken: number;
	export let playerIndex: number | null;
	export let winner: number | null;
	export let onRestart: () => void;

	$: didWin = playerIndex !== null && winner !== null && playerIndex === winner;
	$: title = didWin ? '[ACCESS GRANTED]' : '[NETWORK COMPROMISED]';
	$: subtitle = didWin 
		? '[ENEMY NETWORK INFILTRATED - MISSION SUCCESS]' 
		: '[SYSTEM BREACHED - ACCESS DENIED]';

	$: opponentWantsRematch = $gameStore.opponentWantsRematch;
	$: requestedRematch = $gameStore.requestedRematch;
	$: opponentDisconnected = $gameStore.opponentDisconnected;

	function handleRematch() {
		gameStore.requestRematch();
	}
</script>

<div class="game-over">
	<h2 class="game-over-title" class:winner={didWin} class:loser={!didWin}>{title}</h2>
	<p class="game-over-subtitle">{subtitle}</p>
	<div class="stats">
		<p class="stat-line"><span class="stat-label">[DAMAGE CAUSED]:</span> {damageCaused} hits</p>
		<p class="stat-line"><span class="stat-label">[DAMAGE TAKEN]:</span> {damageTaken} hits</p>
		<p class="stat-line"><span class="stat-label">[FINAL SCORE]:</span> {score} points</p>
	</div>

	{#if opponentDisconnected}
		<p class="rematch-status disconnect">[OPPONENT DISCONNECTED]</p>
		<button class="terminal-btn" on:click={onRestart}>
			[DISCONNECT]
		</button>
	{:else if requestedRematch && opponentWantsRematch}
		<p class="rematch-status waiting">[REMATCH STARTING...]</p>
	{:else if requestedRematch}
		<p class="rematch-status waiting">[WAITING FOR OPPONENT...]</p>
		<button class="terminal-btn secondary" on:click={onRestart}>
			[CANCEL]
		</button>
	{:else if opponentWantsRematch}
		<p class="rematch-status request">[OPPONENT WANTS REMATCH]</p>
		<button class="terminal-btn" on:click={handleRematch}>
			[ACCEPT REMATCH]
		</button>
		<button class="terminal-btn secondary" on:click={onRestart}>
			[DECLINE]
		</button>
	{:else}
		<button class="terminal-btn" on:click={handleRematch}>
			[REQUEST REMATCH]
		</button>
		<button class="terminal-btn secondary" on:click={onRestart}>
			[DISCONNECT]
		</button>
	{/if}
</div>

<style>
	.game-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
	}

	.game-over-title {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		animation: flicker 2s infinite;
	}

	.game-over-title.winner {
		color: #0f0;
		text-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
	}

	.game-over-title.loser {
		color: #f00;
		text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
	}

	@media (min-width: 768px) {
		.game-over-title {
			font-size: 2.5rem;
		}
	}

	@keyframes flicker {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.game-over-subtitle {
		font-size: 1rem;
		color: #0a0;
		margin-bottom: 1.5rem;
	}

	@media (min-width: 768px) {
		.game-over-subtitle {
			font-size: 1.2rem;
		}
	}

	.stats {
		border: 1px solid #0f0;
		padding: 1rem;
		margin-bottom: 1.5rem;
		background: rgba(0, 17, 0, 0.5);
	}

	.stat-line {
		font-size: 1.1rem;
		color: #0f0;
		margin: 0.5rem 0;
		text-align: left;
	}

	.stat-label {
		color: #0ff;
		font-weight: bold;
	}

	@media (min-width: 768px) {
		.stat-line {
			font-size: 1.3rem;
		}
	}

	.rematch-status {
		font-size: 1.2rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		border: 1px solid;
	}

	.rematch-status.waiting {
		color: #ff0;
		border-color: #ff0;
		animation: pulse 1.5s infinite;
	}

	.rematch-status.request {
		color: #0ff;
		border-color: #0ff;
	}

	.rematch-status.disconnect {
		color: #f00;
		border-color: #f00;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.terminal-btn {
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 1rem 2rem;
		font-family: inherit;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.2s ease;
		margin: 0.5rem;
	}

	.terminal-btn:hover {
		background: #003300;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
	}

	.terminal-btn.secondary {
		border-color: #666;
		color: #666;
	}

	.terminal-btn.secondary:hover {
		background: #222;
		border-color: #888;
		color: #888;
		box-shadow: 0 0 10px rgba(136, 136, 136, 0.5);
	}
</style>
