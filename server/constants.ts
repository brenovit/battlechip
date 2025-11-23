import { ResourceDefinition } from './types.js';

export const GRID_SIZE = 10;
export const HIT_POINTS = 10;
export const ADMIN_ACCESS_MULTIPLIER = 2;
export const DATABASE_CHAIN_BONUS_MULTIPLIER = 2;

export const RESOURCES: Record<string, ResourceDefinition> = {
  'database': { type: 'database', name: 'Database', size: 5, basePoints: 500 },
  'backup': { type: 'backup', name: 'Backup', size: 4, basePoints: 300 },
  'server': { type: 'server', name: 'Server', size: 4, basePoints: 250 },
  'firewall': { type: 'firewall', name: 'Firewall', size: 3, basePoints: 150 },
  'iot-cluster': { type: 'iot-cluster', name: 'IoT Cluster', size: 3, basePoints: 100 },
  'router': { type: 'router', name: 'Router', size: 2, basePoints: 50 }
};
