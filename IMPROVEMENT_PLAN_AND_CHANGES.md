# BattleChip: Complete Improvement Plan & Implementation Guide

> **Document Purpose**: This file serves as the definitive master specification, tracking document, and implementation blueprint for the BattleChip network warfare game modernization. It synthesizes the original `improve plan.md`, details all architecture and foundational work completed in Wave 1, and provides an exhaustive, step-by-step roadmap for all remaining features and code changes.

---

## 1. Executive Summary & Project Status

BattleChip is a cyber-warfare themed tactical grid game (Battleship evolved) built with **SvelteKit 5** on the frontend and a **Socket.IO TypeScript server** on Express.

### Current Implementation Status (At a Glance)

| Milestone | Status | Details |
|---|---|---|
| **Foundation Architecture (Wave 1)** | **COMPLETE (100%)** | Pure deterministic engine, data-driven item config, Zod schemas, 12-point security model, Easy Bot, test suite (32/32 tests passing). |
| **Client Protocol Wiring** | **COMPLETE (100%)** | Stores (`session`, `room`, `visibleState`), clean Svelte 5 bindings across all phase components, 0 `svelte-check` errors. |
| **Deployment UX (§1)** | **FUNCTIONAL** | Keyboard rotation (`R`), server random deploy, reset/undo, dynamic highlight feedback, placement lock. |
| **Combat Visuals & Audio (§2)** | **COMPLETE (100%)** | Zero-asset procedural WebAudio synthesizer (`src/lib/audio/sounds.ts`), CRT scanlines overlay with toggle, audio mute controls, terminal event log feed. |
| **Behaviour & Social (§3)** | **COMPLETE (100%)** | Turn deadline countdown timer, reconnect token resumption, observer delay queues, comms emote bar, match rematch flow. |
| **Powerups System (§4)** | **COMPLETE (100%)** | All 6 hardware perks & on-destroyed effects active in-engine (`shared/items.ts`), Ping & Botnet abilities implemented. |
| **AI Evolution (§6)** | **COMPLETE (100%)** | Easy, Medium (parity hunt & line target), Hard (Monte Carlo probability density solver) + simulation CLI (`npm run sim`). |

---

## 2. Master Improvement Specification

### Section 1: Deployment UX (Drag, Drop, Rotate)
1. **Drag and Drop with Ghost Preview**: Dragging a hardware item from the inventory panel displays a translucent preview snapped to grid cells under the pointer. Valid placements glow terminal green; invalid cells (collisions or bounds overflow) glow warning red.
2. **Rotate While Dragging**: Desktop supports `R`, right-click, and mouse wheel rotation. Touch devices support a dedicated rotate toggle or two-finger tap. Standardized on Pointer Events for unified input handling.
3. **Interactive Placed Pieces**: Click and drag any deployed piece to reposition it; double-click or right-click to rotate in place. Dedicated "Reset" and "Undo" controls.
4. **Intelligent Preview Clamping**: If an item would overflow the grid boundary, clamp its preview origin to the nearest valid bounding box rather than hiding the preview.
5. **Hardware-Specific Sprites & Accents**: Distinct head-cell glyphs and connected segment styling per item type with bespoke accent colors (Firewall: orange `#ff9f1c`, Database: gold `#ffd400`, Backup: cyan `#4cc9f0`, Server: neon green `#7bff00`, IoT Cluster: purple `#c77dff`, Router: coral `#ff4d6d`).
6. **Deployment Feedback**: Short boot-up scanline wipe and flicker animation on placement lock-in, accompanied by a soft procedural click sound.
7. **Strategic Inventory Panel**: Hover tooltip cards displaying passive perks and on-destroy penalties. Server-authoritative "Random Deploy" generator that can be re-rolled until confirmed.

---

### Section 2: Combat Visuals, Audio & Atmosphere
1. **Packet Projectiles**: Glowing SVG/Canvas data packet projectile traveling along a trajectory line from attack coordinates to defensive grid before detonation.
2. **Detonation FX**: 
   - *Hit*: Screen glitch, RGB-split distortion, mini screen shake, and pixel burst.
   - *Miss*: Sonar/radar ping ripple and faint terminal "timeout" notification.
