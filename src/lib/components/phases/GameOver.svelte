<script lang="ts">
	import { visibleState, room, mySlot, requestRematch, leaveGame } from '$lib/stores/game';

	const slot = $derived($mySlot ?? 0);
	const oppSlot = $derived(slot === 0 ? 1 : 0);

	const myBoard = $derived($visibleState?.boards[slot]);
	const oppBoard = $derived($visibleState?.boards[oppSlot]);
	const myStats = $derived(myBoard?.stats);
	const oppStats = $derived(oppBoard?.stats);

	const didWin = $derived($visibleState?.winner !== null && $visibleState?.winner === slot);
	const endReason = $derived($visibleState?.endReason ?? 'elimination');

	const title = $derived(didWin ? '[ACCESS GRANTED]' : '[NETWORK COMPROMISED]');
	const subtitle = $derived(
		didWin
			? `[MISSION SUCCESS - ENEMY HARDWARE NEUTRALIZED (${endReason.toUpperCase()})]`
			: `[SYSTEM BREACHED - HARDWARE ANNIHILATED (${endReason.toUpperCase()})]`
	);

	const myRematch = $derived($room?.rematchRequests.includes(slot) ?? false);
	const oppRematch = $derived($room?.rematchRequests.includes(oppSlot) ?? false);
	const oppConnected = $derived($room?.players[oppSlot]?.connected ?? false);
</script>

<div class="game-over">
	<h2 class="game-over-title" class:winner={didWin} class:loser={!didWin}>{title}</h2>
	<p class="game-over-subtitle">{subtitle}</p>

	<div class="stats-grid">
		<div class="stat-box">
			<h3>[YOUR TELEMETRY]</h3>
			<p class="stat-line"><span class="stat-label">Final Score:</span> {myBoard?.score ?? 0}</p>
			<p class="stat-line"><span class="stat-label">Shots Fired:</span> {myStats?.shots ?? 0}</p>
			<p class="stat-line"><span class="stat-label">Hits Registered:</span> {myStats?.hits ?? 0}</p>
			<p class="stat-line"><span class="stat-label">Misses:</span> {myStats?.misses ?? 0}</p>
			<p class="stat-line">
				<span class="stat-label">Accuracy:</span>
				{myStats?.shots ? Math.round((myStats.hits / myStats.shots) * 100) : 0}%
			</p>
			<p class="stat-line"><span class="stat-label">Units Lost:</span> {myStats?.itemsLost ?? 0}/6</p>
		</div>

		<div class="stat-box">
			<h3>[OPPONENT TELEMETRY]</h3>
			<p class="stat-line"><span class="stat-label">Final Score:</span> {oppBoard?.score ?? 0}</p>
			<p class="stat-line"><span class="stat-label">Shots Fired:</span> {oppStats?.shots ?? 0}</p>
			<p class="stat-line"><span class="stat-label">Hits Registered:</span> {oppStats?.hits ?? 0}</p>
			<p class="stat-line"><span class="stat-label">Misses:</span> {oppStats?.misses ?? 0}</p>
			<p class="stat-line">
				<span class="stat-label">Accuracy:</span>
				{oppStats?.shots ? Math.round((oppStats.hits / oppStats.shots) * 100) : 0}%
			</p>
			<p class="stat-line"><span class="stat-label">Units Lost:</span> {oppStats?.itemsLost ?? 0}/6</p>
		</div>
	</div>

	<div class="rematch-controls">
		{#if !oppConnected}
			<p class="rematch-status disconnect">[OPPONENT DISCONNECTED]</p>
			<button class="terminal-btn secondary" onclick={leaveGame}>[RETURN TO LOBBY]</button>
		{:else if myRematch && oppRematch}
			<p class="rematch-status waiting">[REMATCH STARTING...]</p>
		{:else if myRematch}
			<p class="rematch-status waiting">[WAITING FOR OPPONENT TO ACCEPT...]</p>
			<button class="terminal-btn secondary" onclick={leaveGame}>[DISCONNECT]</button>
		{:else if oppRematch}
			<p class="rematch-status request">[OPPONENT HAS REQUESTED A REMATCH]</p>
			<button class="terminal-btn" onclick={requestRematch}>[ACCEPT REMATCH]</button>
			<button class="terminal-btn secondary" onclick={leaveGame}>[DECLINE]</button>
		{:else}
			<button class="terminal-btn" onclick={requestRematch}>[REQUEST REMATCH]</button>
			<button class="terminal-btn secondary" onclick={leaveGame}>[DISCONNECT]</button>
		{/if}
	</div>
</div>

<style>
	.game-over {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding: 1rem;
	}

	.game-over-title {
		font-size: 2.2rem;
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
			font-size: 3rem;
		}
	}

	@keyframes flicker {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.game-over-subtitle {
		font-size: 1rem;
		color: #0a0;
		margin-bottom: 2rem;
	}

	.stats-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
		width: 100%;
		max-width: 800px;
	}

	@media (min-width: 768px) {
		.stats-grid {
			flex-direction: row;
		}
	}

	.stat-box {
		flex: 1;
		border: 1px solid #0f0;
		padding: 1.2rem;
		background: rgba(0, 20, 0, 0.6);
		text-align: left;
	}

	.stat-box h3 {
		margin-top: 0;
		color: #0f0;
		border-bottom: 1px solid #0a0;
		padding-bottom: 0.5rem;
		font-size: 1.1rem;
	}

	.stat-line {
		font-size: 1rem;
		color: #0f0;
		margin: 0.4rem 0;
	}

	.stat-label {
		color: #0ff;
	}

	.rematch-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.rematch-status {
		font-size: 1.1rem;
		padding: 0.8rem 1.5rem;
		border: 1px solid;
		margin: 0;
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
		padding: 0.8rem 1.8rem;
		font-family: inherit;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.terminal-btn:hover {
		background: #003300;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
	}

	.terminal-btn.secondary {
		border-color: #555;
		color: #777;
	}

	.terminal-btn.secondary:hover {
		background: #222;
		border-color: #888;
		color: #aaa;
		box-shadow: 0 0 10px rgba(136, 136, 136, 0.5);
	}
</style>
