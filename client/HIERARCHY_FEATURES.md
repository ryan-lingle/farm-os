# Hierarchy Features Implementation Summary

## Overview
The farmCLIENT application now has full support for hierarchical organization of both Assets and Locations, following the farmAPI Hierarchy Protocol. Users can create nested structures, visualize relationships, and manage parent-child relationships through an intuitive UI.

## Features Implemented

### 1. Core Type System
**Files Updated:**
- `src/lib/api.ts` - Added hierarchy fields to Asset and Location interfaces
  - `parent_id` - ID of parent resource
  - `depth` - Nesting level (0 for root)
  - `is_root` - Boolean flag for root items
  - `is_leaf` - Boolean flag for items without children
  - `child_count` - Number of direct children
  - `total_asset_count` - (Locations only) Total assets including descendants

### 2. API Layer Extensions
**Files Updated:**
- `src/lib/api.ts` - Extended API methods

**New Methods:**
- `assetsApi.getRoots()` - Fetch only root-level assets
- `assetsApi.getChildren(parentId)` - Fetch children of specific asset
- `locationsApi.getRoots()` - Fetch only root-level locations
- `locationsApi.getChildren(parentId)` - Fetch children of specific location

**Updated Methods:**
- `list()` methods now support `filter[root_only]` and `filter[parent_id]` query parameters
- `get()` methods support `include=parent,children` for eager loading
- `create()` and `update()` methods accept `parent_id` field

### 3. React Hooks
**Files Updated:**
- `src/hooks/useAssets.ts`
- `src/hooks/useLocations.ts`

**New Hooks:**
- `useRootAssets(assetType)` - Fetch root assets only
- `useChildAssets(assetType, parentId)` - Fetch children of specific asset
- `useRootLocations()` - Fetch root locations only
- `useChildLocations(parentId)` - Fetch children of specific location
- `useLocation(id, include)` - Fetch location with related data

**Updated Hooks:**
- `useAssets()` - Now accepts filter options (root_only, parent_id)
- `useLocations()` - Now accepts filter options
- All create/update hooks support parent_id field

### 4. UI Components

#### HierarchyTreeView Component
**File:** `src/components/HierarchyTreeView.tsx`

Two variants provided:
- **HierarchyTreeView** - Static tree with all nodes loaded
- **LazyHierarchyTreeView** - Lazy-loading tree that fetches children on expand

**Features:**
- Expandable/collapsible nodes
- Visual indicators for folders vs. leaf items
- Child count badges
- Depth-based indentation
- Custom icons, labels, and action buttons
- Selection state management

#### HierarchyBreadcrumb Component
**File:** `src/components/HierarchyBreadcrumb.tsx`

Two variants provided:
- **HierarchyBreadcrumb** - Full breadcrumb trail
- **CompactHierarchyBreadcrumb** - Collapsed with ellipsis for long paths

**Features:**
- Shows full path from root to current item
- Clickable navigation through ancestors
- Optional root item with custom label
- Automatic truncation for long paths

#### ParentSelector Component
**File:** `src/components/ParentSelector.tsx`

Two variants provided:
- **ParentSelector** - Grouped by depth with badges
- **SimpleParentSelector** - Flat list with indentation

