<script lang="ts">
	import { messageStore } from '$lib/stores/message';
	import { fade, fly } from 'svelte/transition';

	$: message = $messageStore;
</script>

{#if message.text}
	<div 
		class="toast-notification {message.type}" 
		role="alert"
		transition:fly={{ y: -20, duration: 300 }}
	>
		{message.text}
	</div>
{/if}

<style>
	.toast-notification {
		position: fixed;
		top: 2rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 1rem 2rem;
		background: rgba(0, 255, 0, 0.95);
		border: 2px solid #00ff00;
		color: #000;
		font-family: 'Courier New', monospace;
		font-weight: bold;
		text-align: center;
		min-width: 300px;
		max-width: 600px;
		box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
		z-index: 9999;
		pointer-events: none;
	}

	.toast-notification.error {
		background: rgba(255, 0, 0, 0.95);
		border-color: #ff0000;
		color: #000;
		box-shadow: 0 0 30px rgba(255, 0, 0, 0.8);
	}

	.toast-notification.warning {
		background: rgba(255, 165, 0, 0.95);
		border-color: #ffa500;
		color: #000;
		box-shadow: 0 0 30px rgba(255, 165, 0, 0.8);
	}

	.toast-notification.success {
		background: rgba(0, 255, 255, 0.95);
		border-color: #00ffff;
		color: #000;
		box-shadow: 0 0 30px rgba(0, 255, 255, 0.8);
	}
</style>
