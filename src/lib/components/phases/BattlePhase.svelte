<script lang="ts">
	import { visibleState, room, mySlot, isMyTurn, deadline, eventLog, fire, useAbility, emote } from '$lib/stores/game';
	import Grid from '$lib/components/Grid.svelte';
	import { ownCells, publicCells, emptyCells } from '$lib/utils/boards';
	import { EMOTES, EMOTE_TEXT, type Coord, type EmoteId, type GridCell } from '$lib/types/game';
	import { messageStore } from '$lib/stores/message';

	const slot = $derived($mySlot ?? 0);
	const oppSlot = $derived(slot === 0 ? 1 : 0);

	const me = $derived($room?.players[slot]);
	const opp = $derived($room?.players[oppSlot]);

	const myBoard = $derived($visibleState?.boards[slot]);
	const oppBoard = $derived($visibleState?.boards[oppSlot]);

	const myGridCells = $derived.by<GridCell[][]>(() => {
		if ($visibleState) return ownCells($visibleState);
		return emptyCells();
	});

	const oppGridCells = $derived.by<GridCell[][]>(() => {
		if ($visibleState?.boards[oppSlot]) return publicCells($visibleState.boards[oppSlot]);
		return emptyCells();
	});

	// Targeting & ability state
	let activeAbility = $state<string | null>(null);

	// Seconds remaining calculation
	let now = $state(Date.now());
	$effect(() => {
		const interval = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(interval);
	});

	const secondsLeft = $derived.by<number | null>(() => {
		if (!$deadline) return null;
		const diff = Math.max(0, Math.ceil(($deadline - now) / 1000));
		return diff;
	});

	function handleTargetClick(c: Coord) {
		if (!$isMyTurn) {
			messageStore.show('[SYS ALERT] - Standby: awaiting enemy network cycle.', 'warning');
			return;
		}

		if (activeAbility) {
			useAbility(activeAbility, c);
			activeAbility = null;
			return;
		}

		// Check if cell was already fired upon (allow shielded cells as they require an additional hit)
		const targetCell = oppGridCells[c.row]?.[c.col];
		if (targetCell && targetCell.state !== 'unknown' && targetCell.state !== 'shielded') {
			messageStore.show('[WARNING] - Coordinates already probed.', 'warning');
			return;
		}

		fire(c);
	}

	function handleAbilityClick(abilityId: string, requiresTarget: boolean) {
		if (!$isMyTurn) {
			messageStore.show('[SYS ALERT] - Cannot execute abilities out of turn.', 'warning');
			return;
		}
		if (requiresTarget) {
			activeAbility = activeAbility === abilityId ? null : abilityId;
		} else {
			useAbility(abilityId);
			activeAbility = null;
		}
	}
</script>

