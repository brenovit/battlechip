<script lang="ts">
	export let score: number;
	export let onRestart: () => void;
</script>

<div class="game-over">
	<h2 class="game-over-title">[NETWORK COMPROMISED]</h2>
	<p class="final-score">Final Score: {score}</p>
	<button class="terminal-btn" on:click={onRestart}>
		[DISCONNECT]
	</button>
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
		font-size: 3rem;
		color: #f00;
		text-shadow: 0 0 20px rgba(255, 0, 0, 0.8);
		margin-bottom: 2rem;
		animation: flicker 2s infinite;
	}

	@keyframes flicker {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.final-score {
		font-size: 2rem;
		color: #0f0;
		margin-bottom: 2rem;
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
	}

	.terminal-btn:hover {
		background: #003300;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
	}
</style>
