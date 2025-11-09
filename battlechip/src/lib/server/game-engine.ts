import type {
	GameState,
	PlayerState,
	Coordinate,
	AttackResult,
	PingSweepResult,
	ResourceType
} from '$lib/types/game';
import {
	HIT_POINTS,
	ADMIN_ACCESS_MULTIPLIER,
	DATABASE_CHAIN_BONUS_MULTIPLIER,
	RESOURCES
} from '$lib/types/game';
import {
	coordinateToString,
	getAdjacentCoordinates,
	allResourcesDestroyed
} from '$lib/utils/grid';

export class GameEngine {
	processAttack(gameState: GameState, attackerIndex: number, coordinate: Coordinate): AttackResult {
		const defenderIndex = attackerIndex === 0 ? 1 : 0;
		const attacker = gameState.players[attackerIndex];
		const defender = gameState.players[defenderIndex];

		const cell = defender.grid.cells[coordinate.row][coordinate.col];
		const coordStr = coordinateToString(coordinate);

		if (cell.status !== 'empty') {
			return {
				coordinate,
				status: 'miss',
				points: 0,
				message: '[ALREADY TARGETED]'
			};
		}

		if (!cell.resourceType) {
			cell.status = 'miss';
			return {
				coordinate,
				status: 'miss',
				points: 0,
				message: '[MISS] - [TIMEOUT]'
			};
		}

		const resource = defender.grid.resources.find((r) => r.type === cell.resourceType);
		if (!resource) {
			return {
				coordinate,
				status: 'miss',
				points: 0,
				message: '[ERROR] - Resource not found'
			};
		}

		resource.hits.add(coordStr);
		cell.status = 'hit';

		let points = HIT_POINTS;
		if (attacker.abilities.adminAccessActive && resource.type === 'database') {
			points = HIT_POINTS * ADMIN_ACCESS_MULTIPLIER;
		}

		attacker.score += points;

		if (resource.hits.size === resource.coordinates.length) {
			resource.isDestroyed = true;
			defender.destroyedResources.add(resource.type);

			for (const coord of resource.coordinates) {
				defender.grid.cells[coord.row][coord.col].status = 'destroyed';
			}

			let destroyPoints = RESOURCES[resource.type].basePoints;

			if (resource.type === 'database' && defender.destroyedResources.has('server')) {
				destroyPoints *= DATABASE_CHAIN_BONUS_MULTIPLIER;
			}

			attacker.score += destroyPoints;

			this.applyResourceDestroyedEffects(attacker, defender, resource.type);

			if (allResourcesDestroyed(defender.grid)) {
				gameState.phase = 'game-over';
				gameState.winner = attackerIndex;
			}

			return {
				coordinate,
				status: 'destroyed',
				resourceType: resource.type,
				points: points + destroyPoints,
				message: `[${RESOURCES[resource.type].name.toUpperCase()} OFFLINE] - [SYSTEM COMPROMISED]`
			};
		}

		return {
			coordinate,
			status: 'hit',
			resourceType: resource.type,
			points,
			message: `[BREACH] - [ACCESS GRANTED]`
		};
	}

	private applyResourceDestroyedEffects(
		attacker: PlayerState,
		defender: PlayerState,
		resourceType: ResourceType
	): void {
		switch (resourceType) {
			case 'firewall':
				attacker.abilities.pingSweepAvailable = true;
				break;
			case 'server':
				attacker.abilities.adminAccessActive = true;
				break;
			case 'iot-cluster':
				defender.abilities.ddosEffectActive = true;
				break;
		}
	}

	processPingSweep(
		gameState: GameState,
		attackerIndex: number,
		coordinate: Coordinate
	): PingSweepResult | null {
		const attacker = gameState.players[attackerIndex];

		if (!attacker.abilities.pingSweepAvailable) {
			return null;
		}

		const defenderIndex = attackerIndex === 0 ? 1 : 0;
		const defender = gameState.players[defenderIndex];

		const adjacentCoords = getAdjacentCoordinates(coordinate);
		const results = new Map<string, 'empty' | 'miss' | 'hit' | 'destroyed'>();

		for (const coord of adjacentCoords) {
			const cell = defender.grid.cells[coord.row][coord.col];
			const coordStr = coordinateToString(coord);

			if (cell.status !== 'empty') {
				results.set(coordStr, cell.status);
			} else if (cell.resourceType) {
				results.set(coordStr, 'hit');
			} else {
				results.set(coordStr, 'empty');
			}
		}

		attacker.abilities.pingSweepAvailable = false;

		return {
			center: coordinate,
			results
		};
	}

	switchTurn(gameState: GameState): void {
		gameState.currentTurn = gameState.currentTurn === 0 ? 1 : 0;
	}

	getCurrentPlayer(gameState: GameState): PlayerState {
		return gameState.players[gameState.currentTurn];
	}

	getOpponent(gameState: GameState): PlayerState {
		return gameState.players[gameState.currentTurn === 0 ? 1 : 0];
	}
}