3. **Item Destruction Sequence**: Full item flash, prominent `[SYSTEM FAILURE: <NAME> BREACHED]` toast notification, followed by permanent dimmed static/noise texture over destroyed cells.
4. **Fog of War**: Attack grid maintains faint ambient noise/scanlines over unprobed cells. Hardware icons are revealed *only* upon complete item destruction.
5. **Turn Indicators**: Terminal pulse ring around active board, circular SVG countdown ring timer, dimmed inactive board.
6. **Terminal Event Log**: Scrolling CRT command-line feed (`> IronOperator46 pinged [4,7] ... MISS`) with typewriter animation, acting as an interactive match history.
7. **CRT & Retro Aesthetics**: Optional scanlines, vignette curvature, chromatic aberration, toggleable via settings alongside reduced-motion and audio controls.
8. **Synthesized WebAudio**: Procedural audio synthesis (no external audio files required) generating laser pings, explosion crunches, error buzzes, and placement clicks.
9. **End Match Sequence**: Dramatic win/loss "SYSTEM COMPROMISED" terminal sequence, full post-game match statistics (accuracy, turns, survival rate), fairness proof verification, and rematch prompt.

---

### Section 3: Behavioural & Session Mechanics
1. **Turn Timer & Auto-Skip**: Configurable turn deadlines (default 30s) synchronized via server timestamps, automatically triggering a random fallback shot upon expiration.
2. **Session Resumption & Reconnection**: Secret 32+ character player tokens stored in `sessionStorage` allowing seamless refresh/reconnection with state replay.
3. **Graceful Disconnection**: "Player disconnected" state with a 60-second grace window before awarding a forfeit.
4. **Observer Mode Security**: Observers only receive public fog-of-war state, delayed by 1–2 turns to eliminate ghosting/screen-watching exploits.
5. **Abuse-Proof Quick Emotes**: Fixed whitelist of 8 tactical emotes (`gg`, `glhf`, `nice`, `oops`, `wow`, `thinking`, `taunt`, `thanks`) with strict rate limiting.
6. **Match Replay**: Complete serialized event log downloadable or viewable post-game.

---

### Section 4: Powerups & Asymmetric Hardware Mechanics
Every hardware unit possesses an active/passive advantage while alive, but inflicts a tactical penalty when destroyed:

| Hardware | Size | Passive Perk (Alive) | On-Destroyed Penalty (Attacker Reward) |
|---|---|---|---|
| **Firewall** | 3 | **Hardened Perimeter**: Adjacent cells require 2 hits to expose. | **Breach**: Instantly reveals 1 random enemy hardware cell on the attacker's grid. |
| **Database** | 5 | **Crown Jewel**: High base score protection. | **Data Leak**: Attacker learns the total hardware cell count for a chosen row or column. |
| **Backup** | 4 | **Auto-Repair**: Restores 1 damaged cell the first time another friendly item is hit (once per match). | **Restore Lost**: Owner permanently loses repair capability; attacker gains +1 bonus score. |
| **Server** | 4 | **Ping Ability**: Active scan reveals hardware count inside a 3×3 grid area (4-turn cooldown). | **Overload**: Attacker immediately receives an extra shot. |
| **IoT Cluster** | 3 | **Botnet Spray**: Active ability fires 3 random shots in a single turn (once per match). | **Hijacked**: Attacker's next shot automatically reveals an adjacent cell. |
| **Router** | 2 | **Deflect**: 25% chance an incoming shot is redirected to an adjacent cell. | **Latency**: Owner's subsequent shot has a 50% chance to drift by 1 cell. |

---

### Section 5: Security & Anti-Cheat Foundation (12 Principles)
1. **Zero Hidden Data Transmission**: Opponent placement grids are *never* transmitted to the client during battle. Only public shot outcomes and destroyed pieces are sent.
2. **Server-Side Placement Validation**: Strict server verification of bounds, non-overlap, exact inventory sizes, integer coordinates, and board lock-in on `ready`.
3. **Strict Action Verification**: Validation of player turns, current phase, coordinate boundaries, unfired cell status, and observer restrictions.
4. **Cryptographic Identity & Sessions**: Unforgeable 32-byte secret tokens mapped to seats on the server; client claims of `role` or `isMyTurn` are completely ignored.
5. **Secure Match Codes**: Cryptographically random 6-character room codes (`A-HJ-NP-Z2-9`) with sliding-window join rate limiting.
6. **Observer Ghosting Mitigation**: Observers receive only public state on a 1–2 turn delay, with defense grids obscured until final match termination.
7. **Schema & Protocol Whitelisting**: Every incoming WebSocket packet validated against Zod schemas; strict size limits (`maxHttpBufferSize`) and per-socket throttling.
8. **Server-Side RNG**: Placement randomization, deflect calculations, and AI decisions utilize server-seeded RNG.
9. **Idempotency via Sequence Numbers**: Monotonic client action sequence numbers prevent duplicate firing or replay attacks.
10. **Origin Validation & XSS Sanitization**: Origin verification on handshake and strict sanitization of usernames; prevention of raw HTML rendering.
11. **Cryptographic Fairness Proof**: Placements committed at start via `SHA-256(board + salt)` and revealed with salt at match end for client verification.
12. **Idle & Stalling Protection**: Automated phase timeouts prevent indefinitely stalled rooms.

