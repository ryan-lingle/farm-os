/**
 * Keyline Detection Algorithm
 *
 * Based on P.A. Yeomans' Keyline Design principles:
 * - Keypoints are inflection points where slope transitions from steep (convex) to gentle (concave)
 * - Keylines run perpendicular to the fall line at keypoints
 * - Water harvesting features (ponds, swales) are placed along keylines
 *
 * This module provides algorithmic detection of keypoints and keylines from elevation data.
 */

import type { Feature, FeatureCollection, Point, LineString, Polygon } from 'geojson';
import type { RainfallContext } from '@/hooks/useLocationClimate';

// ============================================================================
// Types
// ============================================================================

export interface KeylineAnalysisParams {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  elevationGrid: number[][];
  resolution: number; // meters between grid points
  rainfallContext?: RainfallContext;
}

export interface Keypoint {
  id: string;
  lat: number;
  lng: number;
  elevation: number;
  slopeAbove: number;  // slope percentage above the keypoint (steeper)
  slopeBelow: number;  // slope percentage below the keypoint (gentler)
  aspect: number;      // direction of fall in degrees (0=N, 90=E, etc.)
  curvature: number;   // profile curvature value
  confidence: number;  // 0-1 confidence score
  pondSuitability: number; // 0-1 score for pond placement
}

export interface Keyline {
  id: string;
  keypointId: string;
  coordinates: [number, number][]; // [lng, lat] pairs
  elevation: number;
  length: number; // meters
  recommendedSpacing: number; // meters to next keyline
}

export interface PondSite {
  id: string;
  lat: number;
  lng: number;
  elevation: number;
  catchmentArea: number; // estimated sq meters
  suggestedSize: number; // sq meters based on rainfall
  score: number; // 0-1 suitability score
  reasons: string[];
}

