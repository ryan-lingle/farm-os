# Harvest Log Implementation

## Overview

A comprehensive harvest log form has been implemented following the technical specification provided. This allows users to record harvests from animals and plants with full support for:

- Multiple source assets
- Quantity tracking with various units
- Optional storage locations
- Pending/completed workflow
- Automatic output asset creation
- Fact emission for analytics

## Implementation Summary

### Files Created

1. **`src/components/HarvestLogForm.tsx`**
   - Specialized form component for creating harvest logs
   - Multi-asset selection with checkboxes
   - Quantity input with unit selection
   - Optional storage location selection
   - Two save modes: "Save as Pending" and "Save & Complete"

2. **`src/components/HarvestLogPage.tsx`**
   - Full-featured harvest log management page
   - Statistics cards (Total, This Month, Pending, Completed)
   - List view with status badges
   - Complete button for pending harvests
   - Detailed view dialog with relationships tab

### Files Modified

1. **`src/lib/api.ts`**
   - Added `Quantity` interface for quantity tracking
   - Extended `Log` interface with harvest-specific fields:
     - `to_location_id` and `from_location_id`
     - `source_assets`, `output_assets`, `quantities` relationships
   - Updated `logsApi.create()` to handle harvest log payload structure
   - Added `logsApi.complete()` endpoint for completing harvest logs

2. **`src/hooks/useLogs.ts`**
   - Added `useCompleteLog()` hook for completing harvest logs
   - Invalidates asset queries when harvest is completed (for output assets)

3. **`src/pages/records/logs/Harvest.tsx`**
   - Replaced generic log page with specialized `HarvestLogPage`

## Features Implemented

### ✅ Form Fields

- [x] **Name** - Required, user-friendly harvest name
- [x] **Date & Time** - ISO8601 timestamp, defaults to current time
- [x] **Source Assets** - Multi-select checkboxes for animals and plants
- [x] **Harvest Amount** - Quantity value and unit selection
- [x] **Storage Location** - Optional custom location or use source location
- [x] **Notes** - Additional text notes
- [x] **Status** - Pending or Done (via two buttons)

### ✅ Supported Units

The form includes all units from the specification:

**For Animals:**
- eggs, dozen (creates `egg` asset type)
- liters, gallons (creates `milk` asset type)
- lb, lbs, kg, etc. (creates `harvest` asset type)

**For Plants:**
- lb, lbs, kg, pounds, kilograms
- bushel, bushels
- ton, tons

**Unit Types:**
- Count (eggs, dozen)
- Volume (liters, gallons, bushels)
- Weight (lbs, kg, tons)

### ✅ Workflows

**1. Quick Complete**
- Fill form
- Click "Save & Complete"
- Creates log with `status: "done"`
- Backend processes harvest immediately

**2. Pending → Complete**
- Fill form
- Click "Save as Pending"
- Creates log with `status: "pending"`
- Later, click "Complete" button on the log
- Backend processes harvest

**3. Complete from Detail View**
- Open a pending harvest log
- Click "Complete Harvest" button in detail dialog
- Backend processes harvest

### ✅ Data Model

The form submits data in the exact format specified:

```typescript
{
  log: {
    log_type: "harvest",
    name: "Morning egg collection",
    timestamp: "2025-10-23T10:30:00Z",
    status: "pending" | "done",
    notes: "Additional notes...",
    to_location_id: 123,
    asset_ids: [456, 789],
    asset_roles: {
      "456": "source",
      "789": "source"
    },
    quantities_attributes: [
      {
        value: 12,
        unit: "eggs",
        quantity_type: "count"
      }
    ]
  }
}
```

### ✅ UI/UX Features

**List View:**
- Status badges (Completed/Pending) with icons
- Source asset count badges
- Complete button for pending harvests
- Timestamp display
- Notes preview

**Detail View:**
- Two tabs: Details and Relationships
- Status display with visual indicators
- Timestamp formatting
- Created/Updated metadata
- Related assets display (source, output, quantities)
- Delete confirmation dialog
- Complete button (for pending harvests)

**Statistics Cards:**
- Total Harvests
- This Month
- Pending Count (yellow)
- Completed Count (green)

**Form Validation:**
- Required field indicators (*)
- Client-side validation:
  - Name required
  - At least one source asset required
  - Quantity > 0 required
  - Valid timestamp required
- Empty state when no assets available

### ✅ Asset Selection

**Multi-Select Interface:**
- Checkboxes for each asset
- Grouped by type (Animals, Plants)
- Shows asset name, type, and ID
- Selection count indicator
- Scrollable list for many assets
- Only shows active assets

**Filtering:**
- Only animals and plants (harvestable assets)
- Only active status assets
- Excludes archived/inactive assets

### ✅ Location Selection

**Two Modes:**
1. **Default** - Use source asset location (checkbox selected by default)
2. **Custom** - Select specific storage location from dropdown

**Features:**
- Radio-style checkboxes for mode selection
- Dropdown only appears when custom mode selected
- Shows all available locations
- Loading state during fetch

## API Integration

### Endpoints Used

```typescript
// Create harvest log
POST /api/v1/logs
Body: { log: { log_type: "harvest", ... } }

// Complete harvest log
POST /api/v1/logs/:id/complete

// Delete harvest log
DELETE /api/v1/logs/:id

// List harvest logs
GET /api/v1/logs/harvest?page=1&per_page=50

// Get source assets (animals and plants)
GET /api/v1/assets/animal?page=1&per_page=100
GET /api/v1/assets/plant?page=1&per_page=100

// Get locations for storage selection
GET /api/v1/locations?page=1&per_page=100
```

### Backend Processing

When a harvest log is completed (either directly or via `/complete` endpoint), the backend:

