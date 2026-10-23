<script lang="ts">
	import Grid from '$lib/components/Grid.svelte';
	import ResourcePlacement from '$lib/components/ResourcePlacement.svelte';
	import { randomLayout, ready, requestRandomDeploy, room, visibleState, mySlot } from '$lib/stores/game';
	import { canPlace, validatePlacements } from '$shared/placement';
	import { placementGrid, ownCells } from '$lib/utils/boards';
	import type { Coord, GridCell, ItemId, Orientation, Placement } from '$lib/types/game';
	import { ITEM_IDS } from '$lib/types/game';

	let placements = $state<Placement[]>([]);
	let selected = $state<ItemId | null>('database');
	let orientation = $state<Orientation>('horizontal');
	let hover = $state<Coord | null>(null);

	const locked = $derived(!!$visibleState?.own?.placements);
	const opponent = $derived($mySlot === null ? null : $room?.players[$mySlot === 0 ? 1 : 0]);

	// Adopt server random-deploy proposals (re-rollable until Ready).
	$effect(() => {
		if ($randomLayout) placements = $randomLayout.map((p) => ({ ...p }));
	});

	const cells = $derived.by<GridCell[][]>(() => {
		if (locked && $visibleState) return ownCells($visibleState);
		const g = placementGrid(placements);
		if (hover && selected) {
			const p: Placement = { item: selected, row: hover.row, col: hover.col, orientation };
			const ok = canPlace(p, placements);
			const size = { database: 5, backup: 4, server: 4, firewall: 3, 'iot-cluster': 3, router: 2 }[selected];
			for (let i = 0; i < size; i++) {
				const r = orientation === 'horizontal' ? hover.row : hover.row + i;
				const c = orientation === 'horizontal' ? hover.col + i : hover.col;
				if (g[r]?.[c]) g[r][c].highlight = ok ? 'valid' : 'invalid';
			}
		}
		return g;
	});

	function place(c: Coord) {
		if (!selected || locked) return;
		const p: Placement = { item: selected, row: c.row, col: c.col, orientation };
		if (!canPlace(p, placements)) return;
		placements = [...placements.filter((x) => x.item !== selected), p];
		selected = ITEM_IDS.find((id) => !placements.some((x) => x.item === id)) ?? null;
	}

	const rotate = () => (orientation = orientation === 'horizontal' ? 'vertical' : 'horizontal');
	const valid = $derived(validatePlacements(placements).ok);
</script>

<svelte:window onkeydown={(e) => e.key.toLowerCase() === 'r' && rotate()} />

<div class="placement">
	<p>Deploy your hardware. Opponent: {opponent?.name ?? '...'} {opponent?.ready ? '(READY)' : ''}</p>
	<div class="layout">
		<ResourcePlacement {placements} {selected} {orientation} {locked} onSelect={(id) => (selected = id)} onRotate={rotate} />
		<Grid {cells} showItems onCellClick={locked ? null : place} onCellHover={(c) => (hover = c)} label="Your network" />
	</div>
	<div class="actions">
		<button disabled={locked} onclick={requestRandomDeploy}>Random deploy</button>
		<button disabled={locked} onclick={() => (placements = [])}>Reset</button>
		<button disabled={locked || !valid} onclick={() => ready(placements)}>Ready</button>
		{#if locked}<span>Board locked. Waiting for opponent...</span>{/if}
	</div>
</div>

<style>
	.placement {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.layout {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	button {
		font-family: inherit;
		background: #001100;
		color: #0f0;
		border: 1px solid #0f0;
		padding: 0.5rem 1rem;
	}
	button:disabled {
		opacity: 0.4;
	}
</style>