export interface KeylineAnalysisResult {
  keypoints: Keypoint[];
  keylines: Keyline[];
  pondSites: PondSite[];
  geoJson: FeatureCollection;
  stats: {
    keypointsFound: number;
    keylinesGenerated: number;
    pondSitesIdentified: number;
    averageSlope: number;
    dominantAspect: string;
  };
}

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Calculate slope at a grid point using 3x3 neighborhood (Horn's method).
 * Returns slope in percentage and aspect in degrees.
 */
function calculateSlopeAndAspect(
  grid: number[][],
  row: number,
  col: number,
  cellSize: number
): { slope: number; aspect: number } {
  const rows = grid.length;
  const cols = grid[0].length;

  // Ensure we have valid neighbors
  if (row < 1 || row >= rows - 1 || col < 1 || col >= cols - 1) {
    return { slope: 0, aspect: 0 };
  }

  // 3x3 neighborhood (using Horn's method for slope calculation)
  const z1 = grid[row - 1][col - 1];
  const z2 = grid[row - 1][col];
  const z3 = grid[row - 1][col + 1];
  const z4 = grid[row][col - 1];
  // z5 = grid[row][col] - center point, not used in Horn's
  const z6 = grid[row][col + 1];
  const z7 = grid[row + 1][col - 1];
  const z8 = grid[row + 1][col];
  const z9 = grid[row + 1][col + 1];

  // Calculate dz/dx (east-west gradient)
  const dzdx = ((z3 + 2 * z6 + z9) - (z1 + 2 * z4 + z7)) / (8 * cellSize);

  // Calculate dz/dy (north-south gradient)
  const dzdy = ((z1 + 2 * z2 + z3) - (z7 + 2 * z8 + z9)) / (8 * cellSize);

  // Slope as percentage
  const slope = Math.sqrt(dzdx * dzdx + dzdy * dzdy) * 100;

  // Aspect in degrees (0 = North, 90 = East, etc.)
  let aspect = Math.atan2(dzdy, -dzdx) * (180 / Math.PI);
  if (aspect < 0) aspect += 360;

  return { slope, aspect };
}

/**
 * Calculate profile curvature (curvature in the direction of steepest descent).
 * Positive = convex (steep above), Negative = concave (valley), Zero = planar
 *
 * Keypoints occur where profile curvature changes from positive to negative.
 */
function calculateProfileCurvature(
  grid: number[][],
  row: number,
  col: number,
  cellSize: number
): number {
  const rows = grid.length;
  const cols = grid[0].length;

  if (row < 1 || row >= rows - 1 || col < 1 || col >= cols - 1) {
    return 0;
  }

  // Second derivatives (simplified)
  const center = grid[row][col];
  const north = grid[row - 1][col];
  const south = grid[row + 1][col];
  const east = grid[row][col + 1];
  const west = grid[row][col - 1];

  // d2z/dx2 and d2z/dy2
  const d2zdx2 = (east - 2 * center + west) / (cellSize * cellSize);
  const d2zdy2 = (north - 2 * center + south) / (cellSize * cellSize);

  // First derivatives
  const dzdx = (east - west) / (2 * cellSize);
  const dzdy = (north - south) / (2 * cellSize);

  // Profile curvature formula (simplified)
  const p = dzdx * dzdx + dzdy * dzdy;
  if (p < 0.0001) return 0; // Nearly flat

  // Mixed partial
  const ne = grid[row - 1][col + 1];
  const nw = grid[row - 1][col - 1];
  const se = grid[row + 1][col + 1];
  const sw = grid[row + 1][col - 1];
  const d2zdxdy = (ne - nw - se + sw) / (4 * cellSize * cellSize);

  // Profile curvature (negative = concave, positive = convex)
  const profileCurv = -((dzdx * dzdx * d2zdx2 + 2 * dzdx * dzdy * d2zdxdy + dzdy * dzdy * d2zdy2) /
    (p * Math.sqrt(p + 1)));

  return profileCurv;
}

/**
 * Calculate flow accumulation using D8 algorithm.
 * Higher values indicate convergent flow (valleys, drainage channels).
 */
function calculateFlowAccumulation(grid: number[][]): number[][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const flowAcc: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(1));

  // Direction offsets (8 neighbors)
  const dr = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dc = [0, 1, 1, 1, 0, -1, -1, -1];

  // Get all cells sorted by elevation (highest first)
  const cells: { row: number; col: number; elev: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ row: r, col: c, elev: grid[r][c] });
    }
  }
  cells.sort((a, b) => b.elev - a.elev);

  // Process from highest to lowest
  for (const cell of cells) {
    const { row, col } = cell;

    // Find steepest downhill neighbor
    let maxDrop = 0;
    let flowDir = -1;

    for (let d = 0; d < 8; d++) {
      const nr = row + dr[d];
      const nc = col + dc[d];

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const drop = grid[row][col] - grid[nr][nc];
      // Diagonal distance is sqrt(2) * cell distance
      const dist = (d % 2 === 0) ? 1 : Math.SQRT2;
      const slope = drop / dist;

      if (slope > maxDrop) {
        maxDrop = slope;
        flowDir = d;
      }
    }

    // Add this cell's accumulation to the downstream cell
    if (flowDir >= 0) {
      const nr = row + dr[flowDir];
      const nc = col + dc[flowDir];
      flowAcc[nr][nc] += flowAcc[row][col];
    }
  }

  return flowAcc;
}

/**
 * Convert grid indices to lat/lng coordinates.
 */
function gridToLatLng(
  row: number,
  col: number,
  bounds: KeylineAnalysisParams['bounds'],
  rows: number,
  cols: number
): { lat: number; lng: number } {
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;

  // Row 0 is north, row (rows-1) is south
  const lat = bounds.north - (row / (rows - 1)) * latRange;
  const lng = bounds.west + (col / (cols - 1)) * lngRange;

  return { lat, lng };
}

/**
 * Trace a keyline that follows contours (stays at roughly the same elevation).
 * This creates lines perpendicular to the fall direction that stay level.
 */
