# Client-Side Work Request: Migrate to Locations API

## Priority: Medium
## Estimated Effort: 2-4 hours
## Status: Ready for Implementation

---

## Problem Statement

The frontend is currently creating farm boundaries and fields as **land assets** with `is_location=true`. This mixes two different concepts (physical land vs organizational locations) and creates confusing semantics.

**Current (Incorrect) Flow:**
```
User draws boundary on map 
  → POST /api/v1/assets/land {is_location: true, geometry: {...}}
  → Saved as an Asset in assets table
  → Must filter assets by is_location flag to find locations
```

---

## Solution

Migrate to use the dedicated `/api/v1/locations` endpoint which provides:
- ✅ Clearer semantics (locations vs assets)
- ✅ Auto-calculated area in acres
- ✅ Auto-calculated center points
- ✅ Asset count tracking
- ✅ Better movement log semantics

**New (Correct) Flow:**
```
User draws boundary on map
  → POST /api/v1/locations {geometry: {...}}
  → Saved as a Location in locations table
  → Clean GET /api/v1/locations to fetch all
```

---

## API Changes Summary

### ✅ Backend Changes (Already Completed)

1. **Removed from Assets:**
   - ❌ `is_location` field (removed)
   - ❌ `is_fixed` field (removed)

2. **Enhanced Locations Controller:**
   - ✅ Accepts GeoJSON format automatically
   - ✅ Auto-detects `location_type` from geometry
   - ✅ Converts coordinates to internal format
   - ✅ No breaking changes to existing functionality

3. **Assets Kept:**
   - ✅ `current_location_id` - tracks where assets are
   - ✅ `geometry` - optional shape/bounds of asset itself
   - ✅ `quantity` - for herds/flocks/plantings

---

## Frontend Changes Required

### 1. Update Location Creation

**File:** Wherever you handle map drawing and location creation

**Current Code (to find and replace):**
```javascript
// ❌ OLD - Remove this
const response = await fetch('/api/v1/assets/land', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    data: {
      attributes: {
        name: locationName,
        is_location: true,
        is_fixed: true,
        geometry: {
          type: "Polygon",
          coordinates: [[...]]
        }
      }
    }
  })
});
```

**New Code (replace with this):**
```javascript
// ✅ NEW - Use this instead
const response = await fetch('/api/v1/locations', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    data: {
      attributes: {
        name: locationName,
        // location_type auto-detected from geometry (optional to send)
        // Can send "point" or "polygon" explicitly if desired
        notes: "Created via map interface",
        geometry: {
          type: "Polygon",  // or "Point"
          coordinates: [[...]]  // GeoJSON format works!
        }
      }
    }
  })
});

// Response includes bonus fields:
const location = await response.json();
console.log(location.data.attributes.area_in_acres);  // Auto-calculated!
console.log(location.data.attributes.center_point);   // Auto-calculated!
console.log(location.data.attributes.asset_count);    // 0 initially
```

---

### 2. Update Location Fetching

**Current Code (to find and replace):**
```javascript
// ❌ OLD - Remove this
const assetsResponse = await fetch('/api/v1/assets/land');
const assets = await assetsResponse.json();
const locations = assets.data.filter(asset => asset.attributes.is_location === true);
```

**New Code (replace with this):**
```javascript
// ✅ NEW - Use this instead
const response = await fetch('/api/v1/locations');
const locations = await response.json();
// locations.data is now ALL locations, no filtering needed!
```

---

### 3. Update Location Display on Map

**No geometry conversion needed!** The backend now:
- ✅ Accepts GeoJSON format on input
- ✅ Stores in internal format
- ✅ Returns in internal format

