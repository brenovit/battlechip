<script lang="ts">
	import { visibleState, room } from '$lib/stores/game';
	import Grid from '$lib/components/Grid.svelte';
	import { publicCells, emptyCells } from '$lib/utils/boards';
	import type { GridCell } from '$lib/types/game';

	const phase = $derived($room?.phase ?? 'lobby');
	const p1 = $derived($room?.players[0]);
	const p2 = $derived($room?.players[1]);

	const currentTurn = $derived($visibleState?.turn ?? 0);
	const obsCount = $derived($room?.observerCount ?? 1);

	const p1Cells = $derived.by<GridCell[][]>(() => {
		if ($visibleState?.boards[0]) return publicCells($visibleState.boards[0]);
		return emptyCells();
	});

	const p2Cells = $derived.by<GridCell[][]>(() => {
		if ($visibleState?.boards[1]) return publicCells($visibleState.boards[1]);
		return emptyCells();
	});
</script>

<div class="observer-view">
	<div class="observer-header">
		<h2 class="observer-title">[OBSERVER SATELLITE FEED]</h2>
		<p class="observer-subtitle">Passive surveillance mode active. Observers connected: {obsCount}</p>
	</div>

	{#if phase === 'lobby' || phase === 'placement'}
		<div class="waiting-card">
			<p class="pulse-text">[AWAITING BATTLE INITIALIZATION]</p>
			{#if !p1 || !p2}
				<p class="sub-text">Waiting for combatants to connect...</p>
			{:else}
				<p class="sub-text">Combatants are currently deploying hardware assets...</p>
			{/if}
		</div>
	{:else}
		<div class="battle-status-bar">
			<div
				class="turn-banner"
				class:p1-active={phase === 'battle' && currentTurn === 0}
				class:p2-active={phase === 'battle' && currentTurn === 1}
			>
				{#if phase === 'battle'}
					{currentTurn === 0 ? `[TURN: ${p1?.name ?? 'PLAYER 1'}]` : `[TURN: ${p2?.name ?? 'PLAYER 2'}]`}
				{:else}
					[BATTLE CONCLUDED]
				{/if}
			</div>
		</div>

		<div class="grids-arena">
			<div class="grid-section">
				<div class="player-tag">
					<h3>[{p1?.name ?? 'NODE 0'}]</h3>
					<span class="score-tag">Score: {$visibleState?.boards[0]?.score ?? 0}</span>
					<span class="units-tag">Remaining: {$visibleState?.boards[0]?.itemsRemaining ?? 0}/6</span>
				</div>
				<Grid cells={p1Cells} disabled label="Node 0 defense" />
			</div>

			<div class="grid-section">
				<div class="player-tag">
					<h3>[{p2?.name ?? 'NODE 1'}]</h3>
					<span class="score-tag">Score: {$visibleState?.boards[1]?.score ?? 0}</span>
					<span class="units-tag">Remaining: {$visibleState?.boards[1]?.itemsRemaining ?? 0}/6</span>
				</div>
				<Grid cells={p2Cells} disabled label="Node 1 defense" />
			</div>
		</div>
	{/if}
</div>

<style>
	.observer-view {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.observer-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 0.8rem;
		background: #001100;
		border: 1px solid #0f0;
		width: 100%;
		box-sizing: border-box;
	}

	.observer-title {
		color: #0f0;
		margin: 0 0 0.3rem 0;
		font-size: 1.6rem;
		text-shadow: 0 0 10px rgba(0, 255, 0, 0.8);
	}

	.observer-subtitle {
		color: #0a0;
		margin: 0;
		font-size: 0.9rem;
	}

	.waiting-card {
		text-align: center;
		padding: 2.5rem;
		border: 1px solid #0a0;
		background: #001100;
		margin: 2rem 0;
		width: 100%;
		max-width: 600px;
	}

	.pulse-text {
		color: #0f0;
		font-size: 1.3rem;
		margin: 0 0 0.5rem 0;
		animation: pulse 1.5s infinite;
	}

	.sub-text {
		color: #0a0;
		font-size: 0.95rem;
		margin: 0;
	}

	.battle-status-bar {
		width: 100%;
		margin-bottom: 1.5rem;
	}

	.turn-banner {
		text-align: center;
		padding: 0.8rem;
		border: 2px solid #0a0;
		color: #0a0;
		font-size: 1.3rem;
		font-weight: bold;
		background: #001100;
	}

	.turn-banner.p1-active {
		border-color: #0f0;
		color: #0f0;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
	}

	.turn-banner.p2-active {
		border-color: #0ff;
		color: #0ff;
		box-shadow: 0 0 15px rgba(0, 255, 255, 0.4);
	}

	.grids-arena {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	@media (min-width: 1024px) {
		.grids-arena {
			flex-direction: row;
			align-items: flex-start;
		}
	}

	.grid-section {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.player-tag {
		text-align: center;
		margin-bottom: 0.8rem;
		padding: 0.5rem 1rem;
		background: #001100;
		border: 1px solid #0f0;
		width: 100%;
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.player-tag h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #0f0;
	}

	.score-tag {
		color: #0ff;
		font-size: 0.9rem;
	}

	.units-tag {
		color: #ff0;
		font-size: 0.9rem;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
