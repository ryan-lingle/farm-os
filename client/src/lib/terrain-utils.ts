/**
 * Terrain utilities for working with elevation data.
 * Includes Terrarium tile decoding and elevation analysis.
 */

import type { TopographyContext } from './chat-bridge';

/**
 * Decode Terrarium elevation from RGB values.
 * Terrarium encoding: elevation = (R * 256 + G + B / 256) - 32768
 *
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 * @returns Elevation in meters
 */
export function terrariumToElevation(r: number, g: number, b: number): number {
  return (r * 256 + g + b / 256) - 32768;
}

/**
 * Get tile coordinates for a lat/lng at a given zoom level.
 */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; z: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y, z: zoom };
}

/**
 * Get the pixel coordinates within a tile for a lat/lng.
 */
export function latLngToPixel(
  lat: number,
  lng: number,
  zoom: number,
  tileSize: number = 256
): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  const x = (lng + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;

  const px = Math.floor((x - Math.floor(x)) * tileSize);
  const py = Math.floor((y - Math.floor(y)) * tileSize);

  return { px, py };
}

/**
 * Fetch a terrain tile and return its image data.
 */
export async function fetchTerrainTile(
  x: number,
  y: number,
  z: number
): Promise<ImageData | null> {
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch terrain tile: ${url}`);
      return null;
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Draw to canvas to get pixel data
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0);
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } catch (error) {
    console.error('Error fetching terrain tile:', error);
    return null;
  }
}

/**
 * Get elevation at a specific pixel in an ImageData.
 */
export function getElevationFromImageData(
  imageData: ImageData,
  px: number,
  py: number
): number {
  const idx = (py * imageData.width + px) * 4;
  const r = imageData.data[idx];
  const g = imageData.data[idx + 1];
  const b = imageData.data[idx + 2];
  return terrariumToElevation(r, g, b);
}

/**
 * Calculate slope between two points.
 * @returns Slope as a percentage (rise/run * 100)
 */
export function calculateSlope(
  elevation1: number,
  elevation2: number,
  distance: number // in meters
): number {
  if (distance === 0) return 0;
  return Math.abs(elevation2 - elevation1) / distance * 100;
}

/**
 * Calculate aspect (compass direction of steepest descent) from elevation grid.
 * @returns Aspect as compass direction
 */
export function calculateAspect(
  elevN: number,
  elevS: number,
  elevE: number,
  elevW: number
): 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'flat' {
  const dNS = elevN - elevS; // Positive = slopes south
  const dEW = elevE - elevW; // Positive = slopes west

  // If flat (minimal gradient)
  if (Math.abs(dNS) < 0.1 && Math.abs(dEW) < 0.1) {
    return 'flat';
  }

  // Calculate angle in degrees (0 = East, counter-clockwise)
  const angle = Math.atan2(dNS, dEW) * 180 / Math.PI;

  // Convert to compass (0 = North, clockwise)
  // Aspect is the direction water flows (steepest descent)
  const compassAngle = (90 - angle + 360) % 360;

  // Convert to 8 compass directions
  if (compassAngle >= 337.5 || compassAngle < 22.5) return 'N';
  if (compassAngle >= 22.5 && compassAngle < 67.5) return 'NE';
  if (compassAngle >= 67.5 && compassAngle < 112.5) return 'E';
  if (compassAngle >= 112.5 && compassAngle < 157.5) return 'SE';
  if (compassAngle >= 157.5 && compassAngle < 202.5) return 'S';
  if (compassAngle >= 202.5 && compassAngle < 247.5) return 'SW';
  if (compassAngle >= 247.5 && compassAngle < 292.5) return 'W';
  return 'NW';
}

/**
 * Calculate distance between two lat/lng points in meters (Haversine).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Sample elevation data from terrain tiles for a given bounds.
 * Returns a grid of elevation values.
 */
export async function sampleElevationGrid(
  bounds: Bounds,
  gridSize: number = 10 // 10x10 grid = 100 samples
): Promise<{
  data: number[][];
  resolution: number;
} | null> {
  // Use zoom level 14 for ~10m resolution
  const zoom = 14;

  // Calculate grid spacing
  const latStep = (bounds.north - bounds.south) / (gridSize - 1);
  const lngStep = (bounds.east - bounds.west) / (gridSize - 1);

  // Calculate resolution in meters (approximate)
  const resolution = haversineDistance(
    bounds.south,
    bounds.west,
    bounds.south + latStep,
    bounds.west
  );

  // Cache for fetched tiles
  const tileCache = new Map<string, ImageData | null>();

  // Sample grid
  const data: number[][] = [];

  for (let row = 0; row < gridSize; row++) {
    const rowData: number[] = [];
    // Start from north (top of grid)
    const lat = bounds.north - row * latStep;

    for (let col = 0; col < gridSize; col++) {
      const lng = bounds.west + col * lngStep;

      // Get tile and pixel coordinates
      const tile = latLngToTile(lat, lng, zoom);
      const tileKey = `${tile.z}/${tile.x}/${tile.y}`;

      // Fetch tile if not cached
      if (!tileCache.has(tileKey)) {
        const imageData = await fetchTerrainTile(tile.x, tile.y, tile.z);
        tileCache.set(tileKey, imageData);
      }

      const imageData = tileCache.get(tileKey);
      if (!imageData) {
        rowData.push(0); // Default if tile failed
        continue;
      }

      // Get pixel within tile
      const pixel = latLngToPixel(lat, lng, zoom);
      const elevation = getElevationFromImageData(imageData, pixel.px, pixel.py);
      rowData.push(elevation);
    }

    data.push(rowData);
  }

  return { data, resolution };
}

/**
 * Analyze elevation grid to compute slope and aspect statistics.
 */
export function analyzeElevationGrid(
  grid: number[][],
  resolution: number // meters between samples
): {
  elevationRange: { min: number; max: number };
  slopeAnalysis: {
    avgSlopePercent: number;
    maxSlopePercent: number;
    predominantAspect: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'flat';
  };
} {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;

  if (rows === 0 || cols === 0) {
    return {
      elevationRange: { min: 0, max: 0 },
      slopeAnalysis: { avgSlopePercent: 0, maxSlopePercent: 0, predominantAspect: 'flat' },
    };
  }

  // Find min/max elevation
  let min = Infinity;
  let max = -Infinity;
  for (const row of grid) {
    for (const elev of row) {
      if (elev < min) min = elev;
      if (elev > max) max = elev;
    }
  }

  // Calculate slopes and aspects for interior points
  const slopes: number[] = [];
  const aspectCounts: Record<string, number> = {};

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const elevN = grid[r - 1][c];
      const elevS = grid[r + 1][c];
      const elevE = grid[r][c + 1];
      const elevW = grid[r][c - 1];

      // Calculate slope in both directions
      const slopeNS = calculateSlope(elevN, elevS, resolution * 2);
      const slopeEW = calculateSlope(elevE, elevW, resolution * 2);
      const slope = Math.sqrt(slopeNS * slopeNS + slopeEW * slopeEW);
      slopes.push(slope);

      // Calculate aspect
      const aspect = calculateAspect(elevN, elevS, elevE, elevW);
      aspectCounts[aspect] = (aspectCounts[aspect] || 0) + 1;
    }
  }

  // Calculate average and max slope
  const avgSlope = slopes.length > 0
    ? slopes.reduce((a, b) => a + b, 0) / slopes.length
    : 0;
  const maxSlope = slopes.length > 0
    ? Math.max(...slopes)
    : 0;

  // Find predominant aspect
  let predominantAspect: string = 'flat';
  let maxCount = 0;
  for (const [aspect, count] of Object.entries(aspectCounts)) {
    if (count > maxCount) {
      maxCount = count;
      predominantAspect = aspect;
    }
  }

  return {
    elevationRange: { min, max },
    slopeAnalysis: {
      avgSlopePercent: avgSlope,
      maxSlopePercent: maxSlope,
      predominantAspect: predominantAspect as any,
    },
  };
}

/**
 * Build complete topography context for a given bounds.
 */
export async function buildTopographyContext(
  bounds: Bounds,
  gridSize: number = 10
): Promise<TopographyContext | null> {
  const gridResult = await sampleElevationGrid(bounds, gridSize);
  if (!gridResult) return null;

  const analysis = analyzeElevationGrid(gridResult.data, gridResult.resolution);

  return {
    bounds,
    elevationRange: {
      ...analysis.elevationRange,
      unit: 'meters',
    },
    slopeAnalysis: analysis.slopeAnalysis,
    elevationGrid: {
      resolution: gridResult.resolution,
      rows: gridSize,
      cols: gridSize,
      data: gridResult.data,
    },
  };
}