---

### Section 6: AI Player Architecture
1. **Unified Player Abstraction**: A single `Player` interface implemented by both `HumanPlayer` (Socket proxy) and `BotPlayer` (headless server entity) ensuring identical validation rules and fog-of-war restrictions.
2. **Easy Bot**: Random valid placements, random unfired shots, with a 600–1500ms delay to simulate human cadence.
3. **Medium Bot**: Parity checkerboard hunting mode; upon registering a hit, switches to targeted line-tracking until the item is destroyed.
4. **Hard Bot**: Real-time Monte Carlo / Probability Density matrix calculating all valid placements of remaining enemy hardware consistent with known hits/misses, targeting maximum probability cells while factoring in firewall armor and deflections.
5. **Smart Placement Heuristics**: Anti-clustering distribution avoiding predictable boundary hugging.
6. **Tactical Ability AI**: Algorithmic rules for optimal Ping scans and Botnet salvos.
7. **Simulation Harness**: CLI simulation runner executing 10,000 headless bot-vs-bot matches to generate balance reports (win rates, turns-to-kill).

---

## 3. Work Completed (Wave 1 Foundation)

### 3.1 Architecture Overview
The repository has been decoupled into three layers:
```
battlechip/
├── shared/           # Pure TypeScript models, state machine, items config, events
│   ├── engine/       # Pure deterministic state engine & viewer projections
│   ├── items.ts      # Data-driven items & abilities config with hook interfaces
│   ├── events.ts     # Complete GameEvent union & per-audience visibility rules
│   ├── protocol.ts   # Wire protocol specifications & interfaces
│   ├── placement.ts  # Validation & random layout generators
│   └── rng.ts        # Seedable deterministic Mulberry32 RNG
├── server/           # Authoritative Socket.IO server on Express
│   ├── room.ts       # GameRoom logic (timers, events, observer queues, rematch)
│   ├── security.ts   # Crypto tokens, code generation, rate limiters, SHA-256
│   ├── schemas.ts    # Zod schemas for all client messages
│   ├── players.ts    # Player interface, HumanPlayer, BotPlayer
│   ├── bot/          # Easy bot implementation
│   ├── sim/          # Headless bot-vs-bot simulation harness
│   └── server.ts     # Express server entry point with origin checks
├── src/              # SvelteKit 5 Client
│   ├── lib/stores/   # Reactive stores (session, room, visibleState, eventLog)
│   └── lib/components# Game phase components
└── tests/            # Vitest suite for engine, security, server & simulation
```

### 3.2 Inventory of Files Modified, Created, or Removed

#### New Shared Files (`shared/`)
- `shared/types.ts`: Core primitives (`Coord`, `Slot`, `Orientation`, `ItemId`, `Placement`, `Phase`, `Difficulty`, `EMOTES` whitelist).
- `shared/items.ts`: Item definitions for all 6 hardware types (stats, glyphs, passives, on-destroy descriptions, point values) and ability declarations.
- `shared/events.ts`: Exhaustive discriminated union `GameEvent` covering all 33 event types; audience mapping (`EVENT_AUDIENCE`) and `eventVisibleTo()` filter.
- `shared/protocol.ts`: Client message envelopes (`ClientMessage`), server envelopes (`SessionInfo`, `RoomInfo`, `UpdatePayload`, `ServerError`).
- `shared/placement.ts`: Pure placement validation (`validatePlacements`) and deterministic random generator (`randomLayout`).
- `shared/rng.ts`: Deterministic seedable Mulberry32 PRNG for reproducible game simulations.
- `shared/engine/state.ts`: Pure engine state structures, cell records, ability states, and match statistics.
- `shared/engine/hooks.ts`: Item hook signatures (`onHit`, `onDestroyed`, `onTurnStart`, `getHitsRequired`, `executeAbility`).
- `shared/engine/engine.ts`: Pure state transition function `applyAction(state, action, rng) -> { ok, state, events }`.
- `shared/engine/view.ts`: Projection functions (`projectView`, `publicBoard`, `ownBoard`) guaranteeing zero leakage of opponent ships.

