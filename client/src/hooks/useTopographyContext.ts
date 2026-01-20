/**
 * Hook to extract topography context from a location's geometry.
 * Samples elevation data from AWS Terrain Tiles.
 */

import { useState, useEffect } from 'react';
import { buildTopographyContext } from '@/lib/terrain-utils';
import type { TopographyContext } from '@/lib/chat-bridge';

interface Geometry {
  type: string;
  coordinates: any;
}

/**
 * Get bounding box from GeoJSON geometry.
 */
function getBoundsFromGeometry(geometry: Geometry | null): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (!geometry || !geometry.coordinates) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  function processCoordinate(coord: [number, number]) {
    const [lng, lat] = coord;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  function processCoordinates(coords: any, depth: number = 0) {
    if (depth > 4) return; // Safety limit

    if (Array.isArray(coords)) {
      // Check if this is a coordinate pair [lng, lat]
      if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        processCoordinate(coords as [number, number]);
      } else {
        // It's an array of coordinates or nested arrays
        for (const item of coords) {
          processCoordinates(item, depth + 1);
        }
      }
    }
  }

  processCoordinates(geometry.coordinates);

  if (minLat === Infinity || maxLat === -Infinity || minLng === Infinity || maxLng === -Infinity) {
    return null;
  }

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng,
  };
}

interface UseTopographyContextResult {
  topography: TopographyContext | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to generate topography context from a location's geometry.
 *
 * @param geometry GeoJSON geometry (Polygon, MultiPolygon, Point, etc.)
 * @param gridSize Number of samples per dimension (default 10 = 100 points)
 */
export function useTopographyContext(
  geometry: Geometry | null | undefined,
  gridSize: number = 10
): UseTopographyContextResult {
  const [topography, setTopography] = useState<TopographyContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!geometry) {
      setTopography(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const bounds = getBoundsFromGeometry(geometry);
    if (!bounds) {
      setTopography(null);
      setIsLoading(false);
      setError(new Error('Could not extract bounds from geometry'));
      return;
    }

    // Check if bounds are too small (point or very small area)
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    if (latDiff < 0.0001 && lngDiff < 0.0001) {
      // For points, expand bounds slightly
      const expand = 0.001; // ~100m
      bounds.north += expand;
      bounds.south -= expand;
      bounds.east += expand;
      bounds.west -= expand;
    }

    let cancelled = false;

    async function fetchTopography() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await buildTopographyContext(bounds!, gridSize);
        if (!cancelled) {
          setTopography(result);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch topography'));
          setIsLoading(false);
        }
      }
    }

    fetchTopography();

    return () => {
      cancelled = true;
    };
  }, [geometry, gridSize]);

  return { topography, isLoading, error };
}