**Features:**
- Dropdown selection with search
- Grouped by hierarchy level
- Prevents circular references (can't select self or descendants)
- Optional "No parent" selection to make items root
- Visual depth indicators
- Excluded items support

#### DraggableHierarchyTree Component
**File:** `src/components/DraggableHierarchyTree.tsx`

**Features:**
- Native HTML5 drag-and-drop
- Visual drop indicators (before, after, inside)
- Drag handle on hover
- Prevents invalid moves (circular references)
- Root drop zone
- Automatic parent updates via API
- Expand on drop for visibility

### 5. Updated Pages & Sidebars

#### LocationsSidebar
**File:** `src/components/LocationsSidebar.tsx`

**New Features:**
- Toggle between List and Tree views
- Tree view with lazy loading of children
- Hierarchy indicators (depth badges, child counts)
- Total asset count including descendants
- Maintains all existing functionality (search, edit, delete)

#### GenericAssetPage
**File:** `src/components/GenericAssetPage.tsx`

**New Features:**
- Parent selector in create form
- Parent selector in edit form
- Toggle between List and Tree views
- Tree view with lazy loading
- Hierarchy information panel in detail view:
  - Depth/level indicator
  - Root/leaf badges
  - Child count
  - Parent link with navigation
- Breadcrumb navigation in detail dialog
- "Children" tab showing direct descendants
- Warning when deleting items with children
- Hierarchy-aware display in list view (depth badges, child counts)

### 6. User Workflows Supported

#### Creating Hierarchies
1. **Create with Parent:**
   - Select "Add New" button
   - Use Parent Selector to choose parent item
   - New item will be created as child of selected parent

2. **Create Root:**
   - Select "Add New" button
   - Leave parent selector empty or select "(No parent)"
   - New item created as root-level

#### Viewing Hierarchies
1. **Tree View:**
   - Toggle to "Tree" view mode
   - Expand/collapse nodes to explore structure
   - See child counts and depth indicators
   - Click on any item to view details

2. **List View:**
   - Traditional flat list with hierarchy indicators
   - Depth badges show nesting level
   - Child count badges show descendants

3. **Detail View:**
   - Breadcrumb shows full path from root
   - Hierarchy panel shows position in tree
   - Children tab lists direct descendants
   - Click parent link to navigate up
   - Click children to navigate down

#### Moving Items
1. **Via Edit Form:**
   - Open item detail dialog
   - Click "Edit" button
   - Use Parent Selector to choose new parent
   - Save changes

2. **Via Drag-and-Drop:**
   - Enable tree view
   - Hover over item to see drag handle
   - Drag item to new position
   - Drop inside parent to make child
   - Drop in root zone to make root item

#### Managing Hierarchies
1. **Reorganizing:**
   - Move items between parents
   - Promote items to root level
   - Convert root items to children

2. **Deleting:**
   - System warns if item has children
   - Children become orphans (keep their parent_id)
   - UI can be extended to cascade or promote children

## Visual Indicators

### Badges
- **Level Badge** (e.g., "L2") - Shows depth in hierarchy
- **Child Count Badge** - Shows number of direct children
- **Root Item Badge** - Indicates top-level items
- **Leaf Node Badge** - Indicates items with no children

### Icons
- **Folder** - Items with children (collapsed)
- **Open Folder** - Items with children (expanded)
- **MapPin/Icon** - Leaf items without children
- **Chevron Right** - Expand indicator
- **Chevron Down** - Collapse indicator
- **GripVertical** - Drag handle

### Visual States
- **Indentation** - Shows depth (20px per level by default)
- **Hover Effects** - Show actions and drag handle
- **Selection** - Highlighted background for selected item
- **Drag Preview** - Opacity reduced while dragging
- **Drop Zones** - Border indicators (before/after/inside)

## Best Practices Implemented

### Performance
- Lazy loading of children (fetch on expand)
- Root-only queries to start
- Pagination support in API methods
- Efficient tree building algorithms

### UX
- Visual feedback for all actions
- Clear hierarchy indicators
- Breadcrumb navigation
- Warnings for destructive operations
- Keyboard support (Enter/Escape in forms)

### Data Integrity
- Prevent circular references
- Can't select self as parent
- Exclude descendants from parent selector
- Clear error messaging

## API Query Examples

### Get Root Items
```typescript
const { data } = useRootLocations();
const { data } = useRootAssets('animal');
```

### Get Children
```typescript
const { data } = useChildLocations(parentId);
const { data } = useChildAssets('animal', parentId);
```

### Get with Relationships
```typescript
const { data } = useLocation(id, ['parent', 'children', 'assets']);
const { data } = useAsset('animal', id, ['parent', 'children']);
```

### Create with Parent
```typescript
const createMutation = useCreateLocation();
createMutation.mutate({
  name: 'South Field',
  location_type: 'polygon',
  geometry: [...],
  parent_id: 123
});
```

### Move Item
```typescript
const updateMutation = useUpdateLocation();
updateMutation.mutate({
  id: '456',
  updates: {
    parent_id: 789  // New parent
  }
});
```

## Files Added
- `HIERARCHY_PROTOCOL.md` - Complete API documentation
- `src/components/HierarchyTreeView.tsx` - Tree view components
- `src/components/HierarchyBreadcrumb.tsx` - Breadcrumb components
- `src/components/ParentSelector.tsx` - Parent selection components
- `src/components/DraggableHierarchyTree.tsx` - Drag-and-drop tree
- `HIERARCHY_FEATURES.md` - This file

## Files Modified
- `src/lib/api.ts` - Types and API methods
- `src/hooks/useAssets.ts` - Hierarchy hooks
- `src/hooks/useLocations.ts` - Hierarchy hooks
- `src/components/LocationsSidebar.tsx` - Tree view support
- `src/components/GenericAssetPage.tsx` - Full hierarchy UI

## Future Enhancements

### Potential Additions
1. **Bulk Operations:**
   - Move multiple items at once
   - Bulk reparenting

2. **Advanced Drag-and-Drop:**
   - Reordering siblings
   - Visual tree restructuring
   - Undo/redo for moves

3. **Search & Filter:**
   - Search within hierarchy
   - Filter by depth
   - Show/hide empty branches

4. **Visualization:**
   - Hierarchical charts/diagrams
   - Sunburst or tree map views
   - Export hierarchy as image/PDF

5. **Cascade Operations:**
   - Delete with descendants option
   - Archive entire branches
   - Bulk property updates

6. **Validation:**
   - Maximum depth enforcement
   - Naming conventions by level
   - Required parent for certain types

## Testing Recommendations

### Manual Testing
1. Create root items
2. Create nested items (2-3 levels deep)
3. Move items between parents
4. Promote children to root
5. Delete parents with children
6. Search with hierarchy
7. Toggle between views
8. Navigate with breadcrumbs
9. Drag-and-drop reorganization

### Edge Cases
- Single item (no hierarchy)
- Very deep nesting (5+ levels)
- Many children (50+ items)
- Circular reference attempts
- Concurrent updates
- Network errors during moves

## Conclusion

The farmCLIENT now has comprehensive hierarchy support that provides an intuitive, visual way to organize both assets and locations. The implementation follows the farmAPI specification closely and provides multiple interaction patterns (tree view, drag-and-drop, selectors, breadcrumbs) to accommodate different user preferences and use cases.

All components are reusable, type-safe, and follow React best practices. The system is extensible and can easily accommodate future enhancements.

