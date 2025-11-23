<script lang="ts">
	import { gameStore } from '$lib/stores/game';
	import { messageStore } from '$lib/stores/message';

	let playerName = '';
	let gameId = '';

	$: currentGameId = $gameStore.gameId;

	const adjectives = ['Cyber', 'Shadow', 'Ghost', 'Quantum', 'Digital', 'Binary', 'Neon', 'Apex', 'Void', 'Echo', 'Prism', 'Nexus', 'Dark', 'Storm', 'Iron', 'Steel', 'Chrome', 'Hyper', 'Ultra', 'Mega'];
	const nouns = ['Hacker', 'Operator', 'Agent', 'Runner', 'Phantom', 'Warrior', 'Knight', 'Sentinel', 'Reaper', 'Hunter', 'Ninja', 'Samurai', 'Sniper', 'Blade', 'Viper', 'Wolf', 'Raven', 'Phoenix', 'Dragon', 'Tiger'];

	function generateRandomName() {
		const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
		const noun = nouns[Math.floor(Math.random() * nouns.length)];
		const num = Math.floor(Math.random() * 99) + 1;
		playerName = `${adj}${noun}${num}`;
	}

	function copyNetworkId() {
		if (currentGameId) {
			navigator.clipboard.writeText(currentGameId).catch(() => {
				const textArea = document.createElement('textarea');
				textArea.value = currentGameId;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
			});
		}
	}

	function createGame() {
		if (!playerName.trim()) {
			messageStore.show('[ERROR] - Please enter your name', 'error');
			return;
		}
		gameStore.createGame(playerName);
		messageStore.show('[INITIALIZING NETWORK...]', 'info');
	}

	function joinGame() {
		console.log('[LOBBY] joinGame() called - playerName:', playerName, 'gameId:', gameId);
		if (!playerName.trim() || !gameId.trim()) {
			messageStore.show('[ERROR] - Please enter your name and game ID', 'error');
			return;
		}
		console.log('[LOBBY] Calling gameStore.joinGame()');
		gameStore.joinGame(gameId.toUpperCase(), playerName);
		console.log('[LOBBY] gameStore.joinGame() returned');
	}
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
					<button class="terminal-btn-small" on:click={generateRandomName} title="Generate random name">
						[🎲]
					</button>
				</div>
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
					<div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
						<p class="code">{currentGameId}</p>
						<button class="terminal-btn-small" on:click={copyNetworkId} title="Copy to clipboard">
							[📋]
						</button>
					</div>
					<p class="hint">Share this code with your opponent</p>
				</div>
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
</style>
