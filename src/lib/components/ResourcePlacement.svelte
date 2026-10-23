<script lang="ts">
	import { ITEMS, ITEM_IDS, type ItemId, type Orientation, type Placement } from '$lib/types/game';

	interface Props {
		placements: Placement[];
		selected: ItemId | null;
		orientation: Orientation;
		locked?: boolean;
		onSelect: (id: ItemId) => void;
		onRotate: () => void;
	}
	let { placements, selected, orientation, locked = false, onSelect, onRotate }: Props = $props();
</script>

<div class="panel">
	{#each ITEM_IDS as id}
		{@const item = ITEMS[id]}
		<button
			class="item"
			class:selected={selected === id}
			class:placed={placements.some((p) => p.item === id)}
			style="--accent:{item.accent}"
			disabled={locked}
			onclick={() => onSelect(id)}
			title="{item.passive.name}: {item.passive.description} | On destroyed - {item.onDestroyedEffect.name}: {item.onDestroyedEffect.description}"
		>
			<span>{item.glyph}</span>
			<span>{item.name}</span>
			<span class="size">{'■'.repeat(item.size)}</span>
		</button>
	{/each}
	<button disabled={locked} onclick={onRotate}>Rotate (R): {orientation}</button>
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		min-width: 14rem;
	}
	button {
		font-family: inherit;
		background: #001100;
		color: #0f0;
		border: 1px solid #0a0;
		padding: 0.4rem;
		text-align: left;
	}
	.item {
		display: flex;
		gap: 0.5rem;
		border-left: 4px solid var(--accent);
	}
	.selected {
		background: #003300;
		border-color: var(--accent);
	}
	.placed {
		opacity: 0.6;
	}
	.size {
		margin-left: auto;
		color: var(--accent);
	}
</style>
