# Client-Side Context Injection & Bi-Directional Chat Communication

## Overview

Enable the chat system to:
1. Receive rich client-side context (topography data) from the current page
2. Send commands back to the client (draw features on map)

**MVP Use Case**: Inject topography data → AI analyzes for keyline pond placement → AI draws suggested ponds as temporary overlay on map

## Architecture Design

### 1. Communication Pattern: Event Bus with Typed Channels

Create a lightweight pub/sub system that components can subscribe to:

```typescript
// lib/chat-bridge.ts
type ChatBridgeEvent =
  | { type: 'context:inject'; payload: { key: string; data: any } }
  | { type: 'command:draw'; payload: { features: GeoJSON.Feature[] } }
  | { type: 'command:clear-overlay'; payload: { layerId?: string } }
  | { type: 'command:highlight'; payload: { featureId: string } };

class ChatBridge {
  subscribe(type: string, callback: (payload: any) => void): () => void;
  publish(event: ChatBridgeEvent): void;
  getContext(key: string): any;
}
```

### 2. Topography Data Format

Based on investigation, the best approach is **sampled elevation grid with summary statistics**:

```typescript
interface TopographyContext {
  bounds: { north: number; south: number; east: number; west: number };
  elevationRange: { min: number; max: number; unit: 'meters' };
  slopeAnalysis: {
    avgSlopePercent: number;
    maxSlopePercent: number;
    predominantAspect: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  };
  // Sampled grid (e.g., 10x10 = 100 points)
  elevationGrid: {
    resolution: number; // meters between samples
    rows: number;
    cols: number;
    data: number[][]; // elevation values in meters
  };
  // Key contour lines as simplified GeoJSON for context
  keyContours?: GeoJSON.FeatureCollection;
}
```

**Why this format:**
- Compact enough for chat context (~2-5KB)
- Precise numerical data for AI analysis
- Grid enables slope/aspect calculations
- Summary stats give quick overview
- Optional contour GeoJSON for reference

### 3. Implementation Phases

#### Phase 1: Chat Bridge Infrastructure
- Create `ChatBridge` class with pub/sub
- Create React context provider `ChatBridgeProvider`
- Create hooks: `useChatBridge()`, `useInjectContext()`, `useChatCommands()`

#### Phase 2: Topography Data Extraction
- Create `useTopographyContext` hook for LocationDetailMap
- Sample elevation from AWS Terrain Tiles (Terrarium decoding)
- Calculate slope/aspect analysis
- Format as TopographyContext

#### Phase 3: Context Injection into Chat
- Update LocationDetail to inject topography context via bridge
- Update chat system to receive and format client context
- Add UI indicator showing "Topography data available"

#### Phase 4: Command Execution (Draw Overlay)
- Add overlay layer to LocationDetailMap
- Subscribe to `command:draw` events
- Render AI-suggested features as temporary GeoJSON layer
- Add "Clear suggestions" button

## File Changes

### New Files
1. `client/src/lib/chat-bridge.ts` - Event bus implementation
2. `client/src/contexts/ChatBridgeContext.tsx` - React provider
3. `client/src/hooks/useChatBridge.ts` - Hook exports
4. `client/src/hooks/useTopographyContext.ts` - Elevation sampling
5. `client/src/lib/terrain-utils.ts` - Terrarium decoding utilities

### Modified Files
1. `client/src/App.tsx` - Wrap with ChatBridgeProvider
2. `client/src/pages/records/LocationDetail.tsx` - Inject topography context
3. `client/src/components/LocationDetailMap.tsx` - Add overlay layer, subscribe to commands
4. `client/src/components/chat/ChatContainer.tsx` - Subscribe to context injection
5. `client/src/lib/chat-context.ts` - Add client context formatting

## Technical Details

### Terrain Tile Decoding (Terrarium Format)
```typescript
// RGB to elevation: elevation = (R * 256 + G + B / 256) - 32768
function terrariumToElevation(r: number, g: number, b: number): number {
  return (r * 256 + g + b / 256) - 32768;
}
```

### Elevation Sampling Strategy
1. Get location bounds from geometry
2. Create grid of sample points (e.g., 10x10)
3. Fetch terrain tile(s) covering the area
4. Sample elevation at each grid point
5. Calculate derived metrics (slope, aspect)

### Overlay Layer Styling
```typescript
const overlayStyle = {
  'fill-color': '#3b82f6',
  'fill-opacity': 0.3,
  'stroke-color': '#1d4ed8',
  'stroke-width': 2,
  'stroke-dasharray': [4, 2], // Dashed to indicate "suggested"
};
```

## MVP Scope

**In Scope:**
- LocationDetail page only
- Topography context injection
- Single command type: draw polygons
- Temporary overlay (clears on page leave)
- Manual "Clear suggestions" button

**Out of Scope (Future):**
- Persisting AI suggestions to database
- Other entity types
- Multiple overlay layers
- Editing AI suggestions
- Other command types (highlight, animate, etc.)
