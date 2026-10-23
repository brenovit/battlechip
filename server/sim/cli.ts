/**
 * CLI Simulation Harness (Sections 4.5 & 6.8).
 * Runs headless bot-vs-bot matches and reports telemetry, win rates, and average turns.
 *
 * Usage:
 *   npm run sim [matchCount=100] [p1=easy|medium|hard] [p2=easy|medium|hard]
 */
import { easyBot, getStrategy, hardBot, mediumBot, type BotStrategy } from '../bot/strategies.js';
import { runHeadlessGame } from './headless.js';
import type { Difficulty } from '../../shared/types.js';

const countArg = parseInt(process.argv[2] ?? '100', 10);
const p1Diff: Difficulty = (process.argv[3] as Difficulty) ?? 'medium';
const p2Diff: Difficulty = (process.argv[4] as Difficulty) ?? 'easy';

const p1Bot = getStrategy(p1Diff);
const p2Bot = getStrategy(p2Diff);

console.log(`\n========================================================`);
console.log(`  BATTLECHIP AI BALANCE SIMULATION HARNESS`);
console.log(`  Running ${countArg} games: [${p1Diff.toUpperCase()}] vs [${p2Diff.toUpperCase()}]`);
console.log(`========================================================\n`);

let p1Wins = 0;
let p2Wins = 0;
let totalTurns = 0;
let totalShots = 0;
let abilityCount = 0;

const startTime = Date.now();

for (let i = 0; i < countArg; i++) {
	const result = runHeadlessGame([p1Bot, p2Bot], i + 1000);
	if (result.winner === 0) p1Wins++;
	else if (result.winner === 1) p2Wins++;
	totalTurns += result.turns;

	const shots = result.events.filter((e) => e.type === 'shot_fired').length;
	totalShots += shots;

	const abilities = result.events.filter((e) => e.type === 'ability_used').length;
	abilityCount += abilities;
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
const avgTurns = (totalTurns / countArg).toFixed(1);
const avgShots = (totalShots / countArg).toFixed(1);
const avgAbilities = (abilityCount / countArg).toFixed(1);

console.log(`[RESULTS - ${countArg} MATCHES in ${elapsed}s]`);
console.log(`  Player 0 (${p1Diff.toUpperCase()}): ${p1Wins} wins (${((p1Wins / countArg) * 100).toFixed(1)}%)`);
console.log(`  Player 1 (${p2Diff.toUpperCase()}): ${p2Wins} wins (${((p2Wins / countArg) * 100).toFixed(1)}%)`);
console.log(`  Average Turns: ${avgTurns}`);
console.log(`  Average Shots: ${avgShots}`);
console.log(`  Average Abilities Used Per Game: ${avgAbilities}`);
console.log(`========================================================\n`);
