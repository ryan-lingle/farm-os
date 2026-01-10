# Harvest Log UI Guide

## Visual Layout Reference

### Main Page View

```
┌──────────────────────────────────────────────────────────────────────┐
│  📦 Harvest Logs                              [New Harvest] Button   │
│  Record and track harvests from your animals and plants              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │Total        │ │This Month   │ │Pending      │ │Completed    │  │
│  │Harvests     │ │             │ │             │ │             │  │
│  │    45       │ │     12      │ │      3      │ │     42      │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│  Harvest Logs                                                         │
│  All harvest logs from your farm                                     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Morning egg collection  [✓ Completed] [3 sources]            │   │
│  │ Oct 23, 2025 10:30 AM                                        │   │
│  │ Found one double-yolker                           [👁][🗑]   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Evening milking  [⏰ Pending] [1 source]                     │   │
│  │ Oct 23, 2025 6:00 PM                    [✓Complete][👁][🗑]  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Create Harvest Form

```
┌─────────────────────────────────────────────────────────┐
│  Create Harvest Log                                     │
│  Record a harvest from your animals or plants           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Name *                                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Morning egg collection                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Date & Time *                                           │
│  ┌──────────────────┐  ┌──────────────┐                │
│  │ Oct 23, 2025     │  │  10:30 AM    │                │
│  └──────────────────┘  └──────────────┘                │
│                                                          │
│  Harvested From (Source Assets) *                        │
│  3 assets selected                                       │
│                                                          │
│  ANIMALS                                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ☑ Henrietta (chicken #101)                         │ │
│  │ ☑ Clucky (chicken #102)                            │ │
│  │ ☑ Daisy (duck #103)                                │ │
│  │ ☐ Bessie (cattle #200)                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  PLANTS                                                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ☐ Tomato Plant (plant #45)                         │ │
│  │ ☐ Apple Tree (plant #67)                           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Harvest Amount *                                        │
│  ┌────────────┐  ┌──────────────────────┐              │
│  │     12     │  │ Eggs            ▼    │              │
│  └────────────┘  └──────────────────────┘              │
│                                                          │
│  Storage Location (optional)                             │
│  ☑ Use source asset location (default)                  │
│  ☐ Store at specific location                           │
│                                                          │
│  Notes                                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Found one double-yolker                            │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [Cancel]  [Save as Pending]  [Save & Complete]         │
└─────────────────────────────────────────────────────────┘
```

### Detail Dialog - Details Tab

```
┌─────────────────────────────────────────────────────────┐
│  Morning egg collection                                 │
│  Harvest log details                                    │
├─────────────────────────────────────────────────────────┤
│  [Details] [Relationships]                              │
│                                                          │
│  Status                                                  │
│  [✓ Completed]                                          │
│                                                          │
│  Date & Time                                             │
│  Oct 23, 2025 10:30 AM                                  │
│                                                          │
│  Notes                                                   │
│  Found one double-yolker                                │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  Created                    Updated                      │
│  Oct 23, 2025 10:30 AM     Oct 23, 2025 10:35 AM       │
│                                                          │
│  [Delete]                                    [Edit]      │
└─────────────────────────────────────────────────────────┘
```

### Detail Dialog - Relationships Tab

```
┌─────────────────────────────────────────────────────────┐
│  Morning egg collection                                 │
│  Harvest log details                                    │
├─────────────────────────────────────────────────────────┤
│  [Details] [Relationships]                              │
│                                                          │
│  Source Assets                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ asset #101                           [source]      │ │
│  │ asset #102                           [source]      │ │
│  │ asset #103                           [source]      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Output Assets                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ asset #888                           [output]      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Quantities                                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Quantity #777                                      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Status Badges

### Completed Status
- **Color**: Green background (#dcfce7), green text (#166534)
- **Icon**: CheckCircle2 (✓)
- **Text**: "Completed"

### Pending Status
- **Color**: Yellow background (#fef9c3), yellow text (#854d0e)
- **Icon**: Clock (⏰)
- **Text**: "Pending"

### Source Count Badge
- **Color**: Outline style (border only)
- **Text**: "3 sources" or "1 source"
- **Usage**: Shows number of assets being harvested from

## Button States

### Primary Actions

1. **New Harvest Button**
   - Location: Top right of page
   - Icon: Package (📦)
   - Style: Primary (blue)

2. **Save & Complete Button**
   - Location: Form bottom right
   - Style: Primary (blue)
   - Action: Creates log with status="done"

3. **Complete Button** (for pending harvests)
   - Location: Log list item, Detail dialog
   - Icon: CheckCircle2 (✓)
   - Style: Outline with green text
   - Text: "Complete" or "Complete Harvest"

### Secondary Actions

1. **Save as Pending Button**
   - Location: Form bottom middle
   - Style: Secondary (gray)
   - Action: Creates log with status="pending"

2. **Cancel Button**
   - Location: Forms/dialogs
   - Style: Outline
   - Action: Closes dialog without saving

### Destructive Actions

1. **Delete Button**
   - Location: Log list item, Detail dialog
   - Icon: Trash2 (🗑)
   - Style: Outline (in list) or Destructive red (in dialog)
   - Confirmation: Shows alert dialog before deletion

## Form Validation Indicators

### Required Fields
- Marked with red asterisk (*)
- Fields: Name, Date & Time, Source Assets, Harvest Amount

### Validation Messages
- "Please select at least one source asset to harvest from"
- "Please enter a valid quantity greater than 0"
- Browser-native validation for required inputs

### Empty States

**No Assets Available**
```
┌────────────────────────────────────────────┐
│  No animals or plants available for        │
│  harvest. Create some assets first.        │
└────────────────────────────────────────────┘
```

**No Harvest Logs**
```
┌────────────────────────────────────────────┐
│           📦                               │
│                                            │
│      No harvest logs found                 │
│                                            │
│  Start by recording your first harvest     │
│                                            │
│         [Add First Harvest]                │
└────────────────────────────────────────────┘
```

## Loading States

### Data Fetching
- Skeleton loaders for statistics cards (3 pulses)
- "Loading assets..." text in form
- "Loading locations..." dropdown option

### Form Submission
- Button text changes: "Saving..."
- Button disabled during submission
- Prevents duplicate submissions

## Responsive Behavior

### Desktop (≥768px)
- Statistics cards: 4 columns
- Full form width: 600px max
- Dialog: Centered with backdrop

### Mobile (<768px)
- Statistics cards: 1 column, stacked
- Form: Full width
- Dialog: Full screen or near full screen

## Color Scheme

### Status Colors
- **Completed**: Green (#dcfce7 background, #166534 text)
- **Pending**: Yellow (#fef9c3 background, #854d0e text)
- **Primary Action**: Blue (theme primary)
- **Destructive**: Red (theme destructive)

### Accents
- **Package Icon**: Green (#059669, text-green-600)
- **Statistics**: Default foreground
- **Muted Text**: Gray (theme muted-foreground)

## Typography

### Headers
- **Page Title**: 3xl, bold, with icon
- **Card Titles**: Default title size
- **Dialog Titles**: Large, bold

### Body Text
- **List Items**: Font semibold for names
- **Timestamps**: Small, muted
- **Notes**: Small, muted, italic style
- **Labels**: Small, muted, for form fields

## Spacing

### Gaps
- Page sections: 6 (1.5rem)
- Form fields: 4 (1rem)
- Card grid: 6 (1.5rem)
- List items: 3 (0.75rem)

### Padding
- Page wrapper: 6 (1.5rem)
- Cards: Default card padding
- List items: 4 (1rem)
- Dialogs: Default dialog padding

## Interactions

### Hover Effects
- **List Items**: Background changes to accent color
- **Buttons**: Standard button hover (brightness change)
- **Checkboxes**: Cursor pointer on labels

### Click Actions
- **List Item**: Opens detail dialog (on main content area)
- **Eye Button**: Opens detail dialog
- **Complete Button**: Immediately completes harvest (with confirmation)
- **Delete Button**: Shows confirmation dialog first

### Transitions
- List item hover: Smooth transition
- Dialog open/close: Fade and scale animation
- Alert dialogs: Standard animation

## Accessibility

### Keyboard Navigation
- Form inputs: Tab through fields
- Checkboxes: Space to toggle
- Buttons: Enter to activate
- Dialogs: Escape to close

### ARIA Labels
- Checkboxes have label associations (htmlFor)
- Buttons include icon + text for clarity
- Required fields marked with (*)
- Alert dialogs have proper titles and descriptions

### Screen Readers
- Status badges include text ("Completed", "Pending")
- Icon buttons include text labels
- Form labels properly associated with inputs
- Error messages announced

## Best Practices

### User Guidance
1. Pre-fill timestamp to current time
2. Show selection count for assets
3. Default to source location (most common)
4. Clear validation messages
5. Confirmation for destructive actions

### Data Integrity
1. Client-side validation before submit
2. Quantity must be > 0
3. At least one source asset required
4. Prevent duplicate submissions with loading states

### Performance
1. Lazy load locations only when needed
2. React Query caching for assets/locations
3. Optimistic updates not implemented (backend confirms)
4. Invalidate queries after mutations

### Error Handling
1. Toast notifications for all actions
2. Error messages from API displayed
3. Loading states prevent user confusion
4. Graceful degradation for empty states

