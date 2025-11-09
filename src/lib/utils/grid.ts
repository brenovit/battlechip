import type {
	Coordinate,
	Grid,
	Cell,
	PlacedResource,
	ResourceType,
	Orientation
} from '$lib/types/game';
import { GRID_SIZE, RESOURCES } from '$lib/types/game';

export function createEmptyGrid(): Grid {
	const cells: Cell[][] = [];
	for (let row = 0; row < GRID_SIZE; row++) {
		cells[row] = [];
		for (let col = 0; col < GRID_SIZE; col++) {
			cells[row][col] = {
				coordinate: { row, col },
				status: 'empty'
			};
		}
	}
	return { cells, resources: [] };
}

export function coordinateToString(coord: Coordinate): string {
	return `${coord.row},${coord.col}`;
}

export function stringToCoordinate(str: string): Coordinate {
	const [row, col] = str.split(',').map(Number);
	return { row, col };
}

export function isValidCoordinate(coord: Coordinate): boolean {
	return coord.row >= 0 && coord.row < GRID_SIZE && coord.col >= 0 && coord.col < GRID_SIZE;
}

export function getResourceCoordinates(
	start: Coordinate,
	size: number,
	orientation: Orientation
): Coordinate[] {
	const coordinates: Coordinate[] = [];
	for (let i = 0; i < size; i++) {
		const coord =
			orientation === 'horizontal'
				? { row: start.row, col: start.col + i }
				: { row: start.row + i, col: start.col };
		coordinates.push(coord);
	}
	return coordinates;
}

export function canPlaceResource(
	grid: Grid,
	start: Coordinate,
	size: number,
	orientation: Orientation
): boolean {
	const coordinates = getResourceCoordinates(start, size, orientation);

	for (const coord of coordinates) {
		if (!isValidCoordinate(coord)) {
			return false;
		}

		const cell = grid.cells[coord.row][coord.col];
		if (cell.resourceType) {
			return false;
		}
	}

	return true;
}

export function placeResource(
	grid: Grid,
	type: ResourceType,
	start: Coordinate,
	orientation: Orientation
): boolean {
	const resource = RESOURCES[type];
	if (!canPlaceResource(grid, start, resource.size, orientation)) {
		return false;
	}

	const coordinates = getResourceCoordinates(start, resource.size, orientation);
	const placedResource: PlacedResource = {
		type,
		coordinates,
		hits: new Set(),
		isDestroyed: false
	};

	for (const coord of coordinates) {
		grid.cells[coord.row][coord.col].resourceType = type;
	}

	grid.resources.push(placedResource);
	return true;
}

export function getAdjacentCoordinates(coord: Coordinate): Coordinate[] {
	const adjacent: Coordinate[] = [];
	for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
		for (let colOffset = -1; colOffset <= 1; colOffset++) {
			const newCoord = {
				row: coord.row + rowOffset,
				col: coord.col + colOffset
			};
			if (isValidCoordinate(newCoord)) {
				adjacent.push(newCoord);
			}
		}
	}
	return adjacent;
}

export function allResourcesPlaced(grid: Grid): boolean {
	return grid.resources.length === Object.keys(RESOURCES).length;
}

export function allResourcesDestroyed(grid: Grid): boolean {
	return grid.resources.every((r) => r.isDestroyed);
}
