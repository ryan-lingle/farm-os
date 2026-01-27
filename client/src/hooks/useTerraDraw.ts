/**
 * Terra Draw integration hook for MapLibre GL.
 * Provides drawing capabilities with programmatic control for AI tools.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawLineStringMode,
  TerraDrawPointMode,
  TerraDrawCircleMode,
  TerraDrawSelectMode,
  TerraDrawRenderMode,
  type GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Feature, Polygon, LineString, Point, MultiPolygon } from 'geojson';

export type DrawingMode = 'polygon' | 'linestring' | 'point' | 'circle' | 'select' | 'static';

export interface TerraDrawState {
  draw: TerraDraw | null;
  mode: DrawingMode;
  features: Feature[];
  selectedFeatureId: string | null;
  isReady: boolean;
}

export interface TerraDrawActions {
  setMode: (mode: DrawingMode) => void;
  addFeature: (feature: Feature, autoSelect?: boolean) => string | null;
  addFeatures: (features: Feature[]) => string[];
  selectFeature: (id: string) => void;
  deselectFeature: (id: string) => void;
  updateFeatureProperties: (id: string, properties: Record<string, any>) => void;
  updateFeatureGeometry: (id: string, geometry: Polygon | LineString | Point | MultiPolygon) => void;
  removeFeature: (id: string) => void;
  removeFeatures: (ids: string[]) => void;
  clearFeatures: () => void;
  getFeature: (id: string) => Feature | undefined;
  getFeatures: () => Feature[];
}

const MODE_MAP: Record<DrawingMode, string> = {
  polygon: 'polygon',
  linestring: 'linestring',
  point: 'point',
  circle: 'circle',
  select: 'select',
  static: 'static',
};

// Custom styling for drawn features
const STYLES = {
  polygon: {
    fillColor: '#3b82f6', // Blue
    fillOpacity: 0.2,
    outlineColor: '#2563eb',
    outlineWidth: 2,
  },
  linestring: {
    lineStringColor: '#10b981', // Green
    lineStringWidth: 3,
  },
  point: {
    pointColor: '#f59e0b', // Amber
    pointWidth: 8,
    pointOutlineColor: '#d97706',
    pointOutlineWidth: 2,
  },
  circle: {
    fillColor: '#06b6d4', // Cyan - ideal for water/ponds
    fillOpacity: 0.3,
    outlineColor: '#0891b2',
    outlineWidth: 2,
  },
  selected: {
    fillColor: '#8b5cf6', // Purple when selected
    fillOpacity: 0.3,
    outlineColor: '#7c3aed',
    outlineWidth: 3,
  },
};

export function useTerraDraw(map: MapLibreMap | null): TerraDrawState & TerraDrawActions {
  const [isReady, setIsReady] = useState(false);
  const [mode, setModeState] = useState<DrawingMode>('static');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const drawRef = useRef<TerraDraw | null>(null);
  const initializedRef = useRef(false);

  // Initialize Terra Draw
  useEffect(() => {
    if (!map || initializedRef.current) return;

    // Wait for map to be loaded
    const initTerraDraw = () => {
      try {
        const adapter = new TerraDrawMapLibreGLAdapter({
          map,
          // Render below labels if possible
          renderBelowLayerId: undefined,
        });

        const terraDraw = new TerraDraw({
          adapter,
          modes: [
            new TerraDrawPolygonMode({
              styles: {
                fillColor: STYLES.polygon.fillColor,
                fillOpacity: STYLES.polygon.fillOpacity,
                outlineColor: STYLES.polygon.outlineColor,
                outlineWidth: STYLES.polygon.outlineWidth,
              },
            }),
            new TerraDrawLineStringMode({
              styles: {
                lineStringColor: STYLES.linestring.lineStringColor,
                lineStringWidth: STYLES.linestring.lineStringWidth,
              },
            }),
            new TerraDrawPointMode({
              styles: {
                pointColor: STYLES.point.pointColor,
                pointWidth: STYLES.point.pointWidth,
                pointOutlineColor: STYLES.point.pointOutlineColor,
                pointOutlineWidth: STYLES.point.pointOutlineWidth,
              },
            }),
            new TerraDrawCircleMode({
              styles: {
                fillColor: STYLES.circle.fillColor,
                fillOpacity: STYLES.circle.fillOpacity,
                outlineColor: STYLES.circle.outlineColor,
                outlineWidth: STYLES.circle.outlineWidth,
              },
            }),
            new TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    // Disable vertex dragging - drag the whole polygon instead
                    coordinates: {
                      midpoints: false,
                      draggable: false,
                    },
                  },
                },
                linestring: {
                  feature: {
                    draggable: true,
                    // Disable vertex dragging - drag the whole line instead
                    coordinates: {
                      midpoints: false,
                      draggable: false,
                    },
                  },
                },
                point: {
                  feature: {
                    draggable: true,
                  },
                },
                circle: {
                  feature: {
                    draggable: true,
                    // Disable vertex editing for circles - they should move/resize as a whole
                    coordinates: {
                      midpoints: false,
                      draggable: false,
                    },
                  },
                },
              },
              styles: {
                selectedPolygonColor: STYLES.selected.fillColor,
                selectedPolygonFillOpacity: STYLES.selected.fillOpacity,
                selectedPolygonOutlineColor: STYLES.selected.outlineColor,
                selectedPolygonOutlineWidth: STYLES.selected.outlineWidth,
                selectedLineStringColor: '#7c3aed',
                selectedLineStringWidth: 4,
                selectedPointColor: '#7c3aed',
                selectedPointWidth: 10,
                selectedPointOutlineColor: '#6d28d9',
                selectedPointOutlineWidth: 3,
                // Hide selection/mid points for cleaner UX (especially for circles)
                // Users can still drag the whole feature from its interior
                selectionPointWidth: 0,
                midPointWidth: 0,
              },
            }),
            new TerraDrawRenderMode({
              modeName: 'static',
              styles: {
                polygonFillColor: STYLES.polygon.fillColor,
                polygonFillOpacity: STYLES.polygon.fillOpacity,
                polygonOutlineColor: STYLES.polygon.outlineColor,
                polygonOutlineWidth: STYLES.polygon.outlineWidth,
                lineStringColor: STYLES.linestring.lineStringColor,
                lineStringWidth: STYLES.linestring.lineStringWidth,
                pointColor: STYLES.point.pointColor,
                pointWidth: STYLES.point.pointWidth,
                pointOutlineColor: STYLES.point.pointOutlineColor,
                pointOutlineWidth: STYLES.point.pointOutlineWidth,
              },
            }),
          ],
        });

        // Register event listeners
        terraDraw.on('ready', () => {
          setIsReady(true);
        });

        terraDraw.on('change', () => {
          const snapshot = terraDraw.getSnapshot();
          // Convert to standard GeoJSON features
          const geoFeatures = snapshot.map(f => ({
            type: 'Feature' as const,
            id: f.id,
            geometry: f.geometry,
            properties: f.properties,
          }));
          setFeatures(geoFeatures);
        });

        terraDraw.on('select', (id) => {
          setSelectedFeatureId(String(id));
        });

        terraDraw.on('deselect', () => {
          setSelectedFeatureId(null);
        });

        terraDraw.on('finish', (id) => {
          // Feature drawing completed
          console.log('[TerraDraw] Feature finished:', id);
        });

        terraDraw.start();
        drawRef.current = terraDraw;
        initializedRef.current = true;

      } catch (error) {
        console.error('[TerraDraw] Initialization error:', error);
      }
    };

    if (map.loaded()) {
      initTerraDraw();
    } else {
      map.on('load', initTerraDraw);
    }

    return () => {
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
        drawRef.current = null;
        initializedRef.current = false;
      }
      setIsReady(false);
    };
  }, [map]);

  // Set drawing mode
  const setMode = useCallback((newMode: DrawingMode) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.setMode(MODE_MAP[newMode]);
      setModeState(newMode);
    } catch (error) {
      console.error('[TerraDraw] Error setting mode:', error);
    }
  }, [isReady]);

  // Add a single feature
  const addFeature = useCallback((feature: Feature, autoSelect = false): string | null => {
    console.log('[TerraDraw] addFeature called');
    console.log('[TerraDraw] isReady:', isReady);
    console.log('[TerraDraw] drawRef.current exists:', !!drawRef.current);
    console.log('[TerraDraw] Input feature:', JSON.stringify(feature, null, 2));
    console.log('[TerraDraw] autoSelect:', autoSelect);

    if (!drawRef.current || !isReady) {
      console.error('[TerraDraw] Cannot add feature - not ready. isReady:', isReady, 'drawRef:', !!drawRef.current);
      return null;
    }

    try {
      // Validate feature before adding
      console.log('[TerraDraw] Validating feature...');
      const validationError = validateFeature(feature);
      if (validationError) {
        console.error('[TerraDraw] Feature validation failed:', validationError);
        console.error('[TerraDraw] Rejected feature:', JSON.stringify(feature, null, 2));
        return null;
      }
      console.log('[TerraDraw] Validation passed');

      // Ensure feature has proper structure for Terra Draw
      const modeName = getModeName(feature.geometry.type);
      console.log('[TerraDraw] Determined mode name:', modeName);

      const terraFeature: GeoJSONStoreFeatures = {
        type: 'Feature',
        geometry: feature.geometry as any,
        properties: {
          ...feature.properties,
          mode: modeName,
        },
      };
      console.log('[TerraDraw] Prepared Terra Draw feature:', JSON.stringify(terraFeature, null, 2));

      console.log('[TerraDraw] Calling drawRef.current.addFeatures...');
      const results = drawRef.current.addFeatures([terraFeature]);
      console.log('[TerraDraw] addFeatures results:', JSON.stringify(results, null, 2));

      if (results.length > 0 && results[0].valid) {
        const snapshot = drawRef.current.getSnapshot();
        console.log('[TerraDraw] Current snapshot length:', snapshot.length);
        const addedFeature = snapshot.slice(-1)[0];
        const id = String(addedFeature?.id);
        console.log('[TerraDraw] Added feature ID:', id);

        if (autoSelect && id) {
          console.log('[TerraDraw] Auto-selecting feature');
          drawRef.current.selectFeature(id);
        }

        return id;
      }

      console.error('[TerraDraw] Terra Draw rejected feature:', results);
      if (results.length > 0) {
        console.error('[TerraDraw] Rejection reason:', results[0]);
      }
      return null;
    } catch (error) {
      console.error('[TerraDraw] Error adding feature:', error);
      return null;
    }
  }, [isReady]);

  // Add multiple features
  const addFeatures = useCallback((newFeatures: Feature[]): string[] => {
    if (!drawRef.current || !isReady) return [];

    try {
      const terraFeatures: GeoJSONStoreFeatures[] = newFeatures.map(f => ({
        type: 'Feature',
        geometry: f.geometry as any,
        properties: {
          ...f.properties,
          mode: getModeName(f.geometry.type),
        },
      }));

      const results = drawRef.current.addFeatures(terraFeatures);
      const validIds: string[] = [];

      results.forEach((result, index) => {
        if (result.valid) {
          // Get the last N features from snapshot
          const snapshot = drawRef.current!.getSnapshot();
          const added = snapshot[snapshot.length - terraFeatures.length + index];
          if (added?.id) {
            validIds.push(String(added.id));
          }
        }
      });

      return validIds;
    } catch (error) {
      console.error('[TerraDraw] Error adding features:', error);
      return [];
    }
  }, [isReady]);

  // Select a feature
  const selectFeature = useCallback((id: string) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.selectFeature(id);
    } catch (error) {
      console.error('[TerraDraw] Error selecting feature:', error);
    }
  }, [isReady]);

  // Deselect a feature
  const deselectFeature = useCallback((id: string) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.deselectFeature(id);
    } catch (error) {
      console.error('[TerraDraw] Error deselecting feature:', error);
    }
  }, [isReady]);

  // Update feature properties
  const updateFeatureProperties = useCallback((id: string, properties: Record<string, any>) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.updateFeatureProperties(id, properties);
    } catch (error) {
      console.error('[TerraDraw] Error updating feature properties:', error);
    }
  }, [isReady]);

  // Update feature geometry
  const updateFeatureGeometry = useCallback((id: string, geometry: Polygon | LineString | Point | MultiPolygon) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.updateFeatureGeometry(id, geometry);
    } catch (error) {
      console.error('[TerraDraw] Error updating feature geometry:', error);
    }
  }, [isReady]);

  // Remove a single feature
  const removeFeature = useCallback((id: string) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.removeFeatures([id]);
    } catch (error) {
      console.error('[TerraDraw] Error removing feature:', error);
    }
  }, [isReady]);

  // Remove multiple features
  const removeFeatures = useCallback((ids: string[]) => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.removeFeatures(ids);
    } catch (error) {
      console.error('[TerraDraw] Error removing features:', error);
    }
  }, [isReady]);

  // Clear all features
  const clearFeatures = useCallback(() => {
    if (!drawRef.current || !isReady) return;

    try {
      drawRef.current.clear();
    } catch (error) {
      console.error('[TerraDraw] Error clearing features:', error);
    }
  }, [isReady]);

  // Get a single feature by ID
  const getFeature = useCallback((id: string): Feature | undefined => {
    if (!drawRef.current || !isReady) return undefined;

    try {
      const feature = drawRef.current.getSnapshotFeature(id);
      if (!feature) return undefined;

      return {
        type: 'Feature',
        id: feature.id,
        geometry: feature.geometry,
        properties: feature.properties,
      };
    } catch (error) {
      console.error('[TerraDraw] Error getting feature:', error);
      return undefined;
    }
  }, [isReady]);

  // Get all features
  const getFeatures = useCallback((): Feature[] => {
    if (!drawRef.current || !isReady) return [];

    try {
      return drawRef.current.getSnapshot().map(f => ({
        type: 'Feature' as const,
        id: f.id,
        geometry: f.geometry,
        properties: f.properties,
      }));
    } catch (error) {
      console.error('[TerraDraw] Error getting features:', error);
      return [];
    }
  }, [isReady]);

  return {
    // State
    draw: drawRef.current,
    mode,
    features,
    selectedFeatureId,
    isReady,
    // Actions
    setMode,
    addFeature,
    addFeatures,
    selectFeature,
    deselectFeature,
    updateFeatureProperties,
    updateFeatureGeometry,
    removeFeature,
    removeFeatures,
    clearFeatures,
    getFeature,
    getFeatures,
  };
}

// Helper to determine Terra Draw mode name from geometry type
function getModeName(geometryType: string): string {
  switch (geometryType) {
    case 'Polygon':
    case 'MultiPolygon':
      return 'polygon';
    case 'LineString':
    case 'MultiLineString':
      return 'linestring';
    case 'Point':
    case 'MultiPoint':
      return 'point';
    default:
      return 'polygon';
  }
}

/**
 * Validate a GeoJSON feature before adding to Terra Draw.
 * Returns an error message if invalid, null if valid.
 */
