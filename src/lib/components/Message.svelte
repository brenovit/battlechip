<script lang="ts">
	import { messageStore } from '$lib/stores/message';

	$: message = $messageStore;
</script>

{#if message.text}
	<div class="global-message {message.type}" role="alert">
		{message.text}
	</div>
{/if}

<style>
	.global-message {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		padding: 1rem 2rem;
		background: rgba(0, 255, 0, 0.1);
		border: 2px solid #00ff00;
		color: #00ff00;
		font-family: 'Courier New', monospace;
		font-weight: bold;
		text-align: center;
		z-index: 1000;
		min-width: 300px;
		max-width: 80%;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
		animation: slideUp 0.3s ease-out;
	}

	.global-message.error {
		background: rgba(255, 0, 0, 0.1);
		border-color: #ff0000;
		color: #ff0000;
		box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
	}

	.global-message.warning {
		background: rgba(255, 165, 0, 0.1);
		border-color: #ffa500;
		color: #ffa500;
		box-shadow: 0 0 20px rgba(255, 165, 0, 0.3);
	}

	.global-message.success {
		background: rgba(0, 255, 255, 0.1);
		border-color: #00ffff;
		color: #00ffff;
		box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}
</style>