**When displaying on map:**
```javascript
function displayLocations(locations) {
  locations.data.forEach(location => {
    const attrs = location.attributes;
    
    // Convert farmAPI format back to GeoJSON for map rendering
    let geoJsonGeometry;
    
    if (attrs.location_type === "point") {
      geoJsonGeometry = {
        type: "Point",
        coordinates: [attrs.geometry.longitude, attrs.geometry.latitude]
      };
    } else if (attrs.location_type === "polygon") {
      geoJsonGeometry = {
        type: "Polygon",
        coordinates: [
          attrs.geometry.map(point => [point.longitude, point.latitude])
        ]
      };
    }
    
    // Add to map with properties
    const feature = {
      type: "Feature",
      id: location.id,
      geometry: geoJsonGeometry,
      properties: {
        name: attrs.name,
        area_acres: attrs.area_in_acres,  // Use this!
        asset_count: attrs.asset_count,   // Show this!
        notes: attrs.notes
      }
    };
    
    map.addGeoJSON(feature);
  });
}
```

---

### 4. Update Location Updates

**Current Code:**
```javascript
// ❌ OLD
PATCH /api/v1/assets/land/:id
```

**New Code:**
```javascript
// ✅ NEW
PATCH /api/v1/locations/:id
{
  "data": {
    "attributes": {
      "name": "Updated Name",
      "notes": "Updated notes",
      "geometry": {...}  // Can update geometry
    }
  }
}
```

---

### 5. Update Location Deletion

**Current Code:**
```javascript
// ❌ OLD
DELETE /api/v1/assets/land/:id
```

**New Code:**
```javascript
// ✅ NEW
DELETE /api/v1/locations/:id
// Note: This archives the location (sets archived_at), doesn't hard delete
```

---

## GeoJSON Format Support

### ✅ The API Now Accepts BOTH Formats!

**Option 1: Send GeoJSON (easiest for frontend):**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-86.9081, 39.9526], [-86.9081, 39.953], ...]]
  }
}
```

**Option 2: Send farmAPI format:**
```json
{
  "geometry": [
    {"latitude": 39.9526, "longitude": -86.9081},
    {"latitude": 39.953, "longitude": -86.9081}
  ]
}
```

**The backend automatically:**
1. Detects which format you sent
2. Converts GeoJSON to internal format
3. Auto-detects `location_type` from geometry structure
4. Stores consistently

---

## Fields Reference

### Location Response Object
```typescript
interface LocationResponse {
  data: {
    id: string;
    type: "location";
    attributes: {
      // Core fields (editable)
      name: string;                    // REQUIRED on create
      location_type: "point" | "polygon";  // Auto-detected or explicit
      status: string | null;           // Optional status
      notes: string | null;            // Optional notes
      
      // Geometry (editable)
      geometry: Point | Point[];       // Internal format
      
      // Timestamps
      created_at: string;              // ISO 8601
      updated_at: string;              // ISO 8601
      archived_at: string | null;      // ISO 8601 or null
      
      // Computed fields (read-only)
      center_point: Point | null;      // Auto-calculated centroid
      area_in_acres: number | null;    // Auto-calculated (polygons only)
      asset_count: number;             // Number of assets here
    };
    relationships: {
      assets: { data: Array<{id: string, type: "asset"}> };
      incoming_movements: { data: Array<{id: string, type: "log"}> };
      outgoing_movements: { data: Array<{id: string, type: "log"}> };
    };
  };
}

interface Point {
  latitude: number;
  longitude: number;
}
```

---

## Asset → Location Relationship

### Creating Assets at Locations

```javascript
// Create a flock of chickens at a location
POST /api/v1/assets/animal
{
  "data": {
    "attributes": {
      "name": "Laying Hens",
      "quantity": 50,
      "current_location_id": 5,  // Reference to location.id
      "notes": "Rhode Island Reds"
    }
  }
}