function validateFeature(feature: Feature): string | null {
  if (!feature || feature.type !== 'Feature') {
    return 'Feature must have type "Feature"';
  }

  if (!feature.geometry) {
    return 'Feature must have a geometry';
  }

  const geom = feature.geometry;

  if (geom.type === 'Polygon') {
    const polygon = geom as Polygon;
    if (!polygon.coordinates || !Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
      return 'Polygon must have coordinates array';
    }

    const ring = polygon.coordinates[0];
    if (!ring || ring.length < 4) {
      return `Polygon ring must have at least 4 coordinates (has ${ring?.length || 0}). A closed polygon needs at least 3 unique points plus the closing point.`;
    }

    // Check if ring is closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return 'Polygon ring must be closed (first and last coordinates must match)';
    }

    // Check for degenerate polygon (all points nearly collinear = thin line)
    const lngs = ring.map(c => c[0]);
    const lats = ring.map(c => c[1]);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const aspectRatio = Math.max(lngRange, latRange) / Math.min(lngRange, latRange);

    if (aspectRatio > 100 || lngRange < 0.00001 || latRange < 0.00001) {
      return `Polygon appears to be degenerate (aspect ratio: ${aspectRatio.toFixed(1)}, size: ${lngRange.toFixed(6)} x ${latRange.toFixed(6)}). Create a proper 2D shape, not a thin line.`;
    }

    // Validate coordinate values are reasonable
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length < 2) {
        return 'Each coordinate must be [lng, lat] array';
      }
      const [lng, lat] = coord;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return 'Coordinates must be numbers';
      }
      if (lat < -90 || lat > 90) {
        return `Invalid latitude ${lat}. Must be between -90 and 90.`;
      }
      if (lng < -180 || lng > 180) {
        return `Invalid longitude ${lng}. Must be between -180 and 180.`;
      }
    }
  } else if (geom.type === 'Point') {
    const point = geom as Point;
    if (!point.coordinates || point.coordinates.length < 2) {
      return 'Point must have [lng, lat] coordinates';
    }
    const [lng, lat] = point.coordinates;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return `Invalid coordinates [${lng}, ${lat}]`;
    }
  } else if (geom.type === 'LineString') {
    const line = geom as LineString;
    if (!line.coordinates || line.coordinates.length < 2) {
      return 'LineString must have at least 2 coordinates';
    }
  }

  return null; // Valid
}
