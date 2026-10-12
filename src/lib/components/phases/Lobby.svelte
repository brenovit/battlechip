<script lang="ts">
	import { createGame, joinGame, observeGame } from '$lib/stores/game';
	import type { Difficulty } from '$lib/types/game';

	let name = $state('');
	let code = $state('');
	let difficulty = $state<Difficulty>('easy');
	const playerName = () => name.trim() || 'Operator';
</script>

<div class="lobby">
	<label>
		Operator name
		<input bind:value={name} maxlength="20" placeholder="Operator" />
	</label>

	<div class="row">
		<button onclick={() => createGame(playerName())}>Create game</button>
	</div>

	<div class="row">
		<select bind:value={difficulty} aria-label="AI difficulty">
			<option value="easy">Easy</option>
			<option value="medium">Medium</option>
			<option value="hard">Hard</option>
		</select>
		<button onclick={() => createGame(playerName(), { vsAi: true, difficulty })}>Play vs AI</button>
	</div>

	<div class="row">
		<input bind:value={code} maxlength="12" placeholder="GAME CODE" />
		<button disabled={!code.trim()} onclick={() => joinGame(code, playerName())}>Join</button>
		<button disabled={!code.trim()} onclick={() => observeGame(code)}>Observe</button>
	</div>
</div>

<style>
	.lobby {
		max-width: 28rem;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.row {
		display: flex;
		gap: 0.5rem;
	}
	input,
	select,
	button {
		font-family: inherit;
		background: #001100;
		color: #0f0;
		border: 1px solid #0f0;
		padding: 0.5rem;
	}
	input {
		flex: 1;
		text-transform: uppercase;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	label input {
		text-transform: none;
	}
	button:disabled {
		opacity: 0.4;
	}
</style>
