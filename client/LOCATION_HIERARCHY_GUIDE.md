# Location Hierarchy - Quick User Guide

## ✨ Super Simple & Intuitive Workflow

### Creating Root Locations
1. Click the **Draw Polygon** button in the toolbar
2. Draw your location on the map
3. A dialog appears with:
   - **Name** field (e.g., "North Farm")
   - **Parent Location** dropdown (leave empty for root)
   - **Description** field
4. Click **Create Location**

### Creating Child Locations (2 Ways)

#### Method 1: Click the + Button (Easiest!)
1. In the sidebar, hover over any location
2. Click the **+ button** that appears
3. The map automatically:
   - Zooms to the parent location
   - Enables draw mode
   - Pre-selects that location as parent
4. Draw the child area
5. Dialog shows: **"Add Child Location to [Parent Name]"**
6. Enter name and click Create

#### Method 2: Use Parent Selector
1. Click **Draw Polygon** button
2. Draw your location on the map
3. In the dialog, use the **Parent Location** dropdown
4. Select the parent from the list (grouped by level)
5. Click **Create Location**

### Visual Feedback

#### In the Dialog:
- Title changes: **"Add Child Location to North Farm"**
- Badge shows: **Parent: North Farm**
- Description: "This location will be nested under North Farm"

#### In the Sidebar:
- **Tree View**: Shows nested structure with expand/collapse
  - Parent locations have folder icons
  - Child count badges (e.g., "3 children")
  - Click + on any location to add children
- **List View**: Shows depth badges (L0, L1, L2)

### Example Workflow

**Creating a Farm Hierarchy:**

```
1. Draw "North Farm" (no parent)
   → Creates root location

2. Click + on "North Farm" → Draw "Field A"
   → Dialog shows: "Add Child Location to North Farm"
   → Creates Field A under North Farm

3. Click + on "North Farm" → Draw "Field B"
   → Creates Field B under North Farm

4. Click + on "Field A" → Draw "Section 1"
   → Creates Section 1 under Field A

Result:
North Farm
├── Field A
│   └── Section 1
└── Field B
```

### Key Features

✅ **Parent pre-selected** when using + button  
✅ **Visual context** in dialog title and badge  
✅ **Tree view** for easy visualization  
✅ **Smart grouping** in parent selector by level  
✅ **Prevents circular references** automatically  
✅ **Clear hierarchy** with depth badges  

### Changing Parent

**To move a location to a different parent:**
1. Click the **Edit** button (pencil icon)
2. Update the location name if needed
3. Use the **Parent Location** dropdown to select new parent
4. Click **Save**

**To make a location a root item:**
1. Click **Edit**
2. Clear the Parent Location field (click X)
3. Click **Save**

### Viewing Hierarchy

**Tree View (Default):**
- Expandable/collapsible structure
- Folder icons for parents
- Child counts displayed
- Indent shows depth

**List View:**
- All locations flat list
- Depth badges (L0, L1, L2, etc.)
- Child count badges
- Toggle with Layers/List buttons

### Tips

💡 **Start with main areas** (root locations) then add sub-divisions  
💡 **Use + button** for fastest child creation  
💡 **Tree view** is best for understanding structure  
💡 **List view** is best for quick searching  
💡 **Depth limit**: Aim for 2-3 levels for best performance  

---

## Common Patterns

### Farm Organization
```
Main Farm (root)
├── North Section
│   ├── Field 1
│   ├── Field 2
│   └── Field 3
└── South Section
    ├── Pasture A
    └── Pasture B
```

### Building Layout
```
Barn (root)
├── Main Floor
│   ├── Stall 1
│   ├── Stall 2
│   └── Feed Room
└── Loft
    ├── Hay Storage
    └── Equipment
```

### Garden Planning
```
Vegetable Garden (root)
├── Raised Beds
│   ├── Bed 1 (Tomatoes)
│   ├── Bed 2 (Lettuce)
│   └── Bed 3 (Carrots)
└── Ground Plots
    ├── Plot A (Squash)
    └── Plot B (Beans)
```

---

## That's It!

The interface is designed to be **intuitive and self-explanatory**. Just:
1. Use the + button to add children
2. Or use the parent selector when drawing
3. View in tree or list mode
4. Edit parents anytime to reorganize

No complicated workflows, just simple parent-child relationships! 🎉

