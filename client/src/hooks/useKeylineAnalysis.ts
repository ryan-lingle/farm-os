/**
 * Hook for running keyline analysis on a location's terrain.
 * Combines elevation data sampling with the keyline detection algorithm.
 */

import { useState, useEffect, useCallback } from 'react';
import { sampleElevationGrid } from '@/lib/terrain-utils';
import { detectKeylines, type KeylineAnalysisResult } from '@/lib/keyline-detection';
import type { RainfallContext } from '@/hooks/useLocationClimate';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface UseKeylineAnalysisParams {
  bounds: Bounds | null;
  rainfallContext?: RainfallContext;
  enabled?: boolean;
  gridSize?: number;
}

interface UseKeylineAnalysisReturn {
  result: KeylineAnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  analyze: () => Promise<void>;
}

/**
 * Hook for running keyline analysis on terrain data.
 *
 * @param params.bounds - Geographic bounds of the area to analyze
 * @param params.rainfallContext - Optional rainfall context for spacing adjustments
 * @param params.enabled - Whether analysis is enabled (default: false)
 * @param params.gridSize - Grid resolution for elevation sampling (default: 30)
 */
export function useKeylineAnalysis({
  bounds,
  rainfallContext,
  enabled = false,
  gridSize = 30,
}: UseKeylineAnalysisParams): UseKeylineAnalysisReturn {
  const [result, setResult] = useState<KeylineAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!bounds) {
      setError('No bounds provided for analysis');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Sample elevation grid from terrain tiles
      console.log('[useKeylineAnalysis] Sampling elevation grid...', { bounds, gridSize });
      const gridResult = await sampleElevationGrid(bounds, gridSize);

      if (!gridResult || !gridResult.data || gridResult.data.length === 0) {
        throw new Error('Failed to sample elevation data');
      }

      console.log('[useKeylineAnalysis] Elevation grid sampled:', {
        rows: gridResult.data.length,
        cols: gridResult.data[0]?.length,
        resolution: gridResult.resolution,
      });

      // Run keyline detection
      console.log('[useKeylineAnalysis] Running keyline detection...');
      const analysisResult = detectKeylines({
        bounds,
        elevationGrid: gridResult.data,
        resolution: gridResult.resolution,
        rainfallContext,
      });

      console.log('[useKeylineAnalysis] Analysis complete:', analysisResult.stats);
      setResult(analysisResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error during analysis';
      console.error('[useKeylineAnalysis] Error:', message);
      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [bounds, rainfallContext, gridSize]);

  // Auto-run when enabled and bounds change
  useEffect(() => {
    if (enabled && bounds) {
      analyze();
    }
  }, [enabled, bounds?.north, bounds?.south, bounds?.east, bounds?.west]);

  // Clear results when disabled
  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setError(null);
    }
  }, [enabled]);

  return {
    result,
    isAnalyzing,
    error,
    analyze,
  };
}

export default useKeylineAnalysis;