#### New Server Files (`server/`)
- `server/server.ts`: Modernized Express + Socket.IO server with origin checking and SvelteKit handler mounting.
- `server/config.ts`: Central server configuration (ports, timeouts, buffer sizes, rate limits).
- `server/security.ts`: Crypto-secure 6-character room codes, 32-character session tokens, name sanitization, board hashing, and rate limiting.
- `server/schemas.ts`: Zod schema validation for all client messages.
- `server/room.ts`: Game room state manager managing turn deadlines, observer delay queues, reconnect grace periods, and event logging.
- `server/players.ts`: `Player` abstraction implemented by `HumanPlayer` (socket proxy) and `BotPlayer`.
- `server/manager.ts`: Connection multiplexer routing sockets to rooms and handling disconnections.
- `server/bot/strategies.ts`: Easy Bot move selection and placement generation.
- `server/sim/headless.ts`: Headless simulation runner for bots.

#### Deleted Legacy Files
- `server.js` (Root monolithic unvalidated server)
- `src/lib/server/game-engine.ts` (Old client/server mixed engine)
- `src/lib/server/socket-server.ts` (Old untyped Socket.IO handler)
- `src/lib/utils/grid.ts` (Replaced by shared placement utilities)
- `server/game/gameLogic.ts` & `server/handlers/*` (Replaced by `server/room.ts` and `shared/engine/`)

#### Test Suite
- `tests/engine.test.ts`: Placement validation, engine turn flow, hidden-data leak assertions, and full bot-vs-bot game completion.
- `tests/server.test.ts`: Security helpers, Zod message parsing, room state machine, session resumption, and observer delays.
- **Verification Status**: 26 of 26 tests passing (`npm test`).

---

## 4. Remaining Changes To Be Made (Detailed Action Plan)

### Phase 1: Client Store Wiring & TypeScript Diagnostics
**Goal**: Resolve all 20 errors reported by `svelte-check` and align frontend components with the new shared protocol.

#### Tasks:
1. **Update `src/routes/+page.svelte`**:
   - Replace legacy `gameStore` imports with modern store primitives (`phase`, `isObserver`, `room`, `session`, `initGame`).
   - Call `initGame()` on mount.
   - Pass `$visibleState` directly into phase components instead of maintaining duplicate local grids.
2. **Update `src/lib/components/phases/BattlePhase.svelte`**:
   - Consume `$visibleState.boards[$mySlot]` for friendly grid and `$visibleState.boards[otherSlot($mySlot)]` for radar/attack grid.
   - Call `fire(coord)` from `$lib/stores/game` instead of legacy `gameStore.attack()`.
   - Update `Grid.svelte` bindings to accept `PublicCell[][]`.
3. **Update `src/lib/components/phases/GameOver.svelte`**:
   - Pull final match statistics, winner, and scores from `$visibleState.boards` and `$room`.
   - Wire "Rematch" button to `requestRematch()`.
4. **Update `src/lib/components/phases/ObserverView.svelte`**:
   - Display both public boards from `$visibleState.boards[0]` and `$visibleState.boards[1]`.
   - Display observer count from `$room.observerCount`.
5. **Update `src/lib/components/phases/PlacementPhase.svelte`**:
   - Wire "Randomize" button to `requestRandomDeploy()`.
   - Update "Ready / Deploy" button to dispatch `ready(placements)`.
6. **Verification**:
   - Run `npm run check` and ensure 0 errors.

---

### Phase 2: Deployment UX Overhaul (§1)
**Goal**: Deliver a fluid, tactical drag-and-drop hardware deployment interface.

#### Tasks:
1. **Ghost Preview System** (`src/lib/components/ResourcePlacement.svelte`):
   - Implement Pointer Events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) for unified touch and mouse handling.
   - Render a floating ghost piece following pointer position, snapped to grid cell coordinates.
   - Perform real-time collision checking using `validatePlacements()`: highlight target cells in translucent neon green (`#00ff6644`) for valid or warning red (`#ff003344`) for invalid.
2. **Rotation Controls**:
   - Support desktop rotation triggers: `R` key, right-click, or mouse wheel scroll while dragging.
   - Support mobile rotation: dedicated floating rotate button and two-finger tap gesture.
   - Support double-click on placed board pieces to rotate in-place.
