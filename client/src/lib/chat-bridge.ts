/**
 * ChatBridge - Bi-directional communication between chat and page components.
 *
 * Enables:
 * - Components to inject context data for the chat (e.g., topography)
 * - Chat to send commands to components (e.g., draw features on map)
 */

import type { Feature, FeatureCollection, Polygon, MultiPolygon, Point, LineString } from 'geojson';

// Context types that components can inject
export interface TopographyContext {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  elevationRange: {
    min: number;
    max: number;
    unit: 'meters' | 'feet';
  };
  slopeAnalysis: {
    avgSlopePercent: number;
    maxSlopePercent: number;
    predominantAspect: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'flat';
  };
  elevationGrid: {
    resolution: number; // meters between samples
    rows: number;
    cols: number;
    data: number[][]; // elevation values in meters
  };
}

export interface DrawnFeaturesContext {
  features: Feature[];
  label?: string;
  count: number;
}

export interface ClientContext {
  topography?: TopographyContext;
  drawnFeatures?: DrawnFeaturesContext;
  [key: string]: any;
}

// Command types that chat can send to components
export interface DrawCommand {
  type: 'draw';
  features: Feature<Polygon | MultiPolygon | Point | LineString>[];
  style?: {
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    strokeDasharray?: number[];
  };
  label?: string; // Description of what's being drawn
}

export interface ClearOverlayCommand {
  type: 'clear-overlay';
  layerId?: string; // Optional specific layer, or clear all
}

export interface HighlightCommand {
  type: 'highlight';
  coordinates: [number, number];
  label?: string;
}

export type ChatCommand = DrawCommand | ClearOverlayCommand | HighlightCommand;

// Event types
export type ChatBridgeEvent =
  | { type: 'context:update'; payload: ClientContext }
  | { type: 'command:execute'; payload: ChatCommand };

type EventCallback = (event: ChatBridgeEvent) => void;

/**
 * ChatBridge singleton for communication between chat and page components.
 */
class ChatBridgeImpl {
  private subscribers: Set<EventCallback> = new Set();
  private context: ClientContext = {};

  /**
   * Subscribe to bridge events.
   * Returns unsubscribe function.
   */
  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Publish an event to all subscribers.
   */
  private publish(event: ChatBridgeEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[ChatBridge] Error in subscriber:', error);
      }
    });
  }

  /**
   * Inject or update context data.
   * Components call this to provide data to the chat.
   */
  injectContext(key: keyof ClientContext, data: any): void {
    this.context = { ...this.context, [key]: data };
    this.publish({ type: 'context:update', payload: this.context });
  }

  /**
   * Remove context data.
   * Components call this when unmounting or when data is no longer relevant.
   */
  removeContext(key: keyof ClientContext): void {
    const { [key]: _, ...rest } = this.context;
    this.context = rest;
    this.publish({ type: 'context:update', payload: this.context });
  }

  /**
   * Get current context.
   */
  getContext(): ClientContext {
    return { ...this.context };
  }

  /**
   * Get specific context by key.
   */
  getContextByKey<K extends keyof ClientContext>(key: K): ClientContext[K] | undefined {
    return this.context[key];
  }

  /**
   * Execute a command (sent from chat to components).
   */
  executeCommand(command: ChatCommand): void {
    this.publish({ type: 'command:execute', payload: command });
  }

  /**
   * Clear all context (useful for navigation/cleanup).
   */
  clearContext(): void {
    this.context = {};
    this.publish({ type: 'context:update', payload: this.context });
  }
}

// Export singleton instance
export const ChatBridge = new ChatBridgeImpl();

/**
 * Format topography context as markdown for AI consumption.
 */
export function formatTopographyContextForAI(topo: TopographyContext): string {
  const { bounds, elevationRange, slopeAnalysis, elevationGrid } = topo;

  const lines: string[] = [
    '## Topography Data',
    '',
    '### Location Bounds',
    `- North: ${bounds.north.toFixed(6)}`,
    `- South: ${bounds.south.toFixed(6)}`,
    `- East: ${bounds.east.toFixed(6)}`,
    `- West: ${bounds.west.toFixed(6)}`,
    '',
    '### Elevation',
    `- Range: ${elevationRange.min.toFixed(1)}m to ${elevationRange.max.toFixed(1)}m`,
    `- Total relief: ${(elevationRange.max - elevationRange.min).toFixed(1)}m`,
    '',
    '### Slope Analysis',
    `- Average slope: ${slopeAnalysis.avgSlopePercent.toFixed(1)}%`,
    `- Maximum slope: ${slopeAnalysis.maxSlopePercent.toFixed(1)}%`,
    `- Predominant aspect: ${slopeAnalysis.predominantAspect}`,
    '',
    '### Elevation Grid',
    `- Resolution: ${elevationGrid.resolution}m between samples`,
    `- Grid size: ${elevationGrid.cols} x ${elevationGrid.rows} (${elevationGrid.cols * elevationGrid.rows} points)`,
    '',
    '#### Elevation Matrix (meters, rows from North to South):',
    '```',
  ];

  // Add grid data - show row by row
  for (let row = 0; row < elevationGrid.rows; row++) {
    const rowData = elevationGrid.data[row]
      .map(v => v.toFixed(1).padStart(7))
      .join(' ');
    lines.push(rowData);
  }

  lines.push('```');
  lines.push('');
  lines.push('*Use this data to analyze terrain for placement of features like ponds, swales, or terraces.*');

  return lines.join('\n');
}

/**
 * Format drawn features context as markdown for AI consumption.
 */
