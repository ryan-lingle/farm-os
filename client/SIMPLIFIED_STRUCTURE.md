# Simplified farmOS Client Structure

## ✅ What Changed

Removed all made-up fields that don't exist in your backend. The client now **only uses the fields your backend actually provides**.

## 🎯 Core Concept: Assets Represent Groups

**Important**: Assets model **sets of things**, not individual items:
- A "Laying Hens" asset = a flock of chickens
- A "Tomato Bed" asset = a bed of tomato plants
- A "Hay Bales" asset = a stack of hay

This is why we have the `quantity` field!

## 📋 Backend Fields Used

### Assets (All Types)
```typescript
{
  name: string;           // e.g., "Laying Hens", "Tomato Bed A"
  quantity: number;       // Number of items in this group
  status: string;         // "active" or "archived"
  notes: string;          // Any additional details
  is_location: boolean;   // For land assets used as locations
  is_fixed: boolean;      // For fixed assets
  geometry: object;       // For land assets (GeoJSON)
  created_at: string;
  updated_at: string;
  archived_at: string;
}
```

### Logs (All Types)
```typescript
{
  name: string;           // e.g., "Morning Egg Collection"
  timestamp: string;      // When the activity occurred
  status: string;         // "done" or "pending"
  notes: string;          // Details about the activity
  created_at: string;
  updated_at: string;
}
```

## 📱 Asset Pages

All asset pages now use either:
1. **Custom implementation** (Animals) - Slightly different UI/messaging
2. **Generic component** (Plants, Equipment, Compost) - Shared implementation

### Animals Page
- **Group name**: e.g., "Laying Hens", "Dairy Cows"
- **Quantity**: Number of animals (e.g., 25 chickens)
- **Notes**: Type, breed, purpose, health info, etc.
- Shows total groups + total animal count

### Plants Page
- **Group name**: e.g., "Tomato Bed A", "Apple Orchard"
- **Quantity**: Number of plants (e.g., 50 tomato plants)
- **Notes**: Variety, planting date, location, etc.

### Equipment Page
- **Item name**: e.g., "John Deere Tractor"
- **Quantity**: Usually 1 (but could be multiple of same item)
- **Notes**: Model, serial number, maintenance schedule, etc.

### Compost Page
- **Pile name**: e.g., "Main Compost Pile"
- **Quantity**: Number of piles or units
- **Notes**: Contents, stage, location, etc.

## 📝 Log Pages

All log pages now use the **GenericLogPage** component with only:
- **Name**: Description of the activity
- **Timestamp**: When it happened
- **Status**: Done or Pending
- **Notes**: Additional details

This applies to:
- Harvest
- Activity
- Input
- Maintenance
- Observation

## 🗑️ Removed Fields

These fields were removed because they don't exist in your backend:

### Assets
- ❌ `animal_type` - Put this in notes instead
- ❌ `breed` - Put this in notes instead
- ❌ `sex` - Put this in notes instead
- ❌ `plant_type` - Put this in notes instead
- ❌ `season` - Put this in notes instead
- ❌ `equipment_type` - Put this in notes instead
- ❌ `manufacturer` - Put this in notes instead
- ❌ `model` - Put this in notes instead
- ❌ `serial_number` - Put this in notes instead

### Logs
- ❌ `crop_type` - Put this in notes instead
- ❌ `quantity` - Track this via related assets instead
- ❌ `unit` - Not needed on logs

## 💡 How to Use Notes Field

Since we only have a `notes` field, use it to store structured information:

### Example Animal Asset:
```
Name: Laying Hens
Quantity: 25
Notes: 
Type: Chicken
Breed: Rhode Island Red
Purpose: Egg production
Age: 6 months old
Health: All vaccinated
```

### Example Plant Asset:
```
Name: Tomato Bed A
Quantity: 50
Notes:
Variety: Beefsteak
Planted: March 15, 2025
Location: North Field
Expected harvest: June 2025
```

### Example Harvest Log:
```
Name: Tomato Harvest
Timestamp: 2025-06-15 10:00 AM
Notes:
Crop: Beefsteak Tomatoes
Quantity: 150 lbs
Quality: Excellent
From: Tomato Bed A
```

## 🎯 Future Enhancements

If you want structured data later, you can add specific columns to your backend:

**For Animals:**
```ruby
add_column :assets, :animal_type, :string
add_column :assets, :breed, :string
add_column :assets, :sex, :string
```

**For Harvest Logs:**
```ruby
add_column :logs, :crop_type, :string
add_column :logs, :quantity, :decimal
add_column :logs, :unit, :string
```

Then the client can easily add dedicated form fields for those!

## 📊 Current Capabilities

✅ **Create** - Add new groups with quantity
✅ **Read** - View all groups and their quantities
✅ **Update** - Edit names, quantities, status, notes
✅ **Delete** - Remove groups with confirmation
✅ **Detail View** - Click to see full information
✅ **Edit Mode** - Toggle between view/edit in detail modal
✅ **Statistics** - Count groups and total quantities

## Summary

The client is now **perfectly aligned** with your backend API. All assets represent groups of things, quantity tracks how many items are in each group, and everything else goes in the notes field for flexibility.

Simple, flexible, and **actually works** with your backend! 🎉

