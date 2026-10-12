<script lang="ts">
	import { onMount } from 'svelte';
	import { phase, isObserver, room, initGame, leaveGame, onGameEvent } from '$lib/stores/game';
	import { sounds } from '$lib/audio/sounds';
	import Message from '$lib/components/Message.svelte';
	import Lobby from '$lib/components/phases/Lobby.svelte';
	import PlacementPhase from '$lib/components/phases/PlacementPhase.svelte';
	import BattlePhase from '$lib/components/phases/BattlePhase.svelte';
	import GameOver from '$lib/components/phases/GameOver.svelte';
	import ObserverView from '$lib/components/phases/ObserverView.svelte';

	let crtEnabled = $state(true);
	let isMuted = $state(false);

	onMount(() => {
		initGame();
		isMuted = sounds.isMuted();
		const unsub = onGameEvent((e, replay) => {
			if (replay) return;
			if (e.type === 'shot_fired') sounds.playShot();
			else if (e.type === 'hit') sounds.playHit();
			else if (e.type === 'miss') sounds.playMiss();
			else if (e.type === 'shielded') sounds.playShield();
			else if (e.type === 'item_destroyed') sounds.playAlarm();
			else if (e.type === 'player_ready' || e.type === 'battle_started') sounds.playBoot();
		});
		return unsub;
	});

	function toggleAudio() {
		isMuted = sounds.toggleMute();
	}
</script>

<svelte:head>
	<title>BattleChip - Network Warfare</title>
</svelte:head>

<div class="container" class:crt-active={crtEnabled}>
	<div class="crt-overlay" aria-hidden="true"></div>
	<header class="header">
		<div class="top-settings-bar">
			<button class="setting-pill" onclick={toggleAudio}>
				{isMuted ? '🔇 AUDIO: MUTED' : '🔊 AUDIO: ON'}
			</button>
			<button class="setting-pill" onclick={() => (crtEnabled = !crtEnabled)}>
				{crtEnabled ? '📺 CRT: ON' : '📺 CRT: OFF'}
			</button>
		</div>

		<h1 class="title">
			<span class="glitch" data-text="BATTLECHIP">BATTLECHIP</span>
		</h1>
		<p class="subtitle">[NETWORK WARFARE SIMULATOR v2.0]</p>

		{#if $room}
			<div class="room-status-bar">
				<span class="code-badge">NODE: {$room.code}</span>
				<span class="phase-badge">STATUS: {$phase.toUpperCase()}</span>
				{#if $room.observerCount > 0}
					<span class="obs-badge">WATCHERS: {$room.observerCount}</span>
				{/if}
				<button class="leave-btn" onclick={leaveGame}>[DISCONNECT]</button>
			</div>
		{/if}
	</header>

	{#if $isObserver}
		<ObserverView />
	{:else if $phase === 'lobby'}
		<Lobby />
	{:else if $phase === 'placement'}
		<PlacementPhase />
	{:else if $phase === 'battle'}
		<BattlePhase />
	{:else if $phase === 'game-over'}
		<GameOver />
	{/if}
</div>

<Message />

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
		padding: 1rem;
		background: 
			repeating-linear-gradient(
				0deg,
				rgba(0, 255, 0, 0.03) 0px,
				transparent 1px,
				transparent 2px,
				rgba(0, 255, 0, 0.03) 3px
			);
	}

	@media (min-width: 768px) {
		.container {
			padding: 1.5rem;
		}
	}

	.header {
		text-align: center;
		margin-bottom: 2rem;
		border-bottom: 2px solid #0f0;
		padding-bottom: 1rem;
		box-shadow: 0 4px 20px rgba(0, 255, 0, 0.2);
	}

	.title {
		margin: 0;
		font-size: 2.5rem;
		letter-spacing: 0.5rem;
		text-shadow: 0 0 10px #0f0, 0 0 20px #0f0;
	}

	@media (min-width: 768px) {
		.title {
			font-size: 3.5rem;
		}
	}

	.glitch {
		position: relative;
		display: inline-block;
	}

	.glitch::before,
	.glitch::after {
		content: attr(data-text);
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.glitch::before {
		left: 2px;
		text-shadow: -2px 0 #f0f;
		clip: rect(24px, 550px, 90px, 0);
		animation: glitch-anim 3s infinite linear alternate-reverse;
	}

	.glitch::after {
		left: -2px;
		text-shadow: -2px 0 #0ff;
		clip: rect(85px, 550px, 140px, 0);
		animation: glitch-anim2 2.5s infinite linear alternate-reverse;
	}

	@keyframes glitch-anim {
		0% { clip: rect(42px, 9999px, 44px, 0); }
		20% { clip: rect(12px, 9999px, 59px, 0); }
		40% { clip: rect(78px, 9999px, 29px, 0); }
		60% { clip: rect(25px, 9999px, 14px, 0); }
		80% { clip: rect(54px, 9999px, 86px, 0); }
		100% { clip: rect(98px, 9999px, 33px, 0); }
	}

	@keyframes glitch-anim2 {
		0% { clip: rect(65px, 9999px, 100px, 0); }
		20% { clip: rect(80px, 9999px, 15px, 0); }
		40% { clip: rect(12px, 9999px, 75px, 0); }
		60% { clip: rect(50px, 9999px, 30px, 0); }
		80% { clip: rect(20px, 9999px, 95px, 0); }
		100% { clip: rect(35px, 9999px, 60px, 0); }
	}

	.subtitle {
		margin: 0.5rem 0 0 0;
		font-size: 0.9rem;
		color: #0a0;
		letter-spacing: 0.2rem;
	}

	@media (min-width: 768px) {
		.subtitle {
			font-size: 1rem;
		}
	}

	.room-status-bar {
		display: flex;
		gap: 1rem;
		justify-content: center;
		align-items: center;
		margin-top: 1rem;
		font-size: 0.85rem;
		flex-wrap: wrap;
	}

	.code-badge {
		background: #002200;
		border: 1px solid #0f0;
		padding: 0.2rem 0.6rem;
		font-weight: bold;
		color: #0f0;
	}

	.phase-badge {
		background: #001122;
		border: 1px solid #0af;
		padding: 0.2rem 0.6rem;
		color: #0af;
	}

	.obs-badge {
		background: #221100;
		border: 1px solid #fa0;
		padding: 0.2rem 0.6rem;
		color: #fa0;
	}

	.leave-btn {
		background: #220000;
		border: 1px solid #f00;
		color: #f00;
		padding: 0.2rem 0.6rem;
		font-family: inherit;
		cursor: pointer;
	}

	.leave-btn:hover {
		background: #440000;
	}

	.top-settings-bar {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.setting-pill {
		font-family: inherit;
		background: #001500;
		border: 1px solid #080;
		color: #0d0;
		padding: 0.2rem 0.5rem;
		font-size: 0.75rem;
		cursor: pointer;
		border-radius: 2px;
	}

	.setting-pill:hover {
		border-color: #0f0;
		color: #0f0;
		background: #002500;
	}

	.crt-overlay {
		display: none;
		pointer-events: none;
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
		background-size: 100% 3px, 6px 100%;
		z-index: 99999;
	}

	.crt-active .crt-overlay {
		display: block;
	}
</style>