export function formatDrawnFeaturesForAI(drawnFeatures: DrawnFeaturesContext): string {
  const { features, label, count } = drawnFeatures;

  const lines: string[] = [
    '## Drawn Features on Map',
    '',
    `**Count:** ${count} feature(s)`,
  ];

  if (label) {
    lines.push(`**Label:** ${label}`);
  }

  lines.push('');
  lines.push('### Features');

  features.forEach((feature, index) => {
    const geom = feature.geometry;
    const props = feature.properties || {};
    const name = props.name || props.label || `Feature ${index + 1}`;

    lines.push('');
    lines.push(`#### ${name}`);
    lines.push(`- **Type:** ${geom.type}`);

    // Extract bounds/coordinates based on geometry type
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      const coords = geom.type === 'Polygon'
        ? (geom as Polygon).coordinates[0]
        : (geom as MultiPolygon).coordinates.flatMap(p => p[0]);

      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);

      const bounds = {
        west: Math.min(...lngs),
        east: Math.max(...lngs),
        south: Math.min(...lats),
        north: Math.max(...lats),
      };

      // Calculate approximate area (rough estimate using bounding box)
      const latDiff = bounds.north - bounds.south;
      const lngDiff = bounds.east - bounds.west;
      const avgLat = (bounds.north + bounds.south) / 2;
      const latMeters = latDiff * 111320; // approx meters per degree latitude
      const lngMeters = lngDiff * 111320 * Math.cos(avgLat * Math.PI / 180);
      const approxAreaSqm = latMeters * lngMeters;
      const approxAreaAcres = approxAreaSqm / 4047;

      lines.push(`- **Bounds:** N:${bounds.north.toFixed(6)}, S:${bounds.south.toFixed(6)}, E:${bounds.east.toFixed(6)}, W:${bounds.west.toFixed(6)}`);
      lines.push(`- **Approx area:** ${approxAreaSqm.toFixed(0)} sq m (${approxAreaAcres.toFixed(2)} acres)`);

      // Include actual coordinates for precise analysis
      lines.push(`- **Coordinates:** ${JSON.stringify(coords.slice(0, 5))}${coords.length > 5 ? '...' : ''}`);
    } else if (geom.type === 'Point') {
      const coords = (geom as Point).coordinates;
      lines.push(`- **Coordinates:** [${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}]`);
    } else if (geom.type === 'LineString') {
      const coords = (geom as LineString).coordinates;
      lines.push(`- **Points:** ${coords.length}`);
      lines.push(`- **Start:** [${coords[0][0].toFixed(6)}, ${coords[0][1].toFixed(6)}]`);
      lines.push(`- **End:** [${coords[coords.length - 1][0].toFixed(6)}, ${coords[coords.length - 1][1].toFixed(6)}]`);
    }

    // Include any custom properties
    const customProps = Object.entries(props).filter(([key]) => !['name', 'label'].includes(key));
    if (customProps.length > 0) {
      lines.push(`- **Properties:** ${JSON.stringify(Object.fromEntries(customProps))}`);
    }
  });

  lines.push('');
  lines.push('*These are features currently drawn/suggested on the map. You can reference them in your analysis.*');

  return lines.join('\n');
}

/**
 * Format all client context for AI consumption.
 */
export function formatClientContextForAI(context: ClientContext): string | null {
  const parts: string[] = [];

  if (context.topography) {
    parts.push(formatTopographyContextForAI(context.topography));
  }

  if (context.drawnFeatures && context.drawnFeatures.count > 0) {
    parts.push(formatDrawnFeaturesForAI(context.drawnFeatures));
  }

  return parts.length > 0 ? parts.join('\n\n---\n\n') : null;
}

/**
 * Format location data as markdown for AI consumption.
 */
export function formatLocationContextForAI(location: {
  id: number;
  name: string;
  notes?: string;
  parent_id?: number | null;
  geometry?: string | object | null;
  asset_count?: number;
}): string {
  const lines: string[] = [
    '## Location Details',
    '',
    `**Name:** ${location.name}`,
    `**ID:** ${location.id}`,
  ];

  if (location.notes) {
    lines.push(`**Notes:** ${location.notes}`);
  }

  if (location.asset_count !== undefined) {
    lines.push(`**Assets at location:** ${location.asset_count}`);
  }

  if (location.geometry) {
    const geom = typeof location.geometry === 'string'
      ? JSON.parse(location.geometry)
      : location.geometry;

    lines.push('');
    lines.push('### Geometry');
    lines.push(`**Type:** ${geom.type}`);

    // Extract bounds from geometry
    if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
      const coords = geom.type === 'Polygon'
        ? geom.coordinates[0]
        : geom.coordinates.flatMap((p: number[][][]) => p[0]);

      const lngs = coords.map((c: number[]) => c[0]);
      const lats = coords.map((c: number[]) => c[1]);

      const bounds = {
        west: Math.min(...lngs),
        east: Math.max(...lngs),
        south: Math.min(...lats),
        north: Math.max(...lats),
      };

      lines.push('');
      lines.push('**Bounds:**');
      lines.push(`- North: ${bounds.north.toFixed(6)}`);
      lines.push(`- South: ${bounds.south.toFixed(6)}`);
      lines.push(`- East: ${bounds.east.toFixed(6)}`);
      lines.push(`- West: ${bounds.west.toFixed(6)}`);
    } else if (geom.type === 'Point') {
      lines.push(`**Coordinates:** [${geom.coordinates[0].toFixed(6)}, ${geom.coordinates[1].toFixed(6)}]`);
    }
  }

  return lines.join('\n');
}