// Optional: Give the asset its own geometry (e.g., chicken run within larger field)
POST /api/v1/assets/animal
{
  "data": {
    "attributes": {
      "name": "Laying Hens",
      "quantity": 50,
      "current_location_id": 5,  // At "North Field" location
      "geometry": {
        "type": "Polygon",  // Smaller polygon within the field
        "coordinates": [[...]]  // Exact chicken run area
      }
    }
  }
}
```

---

## Movement Logs

### Moving Assets Between Locations

```javascript
// Create a movement log to move assets
POST /api/v1/logs/activity  // or any log type
{
  "data": {
    "attributes": {
      "name": "Move chickens to new pasture",
      "status": "done",              // Set "done" to execute immediately
      "from_location_id": 5,         // Where they're coming from
      "to_location_id": 6,           // Where they're going to
      "asset_ids": [11, 12],         // Which assets to move
      "notes": "Rotating pasture for fresh grass",
      "timestamp": "2025-10-22T10:00:00Z"  // Optional, defaults to now
    }
  }
}
```

**What happens automatically when `status: "done"`:**
1. All assets in `asset_ids` get their `current_location_id` updated to `to_location_id`
2. The log's `moved_at` timestamp is set
3. Movement is recorded for history

**To create a planned movement (not executed yet):**
```javascript
{
  "status": "pending",  // Don't execute yet
  "from_location_id": 5,
  "to_location_id": 6,
  "asset_ids": [11, 12]
}

// Later, execute the movement:
PATCH /api/v1/logs/activity/:id
{
  "data": {
    "attributes": {
      "status": "done"  // This triggers the movement!
    }
  }
}
```

---

## Migration Checklist

### Required Changes:
- [ ] Find all `POST /api/v1/assets/land` with `is_location: true` → Change to `POST /api/v1/locations`
- [ ] Find all `GET /api/v1/assets/land` filtering by `is_location` → Change to `GET /api/v1/locations`
- [ ] Find all location update/delete operations on assets → Change to locations endpoint
- [ ] Remove any code checking `is_location` or `is_fixed` flags
- [ ] Update TypeScript interfaces/types if applicable
- [ ] Update any local storage keys (e.g., `farmAssetLocations` → `farmLocations`)

### Optional Enhancements:
- [ ] Display `area_in_acres` on location info panels
- [ ] Show `asset_count` on location markers
- [ ] Use `center_point` for map centering/labels
- [ ] Implement movement log creation for relocating assets
- [ ] Show movement history on asset detail pages

### Testing:
- [ ] Create a polygon location via map interface
- [ ] Verify location appears in list
- [ ] Create a point location (e.g., barn, water source)
- [ ] Create an asset assigned to a location
- [ ] Verify asset shows in location's `asset_count`
- [ ] Move asset to different location (if implementing movements)
- [ ] Verify asset's `current_location_id` updates
- [ ] Delete a location (verify it archives, not hard deletes)

---

## Code Examples by Framework

### React/Next.js Example:
```typescript
// hooks/useLocations.ts
import { useState, useEffect } from 'react';

interface Location {
  id: string;
  attributes: {
    name: string;
    location_type: 'point' | 'polygon';
    geometry: Array<{latitude: number, longitude: number}> | {latitude: number, longitude: number};
    area_in_acres?: number;
    center_point?: {latitude: number, longitude: number};
    asset_count: number;
  };
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  
  useEffect(() => {
    fetch('http://localhost:3005/api/v1/locations')
      .then(r => r.json())
      .then(data => setLocations(data.data));
  }, []);
  
  const createLocation = async (name: string, geoJsonGeometry: any) => {
    const response = await fetch('http://localhost:3005/api/v1/locations', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        data: {
          attributes: {
            name,
            geometry: geoJsonGeometry  // GeoJSON works!
          }
        }
      })
    });
    
    const newLocation = await response.json();
    setLocations([...locations, newLocation.data]);
    return newLocation.data;
  };
  
  return { locations, createLocation };
}
```

### Vue.js Example:
```javascript
// composables/useLocations.js
import { ref } from 'vue';

export function useLocations() {
  const locations = ref([]);
  
  async function fetchLocations() {
    const response = await fetch('http://localhost:3005/api/v1/locations');
    const data = await response.json();
    locations.value = data.data;
  }
  
  async function createLocation(name, geoJsonGeometry, notes = '') {
    const response = await fetch('http://localhost:3005/api/v1/locations', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        data: {
          attributes: {
            name,
            notes,
            geometry: geoJsonGeometry
          }
        }
      })
    });
    
    const newLocation = await response.json();
    locations.value.push(newLocation.data);
    return newLocation.data;
  }
  
  return { locations, fetchLocations, createLocation };
}
```

### Vanilla JavaScript Example:
```javascript
// services/locationService.js
class LocationService {
  constructor(baseUrl = 'http://localhost:3005/api/v1') {
    this.baseUrl = baseUrl;
  }
  