1. Sets log `status` to `"done"`
2. Runs `HarvestProcessor`:
   - Creates/updates output assets (e.g., "Egg from Chicken #1")
   - Increments quantity on output assets
   - Links output assets to log with `role: "output"`
   - Sets output asset location to `to_location_id` or source location
3. Runs `FactEmitter`:
   - Creates `yield` facts for each source asset
   - Records timestamp, quantity, and unit
4. Returns updated log with relationships included

## Usage Examples

### Example 1: Morning Egg Collection

1. Click "New Harvest" button
2. Enter name: "Morning eggs"
3. Select 3 chickens from the list
4. Enter quantity: 12, unit: eggs
5. Use default location (chickens' current location)
6. Click "Save & Complete"

**Result:**
- Creates harvest log
- Creates/updates egg assets for each chicken
- Adds 12 eggs to inventory
- Creates yield facts for each chicken

### Example 2: Deferred Milk Collection

1. Click "New Harvest" button
2. Enter name: "Evening milking"
3. Select "Bessie the Cow"
4. Enter quantity: 0 (will update later)
5. Click "Save as Pending"
6. (Later) Find the pending harvest in list
7. Click "Complete" button
8. Backend processes harvest

### Example 3: Crop Harvest with Custom Storage

1. Click "New Harvest" button
2. Enter name: "Tomato harvest"
3. Select "Tomato Plant #45"
4. Enter quantity: 25, unit: lbs
5. Select "Store at specific location"
6. Choose "Cold Storage" from dropdown
7. Add note: "Some tomatoes still green"
8. Click "Save & Complete"

**Result:**
- Creates harvest asset at Cold Storage location
- Links to source plant
- Records 25 lbs harvested

## Testing Checklist

Based on the specification, here's what to test:

- [x] Create harvest with single source asset
- [x] Create harvest with multiple source assets
- [x] Create harvest without to_location (uses source location)
- [x] Create harvest with explicit to_location
- [x] Create as pending, complete later
- [x] Create as done (direct complete)
- [ ] Verify output assets are created (requires backend)
- [ ] Verify output asset quantities increment (requires backend)
- [ ] Verify facts are emitted (requires backend)
- [x] Different unit types (eggs, milk, harvest, product)
- [x] Form validation (required fields, positive quantity)
- [x] Form pre-fills timestamp to current time
- [x] Can edit timestamp before submission
- [x] Empty state when no assets
- [x] Loading states during data fetch
- [x] Status badges and visual indicators
- [x] Complete button only shows for pending

## Architecture

### Component Hierarchy

```
Harvest.tsx (Page)
  └─ HarvestLogPage.tsx (Main Component)
      ├─ Statistics Cards
      ├─ Harvest List
      │   ├─ Status Badges
      │   ├─ Complete Buttons
      │   └─ Delete Dialogs
      ├─ HarvestLogForm.tsx (Create Dialog)
      │   ├─ Asset Selection (Checkboxes)
      │   ├─ Quantity Input
      │   ├─ Location Selection
      │   └─ Save Buttons (Pending/Complete)
      └─ Detail Dialog
          ├─ Details Tab
          └─ Relationships Tab
```

### Data Flow

```
User Input
  → HarvestLogForm (validation)
  → useCreateLog hook
  → logsApi.create() (API call)
  → Backend processing
  ← API response (created log)
  ← React Query invalidation
  ← Toast notification
  → UI update (list refreshes)
```

### State Management

- **Form State** - Local React state in HarvestLogForm
- **Server State** - React Query for logs, assets, locations
- **Selected Assets** - Set<string> for efficient add/remove
- **Form Visibility** - Dialog open/close state
- **Selected Log** - Currently viewed log in detail dialog

## Error Handling

### Client-Side

- Required field validation before submit
- Quantity > 0 validation
- At least one asset required
- Timestamp validation (datetime-local input)
- Alert dialogs for destructive actions

### Server-Side

- API errors caught by React Query
- Toast notifications for success/error
- Error messages displayed from API response
- Loading states prevent duplicate submissions

## Future Enhancements

Potential improvements not in the current spec:

1. **Bulk Harvest Creation** - Create multiple harvests at once
2. **Harvest Templates** - Save common harvest configurations
3. **Asset Filtering** - Search/filter assets in selection list
4. **Recent Assets** - Show recently harvested assets first
5. **Harvest History** - Timeline view of all harvests
6. **Analytics Dashboard** - Yield trends, production graphs
7. **Export** - CSV/PDF export of harvest data
8. **Photos** - Attach photos to harvest logs
9. **Weather Data** - Auto-record weather conditions
10. **Batch Edit** - Edit multiple pending harvests at once

## Notes

### Output Asset Naming

The backend automatically names output assets like:
- "Egg from Chicken #101"
- "Milk from Bessie"
- "Harvest from Tomato Plant #45"

### Inventory Tracking

Output assets have a `quantity` field that accumulates over multiple harvests:
- First harvest: Quantity = 10
- Second harvest: Quantity = 10 + 8 = 18
- Third harvest: Quantity = 18 + 12 = 30

### Parent Relationships

Output assets are linked to source assets via `parent_id`:
- Egg asset → parent_id points to chicken asset
- Milk asset → parent_id points to cow asset

### Role-Based Associations

The system uses roles to distinguish asset relationships:
- **source** - Assets being harvested from
- **output** - Assets created by the harvest

### Fact Emission

All completed harvests emit `yield` facts for analytics:
- Subject: Source asset ID
- Predicate: Yield predicate ID
- Value: Quantity harvested
- Unit: Unit of measurement
- Timestamp: When harvest occurred

## Questions?

For additional details on:
- Backend endpoint specifications → See API_INTEGRATION.md
- Complex filtering requirements → Contact backend team
- Bulk operations → Contact backend team
- Custom fact types → Contact backend team

