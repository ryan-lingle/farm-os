# Harvest Log Form - Technical Specification

## Overview

This document provides technical specifications for implementing a harvest log form in the client application. Harvest logs record when products (eggs, milk, crops, etc.) are collected from animals or plants.

## API Endpoints

### Base URL
```
/api/v1/logs
```

### Create Harvest Log
```
POST /api/v1/logs
```

### Update Harvest Log
```
PATCH /api/v1/logs/:id
```

### Complete Harvest Log
```
POST /api/v1/logs/:id/complete
```

## Data Model

### Request Payload Structure

```json
{
  "log": {
    "log_type": "harvest",
    "name": "Morning egg collection",
    "timestamp": "2025-10-23T10:30:00Z",
    "status": "pending",
    "notes": "Found one double-yolker",
    "to_location_id": 123,
    "asset_ids": [456, 789],
    "asset_roles": {
      "456": "source",
      "789": "source"
    },
    "quantities_attributes": [
      {
        "value": 12,
        "unit": "eggs",
        "quantity_type": "count"
      }
    ]
  }
}
```

### Field Specifications

| Field | Type | Required | Description | Default |
|-------|------|----------|-------------|---------|
| `log_type` | string | Yes | Must be `"harvest"` | - |
| `name` | string | Yes | User-friendly name for this harvest | - |
| `timestamp` | ISO8601 datetime | No | When the harvest occurred | Current time |
| `status` | string | No | `"pending"` or `"done"` | `"pending"` |
| `notes` | text | No | Additional notes about the harvest | - |
| `to_location_id` | integer | No | Where harvested items are stored | Source asset's location |
| `asset_ids` | array[integer] | Yes | IDs of assets being harvested from | - |
| `asset_roles` | object | No | Maps asset IDs to roles (should be `"source"`) | All assets get `"source"` role |
| `quantities_attributes` | array[object] | Yes | Harvest quantities (typically one) | - |

### Quantities Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | decimal | Yes | Numeric amount harvested |
| `unit` | string | Yes | Unit of measurement (see units below) |
| `quantity_type` | string | No | Type classification (e.g., "count", "weight", "volume") |

### Supported Units

The `unit` field determines what type of output asset is created:

| Unit Values | Output Asset Type | Example Use Case |
|-------------|-------------------|------------------|
| `egg`, `eggs`, `dozen` | `egg` | Chicken/duck egg collection |
| `liter`, `liters`, `l`, `gallon`, `gallons` | `milk` | Dairy milk collection |
| `lb`, `lbs`, `kg`, `pound`, `pounds`, `kilogram`, `kilograms` | `harvest` | Crop/produce harvest by weight |
| *any other unit* | `product` | Generic harvested product |

## Workflow

### 1. Create Pending Harvest Log

Users can create a harvest log in `pending` status for later completion:

```
POST /api/v1/logs
```

**Request:**
```json
{
  "log": {
    "log_type": "harvest",
    "name": "Afternoon egg collection",
    "status": "pending",
    "asset_ids": [101, 102, 103],
    "quantities_attributes": [
      {
        "value": 8,
        "unit": "eggs"
      }
    ]
  }
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "555",
    "type": "log",
    "attributes": {
      "log_type": "harvest",
      "name": "Afternoon egg collection",
      "timestamp": "2025-10-23T15:30:00Z",
      "status": "pending",
      "notes": null,
      "to_location_id": null,
      "from_location_id": null
    },
    "relationships": {
      "source_assets": {
        "data": [
          {"id": "101", "type": "asset"},
          {"id": "102", "type": "asset"},
          {"id": "103", "type": "asset"}
        ]
      },
      "quantities": {
        "data": [
          {"id": "777", "type": "quantity"}
        ]
      }
    }
  },
  "included": [...]
}
```

### 2. Complete Harvest Log

Completing a harvest log triggers automatic processing:

```
POST /api/v1/logs/:id/complete
```

**What Happens:**

1. ✅ Log status changes to `"done"`
2. ✅ `HarvestProcessor` runs:
   - Finds or creates output asset (e.g., "Eggs from Henrietta")
   - Increments output asset quantity by harvested amount
   - Links output asset to log with `role: "output"`
   - Sets output asset location to `to_location_id` (or source location)
3. ✅ `FactEmitter` runs:
   - Creates `yield` facts for each source asset
   - Records timestamp, quantity, and unit
4. ✅ Returns updated log with output assets included

**Request:**
```
POST /api/v1/logs/555/complete
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": "555",
    "type": "log",
    "attributes": {
      "status": "done",
      ...
    },
    "relationships": {
      "source_assets": {
        "data": [...]
      },
      "output_assets": {
        "data": [
          {"id": "888", "type": "asset"}
        ]
      },
      "facts": {
        "data": [
          {"id": "999", "type": "fact"}
        ]
      }
    }
  },
  "included": [
    {
      "id": "888",
      "type": "asset",
      "attributes": {
        "name": "Egg from Henrietta",
        "asset_type": "egg",
        "quantity": 8,
        "status": "active",
        "parent_id": 101
      }
    },
    {
      "id": "999",
      "type": "fact",
      "attributes": {
        "subject_id": 101,
        "predicate_id": 10,
        "value_numeric": 8.0,
        "unit": "eggs",
        "observed_at": "2025-10-23T15:30:00Z"
      }
    }
  ]
}
```

### 3. Direct Complete (Skip Pending)

Create and complete in one request:

