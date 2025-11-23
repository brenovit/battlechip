import { GameState, Player, AttackResult, Coordinate } from '../types.js';
import { coordinateToString, allResourcesDestroyed } from '../utils/grid.js';
import { 
  HIT_POINTS, 
  ADMIN_ACCESS_MULTIPLIER, 
  DATABASE_CHAIN_BONUS_MULTIPLIER, 
  RESOURCES 
} from '../constants.js';

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function processAttack(
  gameState: GameState,
  attackerIndex: number,
  coordinate: Coordinate
): AttackResult {
  const defenderIndex = attackerIndex === 0 ? 1 : 0;
  const attacker = gameState.players[attackerIndex];
  const defender = gameState.players[defenderIndex];

  if (!attacker) {
    return {
      coordinate,
      status: 'miss',
      points: 0,
      message: '[ERROR] - Attacker not found'
    };
  }

  if (!defender) {
    return {
      coordinate,
      status: 'miss',
      points: 0,
      message: '[ERROR] - Defender not found'
    };
  }

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
      message: '[MISSED]'
    };
  }

  const resource = defender.grid.resources.find(r => r.type === cell.resourceType);
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

    if (resource.type === 'firewall') {
      attacker.abilities.pingSweepAvailable = true;
    } else if (resource.type === 'server') {
      attacker.abilities.adminAccessActive = true;
    } else if (resource.type === 'iot-cluster') {
      defender.abilities.ddosEffectActive = true;
    }

    if (allResourcesDestroyed(defender.grid)) {
      gameState.phase = 'game-over';
      gameState.winner = attackerIndex;
    }

    return {
      coordinate,
      status: 'destroyed',
      resourceType: resource.type,
      points: points + destroyPoints,
      message: `[${RESOURCES[resource.type].name.toUpperCase()} OFFLINE] - [SYSTEM COMPROMISED]`,
      destroyedCoordinates: resource.coordinates
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