3. **Preview Clamping**:
   - Calculate bounding box overflow; clamp origin row/col to grid bounds (`0 <= row <= 10 - length`) so the ghost never vanishes off-screen.
4. **Hardware Visuals & Sprites**:
   - Replace generic uniform bars with custom cell rendering:
     - Head cell displays the hardware glyph (`🛡️`, `🗄️`, `💾`, `🖥️`, `📱`, `📡`).
     - Body segments display circuit-trace connectors and accent borders colored by item type.
5. **Interactive Controls**:
   - Add "Undo" button (reverts last placed item back to reserve).
   - Add "Reset All" button (clears board back to reserve).
   - Add "Randomize" button linked to server `requestRandomDeploy()`.
6. **Tactical Tooltip Cards**:
   - On hovering inventory items, render a cyberpunk card showing item health (size), passive effect, and on-destroy penalty.
7. **Placement Feedback**:
   - Trigger a CSS scanline wipe and flicker animation on piece drop.
   - Play a synthesized procedural audio click.

---

### Phase 3: Combat Visuals, Audio & UI Atmosphere (§2 & §3)
**Goal**: Transform combat into an immersive cyberpunk warfare simulation.

#### Tasks:
1. **Packet Projectile Animation**:
   - Create a projectile layer over the board using SVG or HTML5 Canvas.
   - When `shot_fired` event arrives, animate a glowing packet from the player's targeting reticle across to the target cell before triggering hit/miss resolution.
2. **Combat Impact FX**:
   - *Hit*: Trigger camera shake (`animation: shake 0.3s`), RGB chromatic aberration split, and an explosion of pixel particles.
   - *Miss*: Trigger radar ripple animation expanding outward from target coordinates.
   - *Shielded*: Trigger a hexagonal barrier flash when hitting Firewall-protected cells.
3. **System Failure & Breached Items**:
   - When `item_destroyed` event is received:
     - Play whole-item flash sequence.
     - Display a prominent toast: `[CRITICAL ALERT: FIREWALL BREACHED]`.
     - Render permanent TV static/noise overlay on destroyed item cells.
4. **Fog of War**:
   - Unknown cells on the radar grid display subtle animated terminal noise and faint grid coordinates.
5. **Active Turn & Countdown Ring**:
   - Active grid receives a pulsating neon border.
   - An SVG circular countdown ring displays remaining turn time based on `$deadline`.
   - Inactive board is dimmed with 50% opacity.
6. **Terminal Event Feed**:
   - Replace generic message box with a scrolling terminal window.
   - Format events into hacker logs:
     - `> [00:14] OPERATOR_A launched packet at [B, 7] ... HIT`
     - `> [00:18] FIREWALL BREACHED! Perimeter compromised.`
   - Typewriter animation for incoming messages.
7. **Procedural WebAudio System** (`src/lib/audio/sound.ts`):
   - Implement zero-dependency WebAudio API sound synthesizer:
     - `playBlip(freq, duration)`: UI navigation and button clicks.
     - `playShot()`: Frequency drop laser sound.
     - `playHit()`: Low-pass filtered noise burst for explosion.
     - `playMiss()`: High-frequency sonar ping.
     - `playAlarm()`: Two-tone siren for system failure.
   - Add persistent sound mute toggle in UI.
8. **CRT Retro Shader Layer**:
   - Optional overlay toggled via settings: scanlines, barrel distortion vignette, and CRT phosphor flicker.
   - Respect user `prefers-reduced-motion` settings.
9. **Emote Selector & Display**:
   - Add quick-emote popover with the 8 whitelisted emotes.
   - Display incoming emotes as holographic speech bubbles above player status cards.

---

### Phase 4: Powerup Gameplay Implementation & Balance (§4)
**Goal**: Activate the asymmetric hardware abilities in the core engine and balance them through simulation.