<div class="battle-phase">
	<!-- Status header -->
	<div class="battle-header">
		<div class="status-panel">
			<h3>[DEFENSE NODE]</h3>
			<p class="operator-name">{me?.name ?? 'You'}</p>
			<p class="score-line">Score: {myBoard?.score ?? 0} | Remaining: {myBoard?.itemsRemaining ?? 0}/6</p>
		</div>

		<div class="turn-panel" class:active={$isMyTurn}>
			<div class="turn-label">{$isMyTurn ? '>> ACTIVE TURN <<' : '[ENEMY TURN]'}</div>
			{#if secondsLeft !== null}
				<div class="timer-badge" class:urgent={secondsLeft <= 5}>
					T-{secondsLeft}s
				</div>
			{/if}
		</div>

		<div class="status-panel">
			<h3>[TARGET NODE]</h3>
			<p class="operator-name">{opp?.name ?? 'Enemy Node'} {opp?.isBot ? '(AI)' : ''}</p>
			<p class="score-line">Score: {oppBoard?.score ?? 0} | Remaining: {oppBoard?.itemsRemaining ?? 0}/6</p>
		</div>
	</div>

	<!-- Arena grids -->
	<div class="grids-arena">
		<div class="grid-card">
			<div class="grid-card-title">
				<h4>[FRIENDLY DEFENSE GRID]</h4>
				<span class="sub-hint">Incoming enemy packets</span>
			</div>
			<Grid cells={myGridCells} showItems disabled label="Your defensive grid" />
		</div>

		<div class="grid-card">
			<div class="grid-card-title">
				<h4>[ENEMY RADAR / ATTACK GRID]</h4>
				<span class="sub-hint">
					{activeAbility ? `[SELECT 3x3 SCAN AREA]` : $isMyTurn ? 'Click cell to launch packet' : 'Awaiting turn'}
				</span>
			</div>
			<Grid
				cells={oppGridCells}
				disabled={!$isMyTurn}
				onCellClick={handleTargetClick}
				label="Enemy attack radar"
			/>
		</div>
	</div>

	<!-- Ability and action bar -->
	<div class="action-bar">
		{#if $visibleState?.own?.abilities}
			<div class="abilities-container">
				<span class="bar-title">TACTICAL MODULES:</span>
				{#each Object.entries($visibleState.own.abilities) as [id, ab]}
					<button
						class="ability-btn"
						class:active={activeAbility === id}
						disabled={!$isMyTurn || ab.cooldown > 0 || (ab.usesLeft !== null && ab.usesLeft <= 0)}
						onclick={() => handleAbilityClick(id, id === 'ping')}
					>
						<span class="ab-name">{id.toUpperCase()}</span>
						{#if ab.cooldown > 0}
							<span class="ab-cd">[{ab.cooldown}t]</span>
						{:else if ab.usesLeft !== null}
							<span class="ab-uses">({ab.usesLeft} left)</span>
						{/if}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Quick emote bar -->
		<div class="emotes-container">
			<span class="bar-title">COMMS:</span>
			<div class="emote-buttons">
				{#each EMOTES as e}
					<button class="emote-btn" onclick={() => emote(e)} title={EMOTE_TEXT[e]}>
						{e.toUpperCase()}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Terminal event log -->
	<div class="terminal-log-wrapper">
		<div class="terminal-bar">
			<span>SYSTEM EVENT LOG (LAST 6 OPERATIONS)</span>
		</div>
		<div class="terminal-feed">
			{#if $eventLog.length === 0}
				<p class="feed-line muted">> System initialized. Battle in progress...</p>
			{:else}
				{#each $eventLog.slice(-6) as ev}
					<p class="feed-line">
						<span class="timestamp">[{new Date(ev.ts).toLocaleTimeString()}]</span>
						{#if ev.type === 'shot_fired'}
							> Operator {ev.actor === slot ? 'YOU' : opp?.name ?? 'OPPONENT'} targeted [{ev.target.row},{ev.target.col}]
						{:else if ev.type === 'hit'}
							<span class="hit">> DIRECT HIT at [{ev.target.row},{ev.target.col}]!</span>
						{:else if ev.type === 'miss'}
							<span class="miss">> Packet missed target at [{ev.target.row},{ev.target.col}].</span>
						{:else if ev.type === 'shielded'}
							<span class="shielded">> FIREWALL SHIELD ABSORPTION at [{ev.target.row},{ev.target.col}]!</span>
						{:else if ev.type === 'item_destroyed'}
							<span class="destroyed">> ALERT: {ev.item.toUpperCase()} SYSTEM ANNIHILATED!</span>
						{:else if ev.type === 'emote'}
							<span class="emote">> {ev.slot === slot ? 'YOU' : opp?.name ?? 'OPPONENT'}: "{EMOTE_TEXT[ev.emote]}"</span>
						{:else if ev.type === 'turn_timeout'}
							<span class="timeout">> WARNING: Turn cycle expired! Auto-packet launched.</span>
						{:else if ev.type === 'deflect'}
							<span class="shielded">> ROUTER DEFLECTION: Packet redirected to [{ev.to.row},{ev.to.col}]!</span>
						{:else if ev.type === 'shot_wasted'}
							<span class="miss">> Packet wasted at [{ev.target.row},{ev.target.col}] (already probed).</span>
						{:else if ev.type === 'repair'}
							<span class="shielded">> BACKUP AUTO-REPAIR: Restored damaged node at [{ev.cell.row},{ev.cell.col}]!</span>
						{:else}
							> {ev.type.replace(/_/g, ' ').toUpperCase()}
						{/if}
					</p>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.battle-phase {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.5rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
		gap: 1.2rem;
	}

	.battle-header {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 0.8rem 1.2rem;
		background: #001100;
		border: 1px solid #0f0;
		width: 100%;
		box-sizing: border-box;
	}

	@media (min-width: 768px) {
		.battle-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.status-panel {
		flex: 1;
		text-align: center;
	}

	.status-panel h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #0f0;
	}

	.operator-name {
		margin: 0.2rem 0;
		font-size: 1.2rem;
		font-weight: bold;
		color: #0ff;
	}

	.score-line {
		margin: 0;
		font-size: 0.85rem;
		color: #0a0;
	}

	.turn-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.6rem;
		border: 1px solid #0a0;
		background: #000c00;
	}

	.turn-panel.active {
		border-color: #0f0;
		background: #002200;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
	}

	.turn-label {
		font-size: 1.1rem;
		font-weight: bold;
		color: #0f0;
	}

	.timer-badge {
		margin-top: 0.3rem;
		font-size: 1rem;
		color: #ff0;
	}

	.timer-badge.urgent {
		color: #f00;
		animation: pulse 0.5s infinite;
	}

	.grids-arena {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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

	.grid-card {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.grid-card-title {
		text-align: center;
		margin-bottom: 0.6rem;
	}

	.grid-card-title h4 {
		margin: 0;
		color: #0f0;
		font-size: 1.1rem;
	}

	.sub-hint {
		font-size: 0.8rem;
		color: #0a0;
	}

	.action-bar {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		background: #001100;
		border: 1px solid #0f0;
		padding: 0.8rem;
		box-sizing: border-box;
	}

	@media (min-width: 768px) {
		.action-bar {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.bar-title {
		font-size: 0.85rem;
		font-weight: bold;
		color: #0f0;
		margin-right: 0.5rem;
	}

	.abilities-container,
	.emotes-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.emote-buttons {
		display: flex;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.ability-btn,
	.emote-btn {
		font-family: inherit;
		background: #000;
		border: 1px solid #0a0;
		color: #0f0;
		padding: 0.3rem 0.6rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.ability-btn:hover:not(:disabled),
	.emote-btn:hover {
		background: #003300;
		border-color: #0f0;
	}

	.ability-btn.active {
		border-color: #ff0;
		background: #332b00;
		color: #ff0;
	}

	.ability-btn:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.terminal-log-wrapper {
		width: 100%;
		border: 1px solid #0a0;
		background: #000a00;
		box-sizing: border-box;
	}

	.terminal-bar {
		background: #001a00;
		padding: 0.3rem 0.8rem;
		border-bottom: 1px solid #0a0;
		font-size: 0.8rem;
		color: #0f0;
		letter-spacing: 0.1rem;
	}

	.terminal-feed {
		padding: 0.6rem 0.8rem;
		min-height: 5.5rem;
		font-size: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.feed-line {
		margin: 0;
		color: #0f0;
	}

	.feed-line.muted {
		color: #070;
	}

	.timestamp {
		color: #080;
		margin-right: 0.3rem;
	}

	.hit {
		color: #f33;
		font-weight: bold;
	}

	.miss {
		color: #888;
	}

	.shielded {
		color: #0af;
		font-weight: bold;
	}

	.destroyed {
		color: #ff0;
		font-weight: bold;
	}

	.emote {
		color: #0ff;
	}

	.timeout {
		color: #f80;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
