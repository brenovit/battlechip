BattleChip Improvement Spec
A phased list of visual, behavioural, security and AI improvements for the BattleChip network warfare game (SvelteKit + WebSocket). Suggested order: security and server authority first (powerups multiply the cheating surface), then deployment UX, animations, powerups, and finally the AI player.
1. Deployment UX (drag, drop, rotate)
• Drag and drop with a ghost preview. Dragging a resource from the panel shows a translucent piece snapped to the grid under the cursor. Valid cells glow green, and invalid ones (out of bounds or overlapping) glow red.
• Rotate while dragging. Use R, right-click, or mouse wheel on desktop, and a rotate button or two-finger tap on touch. Use Pointer Events so mouse and touch share one code path.
• Pick up placed pieces. Drag a deployed item to move it, and double-click to rotate it in place. Add a "Reset" and an "Undo".
• Clamp the preview. If the piece would overflow the edge, snap it to the nearest valid position instead of showing nothing.
• Hardware-specific sprites. Draw the real icon at the head cell with a connected segment body, instead of identical green bars. Each type gets a slightly different accent colour.
• Placement feedback. A short "boot-up" animation (scanline wipe plus a flicker) when a piece lands, and a soft click sound.
• Better panel. Show the item's passive and on-destroy effect on hover (tooltip card), so players deploy with strategy in mind. Add a "Random Deploy" that can be re-rolled until confirmed.
2. Combat visuals and animations
• Packet projectile. On firing, a glowing packet travels from the attack grid to the defense grid (SVG or canvas line or particle), then resolves as hit or miss.
• Hit effect. Glitch/RGB-split, a small screen shake, and pixel-particle burst. For a miss, a radar ripple or "timeout" ping.
• Destroyed item effect. The whole item flashes, shows a "SYSTEM FAILURE" label, and then dims with a static texture. Show a toast like [FIREWALL BREACHED].
• Fog of war on the attack grid. Unknown cells show faint noise or flicker. Hits show the hardware icon type only once it's destroyed.
• Turn indicator. A pulse around the active grid, a countdown ring, and a dimmed inactive board.
• Terminal event log. A scrolling feed (> IronOperator46 pinged [4,7] ... MISS) with a typewriter effect, which doubles as the replay log.
• CRT layer. Optional scanlines, vignette, and slight curvature, with a settings toggle for reduced motion and sound.
• Audio. WebAudio synthesized blips (no assets needed), with a mute toggle.
• End screen. Win/lose "system compromised" sequence, stats (accuracy, turns, items lost), and a rematch button.
3. Behaviour improvements
• Turn timer with an auto-skip or random shot on timeout.
• Reconnect support: refresh the page and resume the game via a session token.
• Rematch flow, plus a "player left" state with a grace period.
• Observer view showing only public information (see security below), plus an observer count.
• Quick emotes or a limited chat (prevents free-text abuse).
• Game replay from the move log.
4. Powerups: each item has a good and a bad
Each item gets a passive (benefits the owner while alive) and an on-destroyed effect (benefits the attacker). This keeps risk and reward in the hardware itself.
Item
Passive (good for owner while alive)
On destroyed (bad for owner)
Firewall (3)
Adjacent cells need 2 hits to expose
Reveals 1 random enemy hardware cell on the attacker's grid (blinks)
Database (5)
Crown jewel: attacker needs it to win a bonus
Attacker gets a Data Leak: reveals the row or column count of remaining hardware
Backup (4)
Auto-repair: the first time another item is hit, one damaged cell is restored (once)
Owner loses repair, and the attacker gets +1 score
Server (4)
Owner gets a Ping ability: scan a 3x3 area and learn how many hardware cells are in it (cooldown 4 turns)
Overload: attacker gets an immediate extra shot
IoT Cluster (3)
Botnet spray: once per game, fire 3 random shots in one turn
Hijacked: attacker's next shot also reveals one adjacent cell
Router (2)
Deflect: 25% chance an incoming shot is redirected to a random adjacent cell
Latency: owner's next shot has a 50% chance to land one cell off
Guidelines for the agent
• All effects are defined in one data-driven config (items.ts) with hooks like onHit, onDestroyed, onTurnStart, and getHitsRequired(cell), so adding a new item is a config change.
• All effects resolve on the server, and the server sends only the visible result (see security).
• Every effect has a distinct animation and an event-log line.
• Add a balance pass. Playtest with the bot (section 6) to check no item swings the win rate too far.
• Optional later: an energy resource that fills each turn, for active abilities like "Scan", "EMP", and "Patch".
5. Security and anti-cheat
The golden rule: the server is the only source of truth, and the client is just a display.
1. Never send hidden data. The opponent's grid must never reach your browser. Send only shot results (hit/miss/destroyed(itemType)) and revealed cells. Check the WebSocket frames in dev tools to confirm.
2. Validate placement on the server. Check bounds, no overlap, exact inventory (one of each, correct sizes), integer coordinates, and valid orientation. Lock the board once the player is ready.
3. Validate every action. Check that it is that player's turn, the game is in the right phase, the cell is in range and not already shot, and the sender is not an observer.
4. Identity and sessions. Issue a random secret token per player on join, stored server-side and mapped to a role. Never trust a role, player ID, or "isMyTurn" sent by the client.
5. Game codes. Generate with a cryptographically secure RNG, 6+ characters, with rate limiting on join attempts to stop brute force.
6. Observer ghosting. An observer could relay information to a player. Give observers only public info, ideally on a short delay (for example 1-2 turns), or hide the defensive grids until the game ends.
7. Schema validation. Validate all incoming messages (for example with Zod), with a maximum message size, an allowed-types whitelist, and per-connection rate limiting.
8. Server-side randomness. Random deploy, deflect chance, and the bot's choices must use server RNG, never client RNG.
9. Idempotency. Attach a sequence number to actions, so a replayed or duplicated message can't fire twice.
10. Check the WebSocket origin and sanitise usernames, since they're rendered into the page (XSS).
11. Optional fairness proof. At ready time, store hash(board + salt). At game end, reveal the board and salt so both players can verify it never changed.
12. Idle and disconnect handling. Timeouts so a player can't stall a game forever.
6. AI player plan
Architecture: the bot is a server-side player that implements the same interface as a real socket player and goes through the same validation as everyone else. It never reads the opponent's board, only what a human would see. This keeps it fair and also makes it a great test tool.
1. Bot adapter. Create a Player interface (deploy(), chooseMove(visibleState)), with HumanPlayer (socket) and BotPlayer implementations. Add a "Play vs AI" button with a difficulty choice.
2. Easy: random placement, random unfired shots, with a 600-1500ms "thinking" delay so it feels natural.
3. Medium: hunt/target mode. Use a checkerboard pattern while hunting, and after a hit probe the adjacent cells and follow the line until the item is destroyed.
4. Hard: probability density. For every remaining item size and orientation, count the placements consistent with known hits and misses, and fire at the highest-density cell. This also needs to account for powerup rules (firewall's 2-hit cells, router deflection, revealed cells).
5. Smart placement. Avoid always hugging edges or clustering, and add some spread randomness so it isn't predictable.
6. Ability use. Rules for when to spend Ping, Botnet spray, and so on (for example "use Ping when density is flat").
7. Optional personality. Use an LLM only for flavour, such as trash-talk lines in the event log. Keep move selection algorithmic, because it's faster, cheaper, and stronger than an LLM choosing cells.
8. Simulation harness. Run 10,000 bot-vs-bot games per difficulty, and report average shots-to-win and item win rates. Use this to balance the powerups from section 4.
9. Bot as tester. Use it for end-to-end tests of reconnects, timeouts, and cheating attempts.
Suggested prompt order for Antigravity
1. "Refactor to a server-authoritative model with validation (section 5)."
2. "Move items into a data-driven config with hooks (section 4)."
3. "Implement drag, drop and rotate deployment (section 1)."
4. "Add combat animations and event log (section 2)."
5. "Implement the powerups and balance them using bot simulations."
6. "Add the bot player (section 6)."