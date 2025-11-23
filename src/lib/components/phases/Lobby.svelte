<script lang="ts">
	export let playerName: string;
	export let gameId: string;
	export let currentGameId: string;
	export let message: string;
	export let onCreateGame: () => void;
	export let onJoinGame: () => void;
	export let onGenerateRandomName: () => void;
	export let onCopyNetworkId: () => void;
</script>

<div class="lobby">
	<div class="terminal">
		<div class="terminal-header">[SYSTEM ACCESS]</div>
		<div class="terminal-body">
			<div class="input-group">
				<label for="name">&gt; USERNAME:</label>
				<div style="display: flex; gap: 0.5rem; width: 100%;">
					<input
						id="name"
						type="text"
						bind:value={playerName}
						placeholder="Enter your handle..."
						class="terminal-input"
						style="flex: 1;"
					/>
					<button class="terminal-btn-small" on:click={onGenerateRandomName} title="Generate random name">
						[🎲]
					</button>
				</div>
			</div>

			<div class="button-group">
				<button class="terminal-btn" on:click={onCreateGame}>
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
				<button class="terminal-btn" on:click={onJoinGame}>
					[INFILTRATE NETWORK]
				</button>
			</div>

			{#if currentGameId}
				<div class="game-code">
					<p>[NETWORK ID]</p>
					<div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
						<p class="code">{currentGameId}</p>
						<button class="terminal-btn-small" on:click={onCopyNetworkId} title="Copy to clipboard">
							[📋]
						</button>
					</div>
					<p class="hint">Share this code with your opponent</p>
				</div>
			{/if}

			{#if message}
				<div class="message">{message}</div>
			{/if}
		</div>
	</div>
</div>

<style>
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

	.terminal-btn-small {
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		padding: 0.5rem 0.75rem;
		font-family: inherit;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.terminal-btn-small:hover {
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

	.game-code p {
		margin: 0.5rem 0;
		color: #0f0;
	}

	.code {
		font-size: 2rem;
		font-weight: bold;
		letter-spacing: 0.3rem;
	}

	.hint {
		font-size: 0.8rem;
		color: #0a0;
	}

	.message {
		margin-top: 1rem;
		padding: 1rem;
		background: #001100;
		border: 2px solid #0f0;
		color: #0f0;
		text-align: center;
	}
</style>