  async getAll() {
    const response = await fetch(`${this.baseUrl}/locations`);
    const data = await response.json();
    return data.data;
  }
  
  async create(name, geoJsonGeometry, notes = '') {
    const response = await fetch(`${this.baseUrl}/locations`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        data: {
          attributes: { name, notes, geometry: geoJsonGeometry }
        }
      })
    });
    return (await response.json()).data;
  }
  
  async update(id, updates) {
    const response = await fetch(`${this.baseUrl}/locations/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        data: { attributes: updates }
      })
    });
    return (await response.json()).data;
  }
  
  async delete(id) {
    await fetch(`${this.baseUrl}/locations/${id}`, {
      method: 'DELETE'
    });
  }
}

export const locationService = new LocationService();
```

---

## Map Integration Examples

### Leaflet Integration:
```javascript
import L from 'leaflet';

// When user finishes drawing a polygon
map.on('draw:created', async (e) => {
  const layer = e.layer;
  const geoJson = layer.toGeoJSON();
  
  // Prompt for name
  const name = prompt('Enter location name:');
  if (!name) return;
  
  // Create location (GeoJSON format works directly!)
  const location = await fetch('http://localhost:3005/api/v1/locations', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      data: {
        attributes: {
          name,
          geometry: geoJson.geometry  // Send GeoJSON directly!
        }
      }
    })
  }).then(r => r.json());
  
  // Add location ID to the layer for future reference
  layer.locationId = location.data.id;
  
  // Show area in popup
  layer.bindPopup(`
    <strong>${location.data.attributes.name}</strong><br>
    Area: ${location.data.attributes.area_in_acres} acres<br>
    Assets here: ${location.data.attributes.asset_count}
  `);
});

// Load existing locations onto map
async function loadLocations() {
  const response = await fetch('http://localhost:3005/api/v1/locations');
  const locations = await response.json();
  
  locations.data.forEach(location => {
    const attrs = location.attributes;
    let geoJson;
    
    if (attrs.location_type === "point") {
      geoJson = {
        type: "Point",
        coordinates: [attrs.geometry.longitude, attrs.geometry.latitude]
      };
    } else {
      geoJson = {
        type: "Polygon",
        coordinates: [
          attrs.geometry.map(p => [p.longitude, p.latitude])
        ]
      };
    }
    
    const layer = L.geoJSON(geoJson, {
      onEachFeature: (feature, layer) => {
        layer.bindPopup(`
          <strong>${attrs.name}</strong><br>
          ${attrs.area_in_acres ? `Area: ${attrs.area_in_acres} acres<br>` : ''}
          Assets: ${attrs.asset_count}
        `);
      }
    });
    
    layer.addTo(map);
  });
}
```

### Mapbox GL JS Integration:
```javascript
// Load locations as a GeoJSON source
async function loadLocationsToMapbox(map) {
  const response = await fetch('http://localhost:3005/api/v1/locations');
  const locations = await response.json();
  
  // Convert to GeoJSON FeatureCollection
  const features = locations.data.map(location => {
    const attrs = location.attributes;
    let geometry;
    
    if (attrs.location_type === "point") {
      geometry = {
        type: "Point",
        coordinates: [attrs.geometry.longitude, attrs.geometry.latitude]
      };
    } else {
      geometry = {
        type: "Polygon",
        coordinates: [
          attrs.geometry.map(p => [p.longitude, p.latitude])
        ]
      };
    }
    
    return {
      type: "Feature",
      id: location.id,
      geometry,
      properties: {
        name: attrs.name,
        area_acres: attrs.area_in_acres,
        asset_count: attrs.asset_count,
        notes: attrs.notes
      }
    };
  });
  
  map.addSource('locations', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features
    }
  });
  
  // Add polygon fill layer
  map.addLayer({
    id: 'locations-fill',
    type: 'fill',
    source: 'locations',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: {
      'fill-color': '#088',
      'fill-opacity': 0.3
    }
  });
  
  // Add polygon outline
  map.addLayer({
    id: 'locations-outline',
    type: 'line',
    source: 'locations',
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: {
      'line-color': '#088',
      'line-width': 2
    }
  });
  
  // Add point markers
  map.addLayer({
    id: 'locations-points',
    type: 'circle',
    source: 'locations',
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 8,
      'circle-color': '#088'
    }
  });
}
```

---

## Testing Procedures

### Manual Testing Steps:

1. **Test Location Creation:**
   ```
   - Draw a polygon on the map
   - Name it "Test Field"
   - Save
   - Verify it appears in location list
   - Check console: area_in_acres should be calculated
   ```

2. **Test Location Retrieval:**
   ```
   - Reload the page
   - Verify all locations load and display
   - Click a location
   - Verify popup shows name, area, asset count
   ```

3. **Test Asset Assignment:**
   ```
   - Create a new animal group
   - Assign it to a location via dropdown/map
   - Verify asset.current_location_id is set
   - Check location.asset_count increments
   ```

4. **Test Asset Movement (if implementing):**
   ```
   - Select an asset
   - Choose "Move to..." different location
   - Verify asset's current_location_id updates
   - Verify old location.asset_count decrements
   - Verify new location.asset_count increments
   ```

### Automated Tests:

```javascript
// test/locations.test.js
describe('Location API Integration', () => {
  test('creates location with GeoJSON', async () => {
    const response = await fetch('/api/v1/locations', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        data: {
          attributes: {
            name: 'Test Field',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-86.9, 39.9], [-86.9, 40.0], [-86.8, 40.0], [-86.8, 39.9], [-86.9, 39.9]]]
            }
          }
        }
      })
    });
    
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.data.attributes.name).toBe('Test Field');
    expect(data.data.attributes.location_type).toBe('polygon');
    expect(data.data.attributes.area_in_acres).toBeGreaterThan(0);
  });
  
  test('fetches all locations', async () => {
    const response = await fetch('/api/v1/locations');
    const data = await response.json();
    expect(Array.isArray(data.data)).toBe(true);
  });
  
  test('assigns asset to location', async () => {
    // Create location
    const locationResp = await fetch('/api/v1/locations', {
      method: 'POST',
      body: JSON.stringify({data: {attributes: {name: 'Barn', geometry: {type: 'Point', coordinates: [-86.9, 39.9]}}}})
    });
    const location = await locationResp.json();
    
    // Create asset at location
    const assetResp = await fetch('/api/v1/assets/animal', {
      method: 'POST',
      body: JSON.stringify({data: {attributes: {name: 'Chickens', quantity: 20, current_location_id: location.data.id}}})
    });
    const asset = await assetResp.json();
    
    expect(asset.data.attributes.current_location_id).toBe(location.data.id);
    
    // Verify location shows the asset
    const updatedLocation = await fetch(`/api/v1/locations/${location.data.id}`).then(r => r.json());
    expect(updatedLocation.data.attributes.asset_count).toBe(1);
  });
});
```

---

## Common Issues & Solutions

### Issue 1: "Geometry validation failed"
**Cause:** Sending wrong geometry format
**Solution:** Send GeoJSON with proper nesting:
```javascript
// ✅ CORRECT
geometry: {
  type: "Polygon",
  coordinates: [[[lng, lat], [lng, lat], ...]]  // Note the triple array!
}

// ❌ WRONG
geometry: {
  type: "Polygon",
  coordinates: [[lng, lat], [lng, lat], ...]  // Missing outer array
}
```

### Issue 2: "location_type is invalid"
**Cause:** Old code sending `location_type` that's not "point" or "polygon"
**Solution:** Either:
- Don't send `location_type` (auto-detected from geometry)
- Send exactly "point" or "polygon" (lowercase)

### Issue 3: "current_location_id not found"
**Cause:** Trying to assign asset to a location ID that doesn't exist
**Solution:** 
- Fetch locations first, get valid IDs
- Or allow `current_location_id: null` for unassigned assets

### Issue 4: Assets not moving
**Cause:** Creating movement log with `status: "pending"`
**Solution:** Set `status: "done"` to execute movement immediately

---

## API Endpoint Reference Card

### Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/locations` | List all locations |
| GET | `/api/v1/locations/:id` | Get single location with relationships |
| POST | `/api/v1/locations` | Create new location (GeoJSON supported!) |
| PATCH | `/api/v1/locations/:id` | Update location |
| DELETE | `/api/v1/locations/:id` | Archive location |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/assets/:type` | List assets (type: animal, plant, land, etc.) |
| GET | `/api/v1/assets/:type/:id` | Get single asset |
| POST | `/api/v1/assets/:type` | Create asset (with optional location_id) |
| PATCH | `/api/v1/assets/:type/:id` | Update asset |
| DELETE | `/api/v1/assets/:type/:id` | Delete asset |

### Logs (Movement)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/logs/:type` | List logs (type: activity, harvest, etc.) |
| POST | `/api/v1/logs/:type` | Create log (set status:"done" to execute movement) |
| PATCH | `/api/v1/logs/:type/:id` | Update log (set status:"done" to execute) |

---

## Breaking Changes

### ⚠️ These will break:
```javascript
// ❌ Will fail - is_location removed
asset.attributes.is_location

// ❌ Will fail - is_fixed removed  
asset.attributes.is_fixed

// ❌ Will fail - wrong endpoint for locations
POST /api/v1/assets/land {is_location: true}
```

### ✅ These still work:
```javascript
// ✅ Asset location tracking
asset.attributes.current_location_id

// ✅ Asset geometry (for sub-regions)
asset.attributes.geometry

// ✅ Asset quantity (for herds/flocks)
asset.attributes.quantity

// ✅ All other asset fields
asset.attributes.name, .status, .notes
```

---

## Rollback Plan

If migration causes issues:

1. **Database rollback:**
   ```bash
   docker compose run --rm web rails db:rollback STEP=2
   ```

2. **Code rollback:**
   - Revert changes to location creation code
   - Re-add `is_location` checks if needed temporarily

3. **Gradual migration:**
   - Keep both systems running in parallel
   - Migrate one feature at a time
   - Test thoroughly before removing old code

---

## Timeline

### Phase 1: Core Migration (1-2 hours)
- Update location creation to use `/api/v1/locations`
- Update location fetching
- Update location display on map
- Basic testing

### Phase 2: Asset Integration (30 min - 1 hour)
- Ensure assets reference location IDs correctly
- Update asset creation forms/UI
- Test asset-location relationships

### Phase 3: Movement Logs (Optional, 1-2 hours)
- Implement movement log creation
- Add UI for moving assets between locations
- Test automatic location updates

### Phase 4: Cleanup (30 min)
- Remove all `is_location` checks
- Remove unused code
- Update documentation
- Final testing

---

## Success Criteria

After migration is complete:

✅ User can draw farm boundaries and they save as locations  
✅ User can create point locations (barns, water sources, etc.)  
✅ Locations display on map with correct geometry  
✅ Location info shows name, area (for polygons), and asset count  
✅ User can create assets and assign them to locations  
✅ Assets show their current location  
✅ Location asset count updates when assets are added/removed  
✅ No console errors related to `is_location` or `is_fixed`  
✅ All existing data still displays correctly  

---

## Support & Questions

**Backend API Documentation:**
- Base URL: `http://localhost:3005/api/v1`
- Schema endpoint: `GET /api/v1/schema`
- API root: `GET /api/v1` (shows all available endpoints)

**For Questions:**
- Check server logs: `docker compose logs -f web`
- Test endpoints: Use curl or Postman
- Review models: `/app/models/location.rb`, `/app/models/asset.rb`

**Example curl tests:**
```bash
# Test location creation
curl -X POST http://localhost:3005/api/v1/locations \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"name":"Test","geometry":{"type":"Point","coordinates":[-86.9,39.9]}}}}'

# Test location listing
curl http://localhost:3005/api/v1/locations | jq

# Test asset creation with location
curl -X POST http://localhost:3005/api/v1/assets/animal \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"name":"Chickens","quantity":50,"current_location_id":1}}}'
```

