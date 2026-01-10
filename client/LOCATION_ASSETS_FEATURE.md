# Location Assets Popup Feature

## Overview
Interactive map popups that display all assets at a specific location when clicking on location polygons. This provides quick insights into what's currently at each location without leaving the map view.

## Features Implemented

### 1. Backend API Filter Support
- Added `current_location_id` filter to the assets API
- Backend implementation in Ruby/Rails supports filtering assets by location
- Frontend API client updated to pass location filter parameter

### 2. New React Hook: `useAssetsAtLocation`
**Location:** `/src/hooks/useAssets.ts`

Fetches all asset types (animals, plants, equipment, structures, compost, material) for a given location in parallel.

**Usage:**
```typescript
const { assets, isLoading, isError } = useAssetsAtLocation(locationId);
```

**Returns:**
- `assets`: Flat array of all assets at the location across all types
- `isLoading`: Boolean indicating if any query is still loading
- `isError`: Boolean indicating if any query failed

### 3. Location Assets Popup Component
**Location:** `/src/components/LocationAssetsPopup.tsx`

Beautiful popup UI that displays:
- Location name with icon
- Total asset count badge
- Assets grouped by type (Animal, Plant, Equipment, etc.)
- Each asset shows:
  - Name
  - Quantity (if applicable)
  - Status badge (active/archived)
- Color-coded by asset type
- Scrollable list for locations with many assets
- Summary statistics footer

**Features:**
- Loading state
- Empty state when no assets
- Hover effects on asset cards
- Responsive design
- Icon-based visual hierarchy

### 4. Map Integration
**Location:** `/src/components/MapInterface.tsx`

**Interactive Features:**
- Click any location polygon on the map to see its assets
- Hover cursor changes to pointer over locations
- Smooth popup animations
- Properly positioned popups with Mapbox GL JS
- React rendering inside Mapbox popups using ReactDOM portals
- QueryClient context for data fetching

**Implementation Details:**
- Uses Mapbox GL Draw layers for interaction
- Custom event handlers for click and mousemove
- Cleanup on component unmount
- React 18 concurrent rendering support

### 5. Enhanced UI/UX
**Location:** `/src/components/LocationsSidebar.tsx`

Added helpful info banner:
- Blue info alert at top of sidebar
- Guides users to click locations on map
- Only shows when locations exist
- Responsive and accessible

**Custom Styling:** `/src/index.css`
- Smooth fade-in animation
- Tailwind-based responsive design
- Dark mode support
- Enhanced hover effects
- Custom close button styling

## Asset Type Color Coding

| Asset Type | Color Scheme |
|------------|-------------|
| Animal | Amber (brown/orange) |
| Plant | Green |
| Equipment | Blue |
| Structure | Purple |
| Compost | Emerald |
| Material | Orange |

## User Flow

1. User views map with locations
2. User sees info tip in sidebar about clicking locations
3. User clicks on any location polygon
4. Popup appears showing:
   - Location name
   - Total asset count
   - All assets grouped by type
5. User can scroll through assets if there are many
6. User clicks close button or clicks elsewhere to dismiss

## Technical Architecture

```
MapInterface (React Component)
├── Mapbox GL Map Instance
├── Mapbox GL Draw (polygon drawing)
├── Click Event Handler
│   └── Query location polygons at click point
│       └── Show Popup
│           ├── Create React Portal
│           ├── Provide QueryClient Context
│           └── Render PopupContent Component
│               └── useAssetsAtLocation Hook
│                   ├── Fetch animals
│                   ├── Fetch plants
│                   ├── Fetch equipment
│                   ├── Fetch structures
│                   ├── Fetch compost
│                   └── Fetch materials
│                       └── Render LocationAssetsPopup
└── Cleanup on unmount
```

## Performance Considerations

- **Parallel Queries**: All asset types fetched simultaneously using React Query
- **Caching**: React Query automatically caches results
- **Lazy Loading**: Only fetches assets when popup is opened
- **Efficient Rendering**: Uses React 18's concurrent rendering
- **Query Invalidation**: Updates when assets are modified

## Future Enhancements

Possible improvements:
1. Add asset filtering within popup (by status, type, etc.)
2. Click on asset in popup to navigate to asset detail page
3. Show asset movement history
4. Add quick actions (move asset, edit, delete)
5. Show visual indicators on map (icons, counts) without clicking
6. Aggregate statistics (total animals, total weight, etc.)
7. Export asset list for a location
8. Batch operations on assets at a location

## API Endpoint

**Endpoint:** `GET /api/v1/assets/{assetType}`

**Query Parameters:**
```
filter[current_location_id]: The location ID to filter by
page: Page number for pagination
per_page: Items per page
```

**Example:**
```
GET /api/v1/assets/animal?filter[current_location_id]=42&per_page=100
```

## Browser Compatibility

- Modern browsers with ES2020+ support
- Requires Mapbox GL JS 2.0+
- Tested with React 18

## Dependencies

- `mapbox-gl`: ^3.0.0 - Map rendering
- `@mapbox/mapbox-gl-draw`: ^1.4.0 - Drawing tools
- `@tanstack/react-query`: ^5.0.0 - Data fetching
- `react-dom`: ^18.0.0 - Portal rendering
- Tailwind CSS - Styling

## Development Notes

- The popup uses React portals to render React components inside Mapbox popups
- QueryClient must be provided via context for hooks to work
- Cleanup is critical to prevent memory leaks
- Event listeners are properly removed on unmount
- React 18's createRoot API is used for concurrent rendering

---

**Created:** October 23, 2025
**Last Updated:** October 23, 2025

