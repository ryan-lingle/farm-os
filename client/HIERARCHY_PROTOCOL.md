# farmAPI Hierarchy Protocol

## Overview
This document describes how to work with nested hierarchies in farmAPI for both Assets and Locations. Both resource types support self-referential parent-child relationships, enabling you to build complex organizational structures.

## Table of Contents
- [Core Concepts](#core-concepts)
- [Asset Hierarchies](#asset-hierarchies)
- [Location Hierarchies](#location-hierarchies)
- [API Endpoints](#api-endpoints)
- [Response Format](#response-format)
- [Common Use Cases](#common-use-cases)
- [Best Practices](#best-practices)

---

## Core Concepts

### Hierarchy Structure
Both Assets and Locations use a **parent-child** relationship model:
- Each resource can have ONE parent (or none, making it a root)
- Each resource can have MANY children
- This creates a tree structure with multiple possible roots

### Key Attributes
Every hierarchical resource includes:
- `parent_id` - ID of the parent resource (null for root items)
- `depth` - How many levels deep in the hierarchy (0 for root)
- `is_root` - Boolean indicating if this is a top-level item
- `is_leaf` - Boolean indicating if this has no children
- `child_count` - Number of direct children

---

## Asset Hierarchies

### Use Cases
- **Equipment Groups**: Tractor → Implements (plow, seeder, trailer)
- **Livestock Groups**: Herd → Individual Animals
- **Plant Collections**: Orchard → Sections → Individual Trees
- **Container Hierarchies**: Barn → Pens → Individual animals

### Creating a Parent Asset
```http
POST /api/v1/assets/animal
Content-Type: application/json

{
  "data": {
    "type": "asset",
    "attributes": {
      "name": "Main Cattle Herd",
      "notes": "Primary beef cattle group"
    }
  }
}
```

### Creating a Child Asset
```http
POST /api/v1/assets/animal
Content-Type: application/json

{
  "data": {
    "type": "asset",
    "attributes": {
      "name": "Bessie",
      "notes": "Individual cow",
      "parent_id": 123
    }
  }
}
```

### Moving an Asset in the Hierarchy
```http
PATCH /api/v1/assets/animal/456
Content-Type: application/json

{
  "data": {
    "type": "asset",
    "attributes": {
      "parent_id": 789
    }
  }
}
```

### Removing from Hierarchy (Make Root)
```http
PATCH /api/v1/assets/animal/456
Content-Type: application/json

{
  "data": {
    "type": "asset",
    "attributes": {
      "parent_id": null
    }
  }
}
```

### Querying Assets by Hierarchy

**Get all root assets (no parent):**
```http
GET /api/v1/assets/animal?filter[root_only]=true
```

**Get children of a specific asset:**
```http
GET /api/v1/assets/animal?filter[parent_id]=123
```

**Get a single asset with its parent and children:**
```http
GET /api/v1/assets/animal/123?include=parent,children
```

---

## Location Hierarchies

### Use Cases
- **Farm Organization**: Farm → Fields → Paddocks
- **Building Structures**: Barn → Rooms → Stalls
- **Geographic Divisions**: Region → Farm → Zones
- **Greenhouse Layout**: Greenhouse → Sections → Benches

### Creating a Parent Location
```http
POST /api/v1/locations
Content-Type: application/json

{
  "data": {
    "type": "location",
    "attributes": {
      "name": "North Farm",
      "location_type": "polygon",
      "geometry": [
        {"latitude": 40.7128, "longitude": -74.0060},
        {"latitude": 40.7138, "longitude": -74.0060},
        {"latitude": 40.7138, "longitude": -74.0050},
        {"latitude": 40.7128, "longitude": -74.0050}
      ]
    }
  }
}
```

### Creating a Child Location
```http
POST /api/v1/locations
Content-Type: application/json

{
  "data": {
    "type": "location",
    "attributes": {
      "name": "Field A",
      "location_type": "polygon",
      "parent_id": 123,
      "geometry": [
        {"latitude": 40.7130, "longitude": -74.0058},
        {"latitude": 40.7135, "longitude": -74.0058},
        {"latitude": 40.7135, "longitude": -74.0052},
        {"latitude": 40.7130, "longitude": -74.0052}
      ]
    }
  }
}
```

### Querying Locations by Hierarchy

**Get all root locations:**
```http
GET /api/v1/locations?filter[root_only]=true
```

**Get children of a specific location:**
```http
GET /api/v1/locations?filter[parent_id]=123
```

**Get a location with related data:**
```http
GET /api/v1/locations/123?include=parent,children,assets
```

---

## API Endpoints

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/assets/:type` | List assets (supports hierarchy filters) |
| GET | `/api/v1/assets/:type/:id` | Get single asset with hierarchy info |
| POST | `/api/v1/assets/:type` | Create asset (optionally with parent_id) |
| PATCH | `/api/v1/assets/:type/:id` | Update asset (can change parent_id) |
| DELETE | `/api/v1/assets/:type/:id` | Archive asset (children are not affected) |

### Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/locations` | List locations (supports hierarchy filters) |
| GET | `/api/v1/locations/:id` | Get single location with hierarchy info |
| POST | `/api/v1/locations` | Create location (optionally with parent_id) |
| PATCH | `/api/v1/locations/:id` | Update location (can change parent_id) |
| DELETE | `/api/v1/locations/:id` | Archive location (children are not affected) |

### Query Parameters
| Parameter | Description | Example |
|-----------|-------------|---------|
| `filter[parent_id]` | Get children of specific parent | `?filter[parent_id]=123` |
| `filter[root_only]` | Get only root items (no parent) | `?filter[root_only]=true` |
| `include` | Include related resources | `?include=parent,children` |

---

## Response Format

### Asset Response (with hierarchy)
```json
{
  "data": {
    "id": "456",
    "type": "asset",
    "attributes": {
      "name": "Bessie",
      "asset_type": "animal",
      "status": "active",
      "parent_id": 123,
      "depth": 1,
      "is_root": false,
      "is_leaf": true,
      "child_count": 0,
      "current_location_id": 789,
      "created_at": "2025-10-22T10:00:00Z",
      "updated_at": "2025-10-22T10:00:00Z"
    },
    "relationships": {
      "parent": {
        "data": {
          "id": "123",
          "type": "asset"
        }
      },
      "children": {
        "data": []
      },
      "current_location": {
        "data": {
          "id": "789",
          "type": "location"
        }
      }
    }
  }
}
```

### Location Response (with hierarchy)
```json
{
  "data": {
    "id": "123",
    "type": "location",
    "attributes": {
      "name": "Field A",
      "location_type": "polygon",
      "status": null,
      "parent_id": 100,
      "depth": 1,
      "is_root": false,
      "is_leaf": false,
      "child_count": 3,
      "asset_count": 5,
      "total_asset_count": 12,
      "area_in_acres": 10.5,
      "geometry": [...],
      "created_at": "2025-10-22T10:00:00Z",
      "updated_at": "2025-10-22T10:00:00Z"
    },
    "relationships": {
      "parent": {
        "data": {
          "id": "100",
          "type": "location"
        }
      },
      "children": {
        "data": [
          {"id": "124", "type": "location"},
          {"id": "125", "type": "location"},
          {"id": "126", "type": "location"}
        ]
      },
      "assets": {
        "data": [...]
      }
    }
  }
}
```

### Special Attributes Explained

#### For Assets:
- `depth` - Number of ancestors (0 = root, 1 = child of root, etc.)
- `is_root` - True if `parent_id` is null
- `is_leaf` - True if asset has no children
- `child_count` - Number of direct children

#### For Locations:
- `depth` - Number of ancestors
- `is_root` - True if `parent_id` is null
- `is_leaf` - True if location has no children
- `child_count` - Number of direct children
- `asset_count` - Number of assets directly in THIS location
- `total_asset_count` - Number of assets in this location AND all descendant locations

---

## Common Use Cases

### 1. Building a Tree View
**Fetch root items first:**
```http
GET /api/v1/assets/animal?filter[root_only]=true
```

**Then fetch children on-demand:**
```http
GET /api/v1/assets/animal?filter[parent_id]=123
```

### 2. Displaying Breadcrumbs
When you GET a single resource, traverse the `parent` relationship:
```
GET /api/v1/locations/456?include=parent
```

Then follow parent references recursively to build breadcrumbs:
```
Farm > North Field > Paddock A
```

### 3. Moving Assets with Their Location
You can move an asset in BOTH hierarchies:
```json
{
  "data": {
    "type": "asset",
    "attributes": {
      "parent_id": 999,
      "current_location_id": 777
    }
  }
}
```

### 4. Organizing by Location Hierarchy
**Scenario**: Show all assets in a farm and its sub-locations

1. GET the location (includes `total_asset_count`)
2. GET assets filtered by current_location_id for each child location
3. Or use the `all_assets` method server-side (not exposed via API directly, but included in counts)

### 5. Creating Nested Structures in Bulk
**Create parent first:**
```http
POST /api/v1/locations
{"name": "Main Barn"}
// Response: {id: 100}
```

**Then create children:**
```http
POST /api/v1/locations
{"name": "Stall 1", "parent_id": 100}

POST /api/v1/locations
{"name": "Stall 2", "parent_id": 100}
```

---

## Best Practices

### 1. Avoid Deep Nesting
- Keep hierarchies to 3-5 levels maximum for performance
- Very deep trees can cause slow recursive queries

### 2. Use Root Filtering
- When displaying navigation, start with `filter[root_only]=true`
- Load children lazily as users expand nodes

### 3. Handle Orphans
- When deleting/archiving a parent, children become orphans (parent_id remains set)
- Decide your UX: auto-promote children to root, or prevent deletion

### 4. Validate Parent Relationships
- Don't allow circular references (parent can't be descendant)
- The API will prevent setting `parent_id` to the asset/location's own ID
- For deeper validation, check ancestry before updating

### 5. Combine with Location Relationships
Assets have TWO hierarchy systems:
- **Asset hierarchy** (via `parent_id` on asset)
- **Location hierarchy** (via `current_location_id` pointing to a location)

Use both together:
- Asset hierarchy for organizational grouping
- Location for physical placement

Example: "Bessie" (asset) is part of "Main Herd" (parent asset) and located in "North Pasture" (location)

### 6. Performance Considerations
- Use pagination when fetching children of popular parents
- Consider caching depth/counts for frequently accessed items
- For rendering full trees, make multiple parallel requests rather than recursive single requests

### 7. Handling Moves
When moving items in hierarchy:
```json
// Move asset from one parent to another
PATCH /api/v1/assets/animal/123
{
  "parent_id": 456  // New parent
}

// Make asset a root (remove from hierarchy)
PATCH /api/v1/assets/animal/123
{
  "parent_id": null
}
```

---

## Model Methods (Server-Side Reference)

While not directly exposed via API, understanding the underlying model methods helps:

### Asset & Location Models Both Have:
- `ancestors` - Returns array of all ancestors (parent, grandparent, etc.)
- `descendants` - Returns array of all descendants (children, grandchildren, etc.)
- `root` - Returns the top-level ancestor
- `root?` - Boolean, true if no parent
- `leaf?` - Boolean, true if no children
- `siblings` - Returns other children of the same parent
- `depth` - Integer, number of levels from root

### Location-Specific:
- `all_assets` - Returns assets in this location AND all child locations

These methods are used to compute the attributes returned in the API responses.

---

## Migration Notes

### For Existing Data
If you have existing assets or locations, they will all have `parent_id: null` initially (making them all roots). You can:

1. **Manually organize** via PATCH requests to set parent_id
2. **Bulk import** hierarchy via custom scripts
3. **Gradually build** hierarchy as you work with the system

### Database Schema
The migrations add:
- `parent_id` column to `assets` table
- `parent_id` column to `locations` table
- Foreign key constraints (self-referential)
- Indexes on parent_id for query performance

---

## Error Handling

### Common Errors

**Circular Reference:**
```json
{
  "errors": [
    {
      "title": "Invalid parent_id",
      "detail": "Cannot set parent to self or descendant"
    }
  ]
}
```

**Invalid Parent ID:**
```json
{
  "errors": [
    {
      "title": "Parent not found",
      "detail": "parent_id 999 does not exist"
    }
  ]
}
```

**Type Mismatch:**
```json
{
  "errors": [
    {
      "title": "Invalid relationship",
      "detail": "Cannot set asset parent_id to a location ID"
    }
  ]
}
```

---

## Examples

### Example 1: Farm Location Hierarchy
```
Root Farm (id: 1)
├── North Section (id: 2, parent_id: 1)
│   ├── Field A (id: 3, parent_id: 2)
│   └── Field B (id: 4, parent_id: 2)
└── South Section (id: 5, parent_id: 1)
    └── Greenhouse (id: 6, parent_id: 5)
```

### Example 2: Livestock Asset Hierarchy
```
Cattle Operation (id: 100, asset_type: animal)
├── Breeding Herd (id: 101, parent_id: 100)
│   ├── Bessie (id: 102, parent_id: 101)
│   ├── Daisy (id: 103, parent_id: 101)
│   └── Mabel (id: 104, parent_id: 101)
└── Calves 2025 (id: 105, parent_id: 100)
    ├── Calf 001 (id: 106, parent_id: 105)
    └── Calf 002 (id: 107, parent_id: 105)
```

### Example 3: Combined Hierarchies
An asset can exist in BOTH hierarchies simultaneously:

**Asset Hierarchy:**
- Bessie (id: 102) is child of Breeding Herd (id: 101)

**Location Assignment:**
- Bessie (id: 102) has `current_location_id: 3` (Field A)
- Field A (id: 3) is child of North Section (id: 2)

This gives you maximum flexibility for organization!

---

## Troubleshooting

### My hierarchy isn't showing up
- Verify `parent_id` is set correctly
- Check that you're including `?include=parent,children` in requests
- Ensure you're looking at the `relationships` section of the JSON response

### Performance is slow with large trees
- Use pagination on child queries
- Implement lazy loading (fetch children only when expanded)
- Consider caching frequently accessed branches

### I can't delete a parent with children
- The API allows this - children become orphans with their parent_id still set
- You may want to handle this in your UI by warning users
- Or build a custom endpoint to cascade operations

---

## Summary

The farmAPI hierarchy system gives you powerful tools to organize both Assets and Locations in nested structures. Key points:

✅ Both assets and locations support parent-child relationships  
✅ Query by `parent_id` or `root_only` to navigate hierarchies  
✅ Rich metadata (depth, is_root, is_leaf, child_count) included in responses  
✅ Combine asset hierarchy with location hierarchy for maximum flexibility  
✅ Use JSONAPI `include` parameter to fetch related items efficiently  

For questions or issues, refer to the main farmAPI documentation or open an issue on the repository.

