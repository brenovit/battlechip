/** Zod schemas for every client message (whitelist via discriminated union, strict objects). */
import { z } from 'zod';
import { DIFFICULTIES, EMOTES, GRID_SIZE } from '../shared/types.js';
import { ITEM_IDS } from '../shared/items.js';
import type { ClientMessage } from '../shared/protocol.js';

const coord = z.strictObject({
	row: z.number().int().min(0).max(GRID_SIZE - 1),
	col: z.number().int().min(0).max(GRID_SIZE - 1)
});
const seq = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const name = z.string().min(1).max(40);
const code = z
	.string()
	.min(4)
	.max(12)
	.transform((s) => s.toUpperCase())
	.pipe(z.string().regex(/^[A-Z0-9]+$/));

const placement = z.strictObject({
	item: z.enum(ITEM_IDS as [string, ...string[]]),
	row: z.number().int(),
	col: z.number().int(),
	orientation: z.enum(['horizontal', 'vertical'])
});

export const clientMessageSchema = z.discriminatedUnion('type', [
	z.strictObject({
		type: z.literal('create'),
		name,
		vsAi: z.boolean().optional(),
		difficulty: z.enum(DIFFICULTIES as [string, ...string[]]).optional()
	}),
	z.strictObject({ type: z.literal('join'), code, name }),
	z.strictObject({ type: z.literal('observe'), code }),
	z.strictObject({ type: z.literal('resume'), token: z.string().min(16).max(64) }),
	z.strictObject({ type: z.literal('random_deploy') }),
	z.strictObject({ type: z.literal('ready'), seq, placements: z.array(placement).max(ITEM_IDS.length) }),
	z.strictObject({ type: z.literal('fire'), seq, target: coord }),
	z.strictObject({ type: z.literal('ability'), seq, ability: z.string().max(32), target: coord.optional() }),
	z.strictObject({ type: z.literal('emote'), emote: z.enum(EMOTES as unknown as [string, ...string[]]) }),
	z.strictObject({ type: z.literal('rematch') }),
	z.strictObject({ type: z.literal('leave') })
]);

export function parseClientMessage(raw: unknown): { ok: true; msg: ClientMessage } | { ok: false; error: string } {
	const r = clientMessageSchema.safeParse(raw);
	if (!r.success) return { ok: false, error: r.error.issues.map((i) => i.message).join('; ').slice(0, 200) };
	return { ok: true, msg: r.data as ClientMessage };
}