```json
{
  "log": {
    "log_type": "harvest",
    "name": "Morning milk collection",
    "status": "done",
    "asset_ids": [200],
    "to_location_id": 50,
    "quantities_attributes": [
      {
        "value": 5.5,
        "unit": "liters"
      }
    ]
  }
}
```

Or create as pending, then call `/complete` endpoint separately.

## Form Implementation Guide

### Recommended Form Fields

```
┌─────────────────────────────────────────────┐
│ Create Harvest Log                          │
├─────────────────────────────────────────────┤
│                                             │
│ Name *                                      │
│ [_____________________________________]     │
│                                             │
│ Date & Time *                               │
│ [Oct 23, 2025] [10:30 AM]                   │
│                                             │
│ Harvested From (Source Assets) *            │
│ [Multi-select dropdown           ▼]        │
│   ☐ Henrietta (Chicken #101)                │
│   ☐ Clucky (Chicken #102)                   │
│   ☐ Daisy (Duck #103)                       │
│   ...                                       │
│                                             │
│ Harvest Amount *                            │
│ Quantity: [____] Unit: [eggs    ▼]          │
│                                             │
│ Storage Location (optional)                 │
│ [Select location...          ▼]             │
│   ○ Use source location (default)           │
│   ○ Egg Cooler (#123)                       │
│   ○ Cold Storage (#124)                     │
│   ...                                       │
│                                             │
│ Notes                                       │
│ [_____________________________________]     │
│ [_____________________________________]     │
│                                             │
│ [Cancel] [Save as Pending] [Save & Complete]│
└─────────────────────────────────────────────┘
```

### Validation Rules

**Client-side:**
- ✅ Name: Required, 1-255 characters
- ✅ At least one source asset selected
- ✅ Quantity value > 0
- ✅ Unit is not empty
- ✅ Timestamp is valid date/time

**Server-side validation** will also enforce these rules.

### Fetching Available Assets

Get assets that can be harvested from:

```
GET /api/v1/assets?filter[asset_type]=animal&filter[status]=active
GET /api/v1/assets?filter[asset_type]=plant&filter[status]=active
```

Or combine:
```
GET /api/v1/assets?filter[status]=active&filter[asset_type][]=animal&filter[asset_type][]=plant
```

### Fetching Locations

```
GET /api/v1/locations
```

### Unit Suggestions

Provide autocomplete/dropdown with common units:

**For Animals:**
- eggs, dozen
- liters, gallons (milk)
- lb, kg (meat)

**For Plants:**
- lb, lbs, kg
- bushel, bushels
- ton, tons

## Example User Flows

### Flow 1: Quick Egg Collection

1. User opens "New Harvest" form
2. Fills in:
   - Name: "Morning eggs"
   - Selects 3 chickens as source
   - Quantity: 12 eggs
3. Clicks "Save & Complete"
4. System creates log, processes harvest:
   - Creates/updates "Egg from Chicken #1", "Egg from Chicken #2", etc.
   - Adds 12 to total egg inventory
   - Creates yield facts for each chicken
5. User sees success message with inventory update

### Flow 2: Deferred Milk Collection

1. User creates pending harvest:
   - Name: "Evening milking"
   - Source: Bessie the cow
   - Status: pending
2. Later, updates quantity and completes:
   - Updates quantity: 6.5 liters
   - Calls `/complete`
3. System processes as above

### Flow 3: Crop Harvest with Custom Location

1. User harvests tomatoes:
   - Source: Tomato Plant #45
   - Quantity: 25 lbs
   - Location: Cold Storage
2. System creates "harvest" asset type at Cold Storage
3. Links to source plant

## Error Handling

### Common Error Responses

**Missing required fields:**
```json
{
  "errors": [
    {
      "status": "422",
      "title": "Validation failed",
      "detail": "Name can't be blank"
    }
  ]
}
```

**Invalid asset:**
```json
{
  "errors": [
    {
      "status": "404",
      "title": "Asset not found",
      "detail": "Asset with id=999 not found"
    }
  ]
}
```

**Processing failure:**
```json
{
  "errors": [
    {
      "status": "422",
      "title": "Processing failed",
      "detail": "Failed to process harvest: [error message]"
    }
  ]
}
```

## Testing Checklist

- [ ] Create harvest with single source asset
- [ ] Create harvest with multiple source assets
- [ ] Create harvest without to_location (uses source location)
- [ ] Create harvest with explicit to_location
- [ ] Create as pending, complete later
- [ ] Create as done (direct complete)
- [ ] Verify output assets are created
- [ ] Verify output asset quantities increment correctly
- [ ] Verify facts are emitted for each source asset
- [ ] Different unit types create correct asset types (egg, milk, harvest, product)
- [ ] Validation errors display correctly
- [ ] Form pre-fills timestamp to current time
- [ ] Can edit timestamp before submission

## Notes

- **Output Asset Naming:** The system automatically creates output assets named like "Egg from [Source Name]"
- **Inventory Tracking:** Output assets have a `quantity` field that accumulates over multiple harvests
- **Parent Relationships:** Output assets are linked to source assets via `parent_id`
- **Role-based Associations:** The system uses roles (`source`, `output`) to distinguish asset relationships
- **Fact Emission:** All completed harvest logs emit `yield` facts for analytics/reporting

## Questions?

Contact the backend team for:
- Additional endpoint details
- Complex filtering requirements
- Bulk operations
- Custom fact types

