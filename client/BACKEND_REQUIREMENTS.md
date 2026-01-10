# Backend API Requirements for Full Integration

## 🚨 Missing Endpoint: Locations API

Your farmAPI backend at `localhost:3005` currently **does not have a locations endpoint**. When I tested `/api/v1/locations`, it returned **404 Not Found**.

### Required Locations Endpoint

You need to add a locations resource to your backend. Here are the requirements:

#### Endpoints Needed:
```
GET    /api/v1/locations          # List all locations
GET    /api/v1/locations/:id      # Get single location
POST   /api/v1/locations          # Create new location
PATCH  /api/v1/locations/:id      # Update location
DELETE /api/v1/locations/:id      # Delete location
```

#### Data Structure:

**Request Body (POST/PATCH):**
```json
{
  "name": "North Field",
  "description": "Main crop field",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [-84.1234, 40.5678],
        [-84.1235, 40.5679],
        [-84.1236, 40.5678],
        [-84.1234, 40.5678]
      ]
    ]
  },
  "contours": {
    "enabled": true,
    "interval": 20,
    "colorScheme": "rainbow"
  }
}
```

**Response Format:**
```json
{
  "data": {
    "id": "1",
    "type": "location",
    "attributes": {
      "name": "North Field",
      "description": "Main crop field",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "contours": {
        "enabled": true,
        "interval": 20,
        "colorScheme": "rainbow"
      },
      "created_at": "2025-10-21T12:00:00Z",
      "updated_at": "2025-10-21T12:00:00Z"
    }
  }
}
```

**List Response:**
```json
{
  "data": [
    { "id": "1", "type": "location", "attributes": {...} },
    { "id": "2", "type": "location", "attributes": {...} }
  ],
  "meta": {
    "total": 2
  },
  "links": {
    "self": "http://localhost:3005/api/v1/locations?page=1",
    "first": "http://localhost:3005/api/v1/locations?page=1",
    "last": "http://localhost:3005/api/v1/locations?page=1"
  }
}
```

### Database Schema Recommendation

Create a `locations` table with these columns:

```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  geometry JSONB NOT NULL,  -- Store GeoJSON geometry
  contours JSONB,           -- Store contour settings
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add GIS index if using PostGIS
CREATE INDEX idx_locations_geometry ON locations USING GIST ((geometry::geometry));
```

### Alternative: Use Land Assets

If you prefer to leverage farmOS's existing structure, you could store locations as **Land Assets** with geometry:

```
POST /api/v1/assets/land
```

With payload:
```json
{
  "name": "North Field",
  "notes": "Main crop field",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[...]]
  },
  "is_location": true,
  "is_fixed": true
}
```

Then modify the client to use `/api/v1/assets/land?is_location=true` instead of `/api/v1/locations`.

---

## 🗺️ Contour Lines Issue

The contours are not showing because of how Mapbox terrain data works. Here's what's happening:

### Current Issues:

1. **Terrain source requires specific map styles** - The `mapbox-terrain-v2` vector source only works well with satellite/terrain styles
2. **The 'within' filter is complex** - Filtering contours to only show within a polygon is technically challenging
3. **Outdoor style has limited terrain data** - The outdoors style you're using doesn't render terrain contours well

### Solutions:

#### Option 1: Simplify - Show All Contours (Recommended)
Remove the polygon clipping and just show elevation contours across the entire map view:

```typescript
filter: [
  'all',
  ['>', ['get', 'ele'], 0],
  ['==', ['%', ['get', 'ele'], location.contours.interval], 0]
  // Remove the ['within', polygonFeature] line
]
```

#### Option 2: Use Hillshade Instead
Replace contour lines with hillshade (relief shading):

```typescript
map.current.addLayer({
  id: 'hillshade',
  type: 'hillshade',
  source: 'mapbox-dem',
  paint: {
    'hillshade-exaggeration': 0.5,
    'hillshade-shadow-color': '#000000'
  }
});
```

#### Option 3: Client-Side Contour Generation
Use a library like `d3-contour` to generate contours from elevation data, but this is much more complex.

### Quick Fix:

The easiest fix is to show contours globally (not clipped to polygon) when the user enables them. The polygon clipping feature is nice-to-have but not essential.

---

## Summary

### ✅ Currently Working:
- Assets API (animals, plants, equipment, compost)
- Logs API (harvest, activity, input, maintenance, observation)
- Map display and drawing
- Address search

### ❌ Needs Backend Work:
1. **Locations API** - Create `/api/v1/locations` endpoint (or use land assets)
2. **Land asset geometry support** - Ensure land assets can store GeoJSON geometry

### ⚠️ Contours (Client-Side):
- Current implementation is complex and may not work as expected
- Recommend simplifying to show all contours in view
- Or switch to hillshade for terrain visualization

---

## What I Can Do Right Now:

1. **Fix contours** - Simplify to show all contours (not clipped to polygon)
2. **Wire up locations to land assets** - Use land assets as a workaround
3. **Create a locations endpoint spec** - Detailed spec for your backend developer

Would you like me to proceed with any of these?