function traceKeyline(
  keypoint: Keypoint,
  grid: number[][],
  bounds: KeylineAnalysisParams['bounds'],
  resolution: number,
  maxLength: number = 150 // meters in each direction
): [number, number][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const targetElevation = keypoint.elevation;
  const elevationTolerance = 2; // Allow 2m variance

  const coords: [number, number][] = [[keypoint.lng, keypoint.lat]];

  // Helper to convert lat/lng to grid indices
  const latLngToGrid = (lat: number, lng: number): { row: number; col: number } => {
    const latRange = bounds.north - bounds.south;
    const lngRange = bounds.east - bounds.west;
    const row = Math.round((bounds.north - lat) / latRange * (rows - 1));
    const col = Math.round((lng - bounds.west) / lngRange * (cols - 1));
    return { row: Math.max(0, Math.min(rows - 1, row)), col: Math.max(0, Math.min(cols - 1, col)) };
  };

  // Helper to extend line following contour
  const extendContour = (startLat: number, startLng: number, direction: 1 | -1): [number, number][] => {
    const result: [number, number][] = [];
    const stepMeters = resolution * 1.5;
    let currentLat = startLat;
    let currentLng = startLng;

    // Primary direction is perpendicular to aspect
    const perpAngle = (keypoint.aspect + (direction === 1 ? 90 : 270)) % 360;
    const rad = (90 - perpAngle) * Math.PI / 180;

    const metersPerDegreeLat = 111320;

    for (let dist = stepMeters; dist <= maxLength; dist += stepMeters) {
      const metersPerDegreeLng = 111320 * Math.cos(currentLat * Math.PI / 180);

      // Move perpendicular to slope
      let newLat = currentLat + (stepMeters * Math.sin(rad)) / metersPerDegreeLat;
      let newLng = currentLng + (stepMeters * Math.cos(rad)) / metersPerDegreeLng;

      // Check bounds (use the original location bounds, not the buffered ones)
      const innerBounds = {
        north: bounds.north - (bounds.north - bounds.south) * 0.1,
        south: bounds.south + (bounds.north - bounds.south) * 0.1,
        east: bounds.east - (bounds.east - bounds.west) * 0.1,
        west: bounds.west + (bounds.east - bounds.west) * 0.1,
      };

      if (newLat < innerBounds.south || newLat > innerBounds.north ||
          newLng < innerBounds.west || newLng > innerBounds.east) {
        break;
      }

      // Check if elevation is still close to target
      const gridPos = latLngToGrid(newLat, newLng);
      const elev = grid[gridPos.row]?.[gridPos.col];
      if (elev === undefined || Math.abs(elev - targetElevation) > elevationTolerance) {
        break;
      }

      currentLat = newLat;
      currentLng = newLng;
      result.push([currentLng, currentLat]);
    }

    return result;
  };

  // Extend in both directions along the contour
  const ext1 = extendContour(keypoint.lat, keypoint.lng, 1);
  const ext2 = extendContour(keypoint.lat, keypoint.lng, -1);

  // Combine: reverse ext2, center point, ext1
  return [...ext2.reverse(), [keypoint.lng, keypoint.lat], ...ext1];
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Detect keypoints and keylines from elevation data.
 */
export function detectKeylines(params: KeylineAnalysisParams): KeylineAnalysisResult {
  const { bounds, elevationGrid, resolution, rainfallContext } = params;
  const rows = elevationGrid.length;
  const cols = elevationGrid[0]?.length || 0;

  if (rows < 3 || cols < 3) {
    return {
      keypoints: [],
      keylines: [],
      pondSites: [],
      geoJson: { type: 'FeatureCollection', features: [] },
      stats: {
        keypointsFound: 0,
        keylinesGenerated: 0,
        pondSitesIdentified: 0,
        averageSlope: 0,
        dominantAspect: 'N',
      },
    };
  }

  // Calculate flow accumulation for pond site detection
  const flowAcc = calculateFlowAccumulation(elevationGrid);

  // Find keypoints
  const keypoints: Keypoint[] = [];
  const curvatureGrid: number[][] = [];
  const slopeData: { slope: number; aspect: number }[][] = [];

  // First pass: calculate curvature and slope for all cells
  for (let r = 0; r < rows; r++) {
    curvatureGrid[r] = [];
    slopeData[r] = [];
    for (let c = 0; c < cols; c++) {
      curvatureGrid[r][c] = calculateProfileCurvature(elevationGrid, r, c, resolution);
      slopeData[r][c] = calculateSlopeAndAspect(elevationGrid, r, c, resolution);
    }
  }

  // Second pass: find keypoints (curvature sign changes from + to -)
  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      const curv = curvatureGrid[r][c];
      const { slope, aspect } = slopeData[r][c];

      // Skip very flat areas or very steep areas (more restrictive to reduce noise)
      if (slope < 5 || slope > 35) continue;

      // Look for profile curvature inflection points
      // A keypoint is where we transition from convex (positive) to concave (negative)
      const curvAbove = curvatureGrid[r - 1][c];
      const curvBelow = curvatureGrid[r + 1][c];

      // Check for inflection (sign change)
      const isInflection = (curvAbove > 0 && curv <= 0) || (curvAbove > 0 && curvBelow < 0);

      if (isInflection) {
        const { lat, lng } = gridToLatLng(r, c, bounds, rows, cols);
        const elevation = elevationGrid[r][c];

        // Calculate slope above and below
        const slopeAbove = slopeData[r - 1]?.[c]?.slope || slope;
        const slopeBelow = slopeData[r + 1]?.[c]?.slope || slope;

        // Confidence based on how clear the transition is
        const curvatureDiff = Math.abs(curvAbove - curvBelow);
        const slopeDiff = Math.abs(slopeAbove - slopeBelow);
        const confidence = Math.min(1, (curvatureDiff * 10 + slopeDiff * 0.05) / 2);

        // Pond suitability based on flow accumulation and curvature
        const flowValue = flowAcc[r][c];
        const maxFlow = Math.max(...flowAcc.flat());
        const normalizedFlow = maxFlow > 0 ? flowValue / maxFlow : 0;
        const pondSuitability = Math.min(1, normalizedFlow * 0.5 + (curv < 0 ? 0.3 : 0) + (slopeBelow < slopeAbove ? 0.2 : 0));

        keypoints.push({
          id: `kp-${r}-${c}`,
          lat,
          lng,
          elevation,
          slopeAbove,
          slopeBelow,
          aspect,
          curvature: curv,
          confidence,
          pondSuitability,
        });
      }
    }
  }

  // Sort keypoints by confidence and take the best ones
  keypoints.sort((a, b) => b.confidence - a.confidence);

  // Filter to keep only well-spaced keypoints with consistent aspect
  const filteredKeypoints: Keypoint[] = [];
  const minSpacing = resolution * 5; // Minimum spacing between keypoints in grid units

  for (const kp of keypoints) {
    // Check if too close to an existing keypoint
    const tooClose = filteredKeypoints.some(existing => {
      const latDiff = Math.abs(kp.lat - existing.lat);
      const lngDiff = Math.abs(kp.lng - existing.lng);
      const approxDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000; // rough meters
      return approxDist < minSpacing;
    });

    if (!tooClose && filteredKeypoints.length < 10) {
      filteredKeypoints.push(kp);
    }
  }

  const topKeypoints = filteredKeypoints;

  // Determine keyline spacing based on rainfall
  let keylineSpacing = 30; // default meters
  if (rainfallContext) {
    switch (rainfallContext.waterStrategy.keylineSpacing) {
      case 'tight': keylineSpacing = 20; break;
      case 'standard': keylineSpacing = 30; break;
      case 'wide': keylineSpacing = 50; break;
    }
  }

  // Generate keylines from keypoints
  const keylines: Keyline[] = topKeypoints.map((kp, i) => {
    const coords = traceKeyline(kp, elevationGrid, bounds, resolution, 150);
    const length = coords.length * resolution;

    return {
      id: `kl-${i}`,
      keypointId: kp.id,
      coordinates: coords,
      elevation: kp.elevation,
      length,
      recommendedSpacing: keylineSpacing,
    };
  });

  // Identify pond sites (high flow accumulation areas near keypoints)
  const pondSites: PondSite[] = [];
  const maxFlow = Math.max(...flowAcc.flat());

  for (let r = 2; r < rows - 2; r++) {
    for (let c = 2; c < cols - 2; c++) {
      const flow = flowAcc[r][c];
      const normalizedFlow = maxFlow > 0 ? flow / maxFlow : 0;

      // Look for convergent flow areas
      if (normalizedFlow > 0.3) {
        const curv = curvatureGrid[r][c];
        const { slope } = slopeData[r][c];

        // Score the pond site
        let score = normalizedFlow * 0.4;
        const reasons: string[] = [];

        if (curv < -0.01) {
          score += 0.3;
          reasons.push('Concave terrain (natural collection point)');
        }

        if (slope >= 2 && slope <= 15) {
          score += 0.2;
          reasons.push('Moderate slope for dam construction');
        }

        // Check if near a keypoint
        const { lat, lng } = gridToLatLng(r, c, bounds, rows, cols);
        const nearKeypoint = topKeypoints.some(kp => {
          const dist = Math.sqrt(Math.pow(kp.lat - lat, 2) + Math.pow(kp.lng - lng, 2));
          return dist < 0.001; // ~100m
        });

        if (nearKeypoint) {
          score += 0.1;
          reasons.push('Near keypoint (ideal keyline pond location)');
        }

        if (score > 0.5 && reasons.length >= 2) {
          // Estimate catchment area (cells upstream * cell area)
          const cellArea = resolution * resolution;
          const catchmentArea = flow * cellArea;

          // Suggest pond size based on rainfall
          let suggestedSize = catchmentArea * 0.01; // 1% of catchment
          if (rainfallContext) {
            suggestedSize *= rainfallContext.waterStrategy.pondSizeMultiplier;
          }

          pondSites.push({
            id: `ps-${r}-${c}`,
            lat,
            lng,
            elevation: elevationGrid[r][c],
            catchmentArea,
            suggestedSize: Math.min(suggestedSize, 5000), // Cap at 5000 sq m
            score,
            reasons,
          });
        }
      }
    }
  }

  // Sort pond sites by score and filter for spacing
  pondSites.sort((a, b) => b.score - a.score);

  // Apply spatial deduplication to pond sites
  const filteredPondSites: PondSite[] = [];
  const minPondSpacing = resolution * 8; // Minimum spacing between pond sites

  for (const ps of pondSites) {
    const tooClose = filteredPondSites.some(existing => {
      const latDiff = Math.abs(ps.lat - existing.lat);
      const lngDiff = Math.abs(ps.lng - existing.lng);
      const approxDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111000;
      return approxDist < minPondSpacing;
    });

    if (!tooClose && filteredPondSites.length < 5) {
      filteredPondSites.push(ps);
    }
  }

  const topPondSites = filteredPondSites;

  // Calculate stats
  let totalSlope = 0;
  let slopeCount = 0;
  const aspectCounts: Record<string, number> = {};

  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const { slope, aspect } = slopeData[r][c];
      totalSlope += slope;
      slopeCount++;

      const aspectDir = getAspectDirection(aspect);
      aspectCounts[aspectDir] = (aspectCounts[aspectDir] || 0) + 1;
    }
  }

  const dominantAspect = Object.entries(aspectCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N';

  // Build GeoJSON
  const features: Feature[] = [];

  // Add keypoints as points
  for (const kp of topKeypoints) {
    features.push({
      type: 'Feature',
      id: kp.id,
      properties: {
        type: 'keypoint',
        elevation: Math.round(kp.elevation),
        slopeAbove: Math.round(kp.slopeAbove * 10) / 10,
        slopeBelow: Math.round(kp.slopeBelow * 10) / 10,
        confidence: Math.round(kp.confidence * 100),
        pondSuitability: Math.round(kp.pondSuitability * 100),
      },
      geometry: {
        type: 'Point',
        coordinates: [kp.lng, kp.lat],
      },
    });
  }

  // Add keylines as lines (only if they have meaningful length)
  for (const kl of keylines) {
    if (kl.coordinates.length >= 5) { // Need at least 5 points for a meaningful line
      features.push({
        type: 'Feature',
        id: kl.id,
        properties: {
          type: 'keyline',
          elevation: Math.round(kl.elevation),
          length: Math.round(kl.length),
          recommendedSpacing: kl.recommendedSpacing,
        },
        geometry: {
          type: 'LineString',
          coordinates: kl.coordinates,
        },
      });
    }
  }

  // Add pond sites as points
  for (const ps of topPondSites) {
    features.push({
      type: 'Feature',
      id: ps.id,
      properties: {
        type: 'pond-site',
        elevation: Math.round(ps.elevation),
        catchmentArea: Math.round(ps.catchmentArea),
        suggestedSize: Math.round(ps.suggestedSize),
        score: Math.round(ps.score * 100),
        reasons: ps.reasons,
      },
      geometry: {
        type: 'Point',
        coordinates: [ps.lng, ps.lat],
      },
    });
  }

  return {
    keypoints: topKeypoints,
    keylines,
    pondSites: topPondSites,
    geoJson: {
      type: 'FeatureCollection',
      features,
    },
    stats: {
      keypointsFound: topKeypoints.length,
      keylinesGenerated: keylines.length,
      pondSitesIdentified: topPondSites.length,
      averageSlope: slopeCount > 0 ? Math.round((totalSlope / slopeCount) * 10) / 10 : 0,
      dominantAspect,
    },
  };
}

/**
 * Convert aspect angle to compass direction.
 */
function getAspectDirection(aspect: number): string {
  if (aspect >= 337.5 || aspect < 22.5) return 'N';
  if (aspect >= 22.5 && aspect < 67.5) return 'NE';
  if (aspect >= 67.5 && aspect < 112.5) return 'E';
  if (aspect >= 112.5 && aspect < 157.5) return 'SE';
  if (aspect >= 157.5 && aspect < 202.5) return 'S';
  if (aspect >= 202.5 && aspect < 247.5) return 'SW';
  if (aspect >= 247.5 && aspect < 292.5) return 'W';
  return 'NW';
}
