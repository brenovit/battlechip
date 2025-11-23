import { Grid, Coordinate, ResourcePlacement, Cell } from '../types.js';
import { GRID_SIZE, RESOURCES } from '../constants.js';

export function createEmptyGrid(): Grid {
  const cells:Cell[][] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    cells[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      cells[row][col] = {
        coordinate: { row, col },
        status: 'empty' as const
      };
    }
  }
  return { cells, resources: [] };
}

export function coordinateToString(coord: Coordinate): string {
  return `${coord.row},${coord.col}`;
}

export function canPlaceResource(
  grid: Grid,
  start: Coordinate,
  size: number,
  orientation: 'horizontal' | 'vertical'
): boolean {
  for (let i = 0; i < size; i++) {
    const coord = orientation === 'horizontal'
      ? { row: start.row, col: start.col + i }
      : { row: start.row + i, col: start.col };

    if (coord.row < 0 || coord.row >= GRID_SIZE || coord.col < 0 || coord.col >= GRID_SIZE) {
      return false;
    }

    if (grid.cells[coord.row][coord.col].resourceType) {
      return false;
    }
  }
  return true;
}

export function placeResource(
  grid: Grid,
  type: string,
  start: Coordinate,
  orientation: 'horizontal' | 'vertical'
): boolean {
  const resource = RESOURCES[type];
  if (!canPlaceResource(grid, start, resource.size, orientation)) {
    return false;
  }

  const coordinates:any[] = [];
  for (let i = 0; i < resource.size; i++) {
    const coord = orientation === 'horizontal'
      ? { row: start.row, col: start.col + i }
      : { row: start.row + i, col: start.col };
    coordinates.push(coord);
    grid.cells[coord.row][coord.col].resourceType = type;
  }

  grid.resources.push({
    type,
    coordinates,
    hits: new Set(),
    isDestroyed: false
  });
  return true;
}

export function allResourcesPlaced(grid: Grid): boolean {
  return grid.resources.length === Object.keys(RESOURCES).length;
}

export function allResourcesDestroyed(grid: Grid): boolean {
  return grid.resources.every(r => r.isDestroyed);
}
