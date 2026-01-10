# Setup Instructions for Predicates & Facts System

## Prerequisites Issue

The system requires the `rgeo-proj4` gem which needs the `proj` system library.

## Step 1: Install System Dependencies

```bash
brew install proj
```

## Step 2: Install Ruby Gems

```bash
bundle install
```

If this still fails, check that proj is properly installed:
```bash
brew info proj
```

## Step 3: Run Migrations

```bash
bin/rails db:migrate
```

This will create three new tables:
- `predicates` - Vocabulary/schema definitions
- `facts` - Semantic knowledge graph
- Updates `assets_logs` with `role` column

## Step 4: Seed Predicates

```bash
bin/rails db:seed
```

This seeds 9 core predicates:
- yield (egg harvests)
- grazes (animal locations)
- butterfat_pct (dairy metrics)
- weight (animal/product weight)
- milk_yield (dairy harvests)
- contains (plant species in locations)
- rainfall_mm (weather data)
- health_status (animal health)
- body_condition_score (livestock BCS)

## Step 5: Verify Installation

```bash
bin/rails console

# Check predicates
Predicate.count
# => Should show 9

Predicate.pluck(:name)
# => ["yield", "grazes", "butterfat_pct", ...]

# Check models load
FactEmitter
HarvestProcessor
# => Should return the class names without error
```

## Step 6: Test Fact Emission

```bash
bin/rails test test/integration/fact_emission_test.rb
```

All tests should pass, proving:
- ✅ Harvest logs emit yield facts
- ✅ Harvest logs create output assets (inventory)
- ✅ Movement logs emit grazes facts

## Step 7: Test API Endpoints

Start the server:
```bash
bin/rails server
```

Test the new endpoints:
```bash
# Get all predicates
curl http://localhost:3000/api/v1/predicates | jq

# Get facts (will be empty initially)
curl http://localhost:3000/api/v1/facts | jq

# Check API discovery
curl http://localhost:3000/api/v1 | jq '.links'
# Should include "predicates" and "facts" links
```

## Step 8: Create Test Data

```bash
bin/rails console

# Create a flock
flock = Asset.create!(
  name: "Leghorn Flock",
  asset_type: "animal",
  status: "active"
)

# Create a harvest log
log = Log.create!(
  name: "Morning egg collection",
  log_type: "harvest",
  timestamp: Time.current,
  status: "pending"
)

# Link flock as source
log.asset_log_associations.create!(asset: flock, role: 'source')

# Add quantity
log.quantities.create!(value: 25, unit: 'egg', quantity_type: 'harvest')

# Complete the log (triggers fact emission + inventory creation)
log.complete!

# Verify fact was created
Fact.count  # => 1
fact = Fact.last
puts fact.to_s
# => "Leghorn Flock yield 25.0egg @ 2025-10-22..."

# Verify inventory was created
Asset.where(asset_type: 'egg').count  # => 1
eggs = Asset.find_by(asset_type: 'egg')
eggs.quantity  # => 25
eggs.parent    # => Leghorn Flock
```

## Troubleshooting

### Can't install proj
If Homebrew fails, you can also:
```bash
# macOS with MacPorts
sudo port install proj

# Or download from https://proj.org
```

### Migrations fail
If migrations fail, check:
```bash
bin/rails db:migrate:status
```

You can rollback if needed:
```bash
bin/rails db:rollback STEP=3
```

### Services not loading
Verify autoloading is configured:
```bash
bin/rails runner "puts FactEmitter"
```

Should print the class without error.

### Facts not emitting
Check logs:
```bash
tail -f log/development.log
```

Look for errors from FactEmitter or HarvestProcessor.

## Next Steps

Once setup is complete, see:
- `docs/PREDICATES_AND_FACTS.md` - Complete system documentation
- Test with your MCP server
- Create more test data
- Build analytics queries

## Quick Test Script

```ruby
# In rails console - complete end-to-end test
require 'test_helper'

# Setup
yield_pred = Predicate.find_by(name: 'yield')
flock = Asset.create!(name: "Test", asset_type: "animal")
log = Log.create!(name: "Test", log_type: "harvest", timestamp: Time.current, status: "pending")
log.asset_log_associations.create!(asset: flock, role: 'source')
log.quantities.create!(value: 10, unit: 'egg')

# Execute
log.complete!

# Verify
puts "Facts: #{Fact.count}"
puts "Egg assets: #{Asset.where(asset_type: 'egg').count}"
puts "Success!" if Fact.count > 0 && Asset.where(asset_type: 'egg').count > 0
```