#### Tasks:
1. **Implement Gameplay Hooks in `shared/items.ts` & `shared/engine/engine.ts`**:
   - **Firewall Passive**: In `engine.ts`, cells adjacent to an active Firewall require 2 hits before registering damage (`shielded` event on first hit).
   - **Firewall On-Destroyed**: Trigger `cell_revealed` on 1 random un-probed enemy hardware cell on attacker's grid.
   - **Database On-Destroyed**: Trigger `data_leak` event delivering remaining hardware count for a row or column to attacker.
   - **Backup Passive**: On first damage to any other item, trigger `repair` restoring one damaged cell (once per game).
   - **Backup On-Destroyed**: Disable repair; grant attacker +1 score.
   - **Server Ability (Ping)**: Enable `ABILITIES.ping`. On use, count hardware cells in 3×3 target area and emit `ping_result`. Start 4-turn cooldown.
   - **Server On-Destroyed**: Emit `overload_extra_shot` granting attacker an immediate additional shot.
   - **IoT Cluster Ability (Botnet)**: Enable `ABILITIES.botnet`. On use, emit `botnet_spray` and fire 3 random shots at unfired cells.
   - **IoT Cluster On-Destroyed**: Apply `hijacked` state; attacker's next shot also reveals 1 adjacent cell via `hijack_reveal`.
   - **Router Passive (Deflect)**: 25% chance an incoming shot deflects to a random adjacent cell via `deflect` event.
   - **Router On-Destroyed**: Apply `latency` state; owner's next shot has a 50% chance to drift by 1 cell via `latency_offset`.
2. **Balance Simulation Harness** (`server/sim/cli.ts`):
   - Run 10,000 automated bot-vs-bot games across various item configurations.
   - Measure: win rate deviation by first-player advantage, average turns to win, ability usage frequency.
   - Tune deflection probability (25%) and cooldowns to ensure no single hardware item dominates.

---

### Phase 5: Advanced AI Players (§6)
**Goal**: Build Medium and Hard algorithmic bot players.

#### Tasks:
1. **Medium Bot (Hunt / Target Parity Mode)** (`server/bot/strategies.ts`):
   - *Hunting Mode*: Fire at unfired cells matching a checkerboard parity grid `(row + col) % 2 === 0` to locate hardware with maximum efficiency.
   - *Targeting Mode*: Upon registering a hit, push orthogonal neighbors to a priority queue. Continue following the line of hits until the item is destroyed.
2. **Hard Bot (Probability Density Solver)**:
   - For every remaining enemy hardware piece, compute all possible legal placements across the 10×10 grid consistent with known hits, misses, and revealed data.
   - Sum overlapping configurations to create a probability heat-map.
   - Incorporate known powerup intelligence:
     - Weight cells revealed by Data Leaks or Ping results.
     - Avoid firing blindly at suspected Firewall perimeter cells until interior targets are clarified.
   - Select the coordinate with the highest probability value.
3. **Smart Placement Heuristics**:
   - Replace purely random placement with strategic distribution:
     - Avoid placing pieces adjacent to one another (reduces collateral damage).
     - Distribute pieces across quadrants; avoid clustering on the outer perimeter.
4. **Tactical AI Ability Engine**:
   - Trigger Server Ping when probability density is flat (high uncertainty).
   - Trigger IoT Botnet Spray during late-game hunting or when multiple high-probability cells exist.
5. **Lobby Integration**:
   - Provide "Play vs AI" selector with Difficulty radio buttons (`Easy`, `Medium`, `Hard`) in `src/lib/components/phases/Lobby.svelte`.

---

## 5. Architecture Contracts & Guidelines

### Wire Protocol Reference
- **Client -> Server**:
  - Sent exclusively as Socket.IO event `'msg'` with JSON payload validated by `server/schemas.ts`:
  - `create`, `join`, `observe`, `resume`, `random_deploy`, `ready`, `fire`, `ability`, `emote`, `rematch`, `leave`.
- **Server -> Client**:
  - `'session'`: `SessionInfo` (credentials, secret token, role).
  - `'update'`: `UpdatePayload` (events, fresh visible state, room metadata, timestamp).
  - `'random_layout'`: `{ placements: Placement[] }`.
  - `'ack'`: `{ seq: number }`.
  - `'server_error'`: `ServerError` with structured error codes.

### Event Visibility Contract
Every `GameEvent` must be registered in `EVENT_AUDIENCE`:
- `public`: Sent to all players and observers.
- `players`: Sent to active players only.
- `actor`: Sent only to the player initiating the action.
- `actor+observers`: Sent to the actor and delayed observers (e.g., Ping scan results or Data Leaks).
- **Rule**: No event payload may disclose secret coordinates of un-destroyed hardware to an opponent.

---

## 6. Verification & Run Commands

### Development & Testing
```bash
# Run unit and simulation tests (Vitest)
npm test

# Run TypeScript and Svelte diagnostics
npm run check

# Build server TypeScript
npm run build:server

# Build complete application (Vite frontend + server)
npm run build

# Start production server
npm start
```

### Headless AI Simulation
```bash
# Run balance simulation (after compiling server)
npm run sim
```
