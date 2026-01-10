# Predicates & Facts System

## Overview

This system adds a semantic knowledge layer on top of your existing Assets and Logs, making the API highly legible for AI agents while maintaining full audit trails for human operators.

## Architecture

```
Assets (entities: Cow, Flock, Pasture, etc.)
  ↕ role-based relationships
Logs (events: harvest, movement, observation)
  ├─ source_assets (what produced it)
  ├─ output_assets (what was produced)
  ├─ moved_assets (what moved)
  └─ subject_assets (what was observed)
  ↓ emits on complete!
Facts (semantic knowledge graph)
  ├─ subject → predicate → value (measurements)
  └─ subject → predicate → object (relations)
  ↑
Predicates (controlled vocabulary)
```

## Setup

### 1. Install System Dependencies

```bash
brew install proj  # Required for rgeo-proj4
```

### 2. Install Gems & Run Migrations

```bash
bundle install
bin/rails db:migrate
bin/rails db:seed
```

This will:
- Add `role` column to `assets_logs` join table
- Create `predicates` table (vocabulary)
- Create `facts` table (semantic knowledge)
- Seed 9 core predicates (yield, grazes, weight, etc.)

## Core Concepts

### Predicates (Vocabulary)

Predicates define **what you can measure or relate**. Think of them as your semantic schema.

**Types:**
- `measurement`: Numeric values (yield, weight, butterfat_pct)
- `relation`: Connections between assets (grazes, contains)
- `state`: Status or condition (health_status)

**Example:**
```ruby
Predicate.find_by(name: 'yield')
# => {
#   name: "yield",
#   kind: "measurement",
#   unit: "egg",
#   description: "Number of eggs harvested from a flock or individual bird",
#   constraints: { domain: "AnimalAsset", range: "number", min: 0 }
# }
```

### Facts (Semantic Triples)

Facts are normalized observations: `subject → predicate → object/value @ timestamp`

**Example Measurement Fact:**
```ruby
Fact.create!(
  subject: leghorn_flock,
  predicate: yield_predicate,
  value_numeric: 25,
  unit: 'egg',
  observed_at: Time.current
)
# Means: "Leghorn flock yielded 25 eggs at this time"
```

**Example Relation Fact:**
```ruby
Fact.create!(
  subject: cattle_herd,
  predicate: grazes_predicate,
  object: paddock_7,
  observed_at: Time.current
)
# Means: "Cattle herd is grazing paddock 7 at this time"
```

### Role-Based Asset Relationships

The `assets_logs` join table now has a `role` column:

**Roles:**
- `source`: What produced the output (e.g., flock in harvest)
- `output`: What was produced (e.g., eggs from harvest)
- `moved`: What was moved (e.g., herd in movement)
- `subject`: What was observed (e.g., cow in weight check)

## Complete Harvest Flow Example

### 1. Create Pending Harvest Log (Voice Input)

```ruby
log = HarvestLog.create!(
  name: "Morning egg collection",
  log_type: "harvest",
  timestamp: Time.current,
  status: "pending"  # Not yet confirmed
)

# Link source with role
log.asset_log_associations.create!(
  asset: leghorn_flock,
  role: 'source'
)

# Record quantity
log.quantities.create!(
  value: 25,
  unit: 'egg',
  quantity_type: 'harvest'
)
```

### 2. User Confirms → Triggers Complete!

```ruby
log.complete!
```

This triggers three things:

**A. HarvestProcessor creates/updates inventory:**
```ruby
egg_asset = Asset.find_or_create_by!(
  asset_type: 'egg',
  parent_id: leghorn_flock.id
)
egg_asset.increment!(:quantity, 25)  # Now at 25 eggs

# Link as output
log.output_assets << egg_asset
```

**B. FactEmitter creates semantic fact:**
```ruby
Fact.create!(
  subject_id: leghorn_flock.id,
  predicate_id: yield_predicate.id,
  value_numeric: 25,
  unit: 'egg',
  observed_at: log.timestamp,
  log_id: log.id  # Provenance
)
```

**C. Movement executed (if applicable):**
```ruby
# Only for movement logs
moved_assets.update_all(current_location_id: to_location_id)
```

### 3. What You Get

**The Log (Full Context):**
```ruby
log.name             # => "Morning egg collection"
log.source_assets    # => [leghorn_flock]
log.output_assets    # => [egg_asset]
log.quantities.first # => {value: 25, unit: 'egg'}
```

**The Inventory (Asset):**
```ruby
egg_asset.quantity    # => 25
egg_asset.parent      # => leghorn_flock (traceability)
```

**The Fact (Semantic):**
```ruby
fact.subject         # => leghorn_flock
fact.predicate.name  # => "yield"
fact.value_numeric   # => 25
fact.log            # => harvest_log (provenance)
```

## AI Query Patterns

### Schema Discovery
```http
GET /api/v1/predicates
```

AI learns vocabulary: yield, grazes, butterfat_pct, weight, etc.

### Semantic Query: Performance Analytics
```http
GET /api/v1/facts?filter[predicate]=yield&filter[subject_id]=123&filter[since]=2025-10-01
```

Returns all yield facts for flock #123 since October 1st.

### Inventory Check
```http
GET /api/v1/assets?filter[asset_type]=egg&filter[parent_id]=123
```

Returns egg inventory produced by flock #123.

### Provenance Lookup
```http
GET /api/v1/facts/456?include=log,subject
```

Returns fact with full log context and subject asset.

### Cross-Metric Analysis
```http
GET /api/v1/facts?filter[predicate]=yield,rainfall_mm&filter[since]=2025-09-01
```

Returns both yield and rainfall facts for correlation analysis.

## JSON:API Examples

### Create a Harvest Log (AI Input)

```json
POST /api/v1/logs/harvest
{
  "data": {
    "type": "log",
    "attributes": {
      "name": "Morning egg collection",
      "timestamp": "2025-10-22T08:30:00Z"
    },
    "relationships": {
      "source_assets": {
        "data": [{"type": "asset", "id": "123"}]
      }
    }
  }
}
```

### Query Facts with Relationships

```json
GET /api/v1/facts?filter[predicate]=yield&include=subject,predicate

Response:
{
  "data": [{
    "id": "789",
    "type": "fact",
    "attributes": {
      "value_numeric": "25.0",
      "unit": "egg",
      "observed_at": "2025-10-22T08:30:00Z",
      "statement": "Leghorn Flock yield 25.0egg"
    },
    "relationships": {
      "subject": {"data": {"type": "asset", "id": "123"}},
      "predicate": {"data": {"type": "predicate", "id": "abc"}}
    }
  }],
  "included": [
    {
      "id": "abc",
      "type": "predicate",
      "attributes": {
        "name": "yield",
        "kind": "measurement",
        "unit": "egg",
        "description": "Number of eggs harvested from a flock or individual bird"
      }
    },
    {
      "id": "123",
      "type": "asset",
      "attributes": {
        "name": "Leghorn Flock",
        "asset_type": "animal"
      }
    }
  ]
}
```

## Key Files

### Models
- `app/models/predicate.rb` - Vocabulary/schema definitions
- `app/models/fact.rb` - Semantic triples
- `app/models/asset_log.rb` - Role-based join model
- `app/models/log.rb` - Enhanced with role associations & fact emission

### Services
- `app/services/fact_emitter.rb` - Emits facts from logs
- `app/services/harvest_processor.rb` - Creates inventory from harvests

### Controllers
- `app/controllers/api/v1/predicates_controller.rb` - Schema discovery
- `app/controllers/api/v1/facts_controller.rb` - Semantic queries

### Serializers
- `app/serializers/predicate_serializer.rb` - JSON:API predicate format
- `app/serializers/fact_serializer.rb` - JSON:API fact format with statement

## Seeded Predicates

1. **yield** (measurement) - Egg harvest count
2. **grazes** (relation) - Animal grazing location
3. **butterfat_pct** (measurement) - Milk butterfat percentage
4. **weight** (measurement) - Animal/product weight
5. **milk_yield** (measurement) - Milk volume harvested
6. **contains** (relation) - Plant species in location
7. **rainfall_mm** (measurement) - Rainfall amount
8. **health_status** (state) - Animal health condition
9. **body_condition_score** (measurement) - Livestock BCS

## Why This Design?

### For AI Agents
✅ **Schema discovery** at runtime (`GET /predicates`)  
✅ **Consistent structure** (all facts have same shape)  
✅ **Semantic queries** (filter by meaning, not log type)  
✅ **Self-describing** (JSON:API relationships)  
✅ **Cross-metric joins** (analyze correlations easily)

### For Humans
✅ **Full audit trail** (logs remain complete)  
✅ **Traceability** (facts link back to logs)  
✅ **Inventory tracking** (assets with quantities)  
✅ **Provenance** (who recorded it, when, how)

### For Both
✅ **Flexible** (add new predicates without migrations)  
✅ **Normalized** (units are consistent)  
✅ **Queryable** (indexed for performance)  
✅ **Extensible** (constraints guide validation)

## Next Steps

### Immediate
1. Fix bundler issue: `brew install proj && bundle install`
2. Run migrations: `bin/rails db:migrate`
3. Seed predicates: `bin/rails db:seed`
4. Test with a harvest log

### Future Enhancements
- **Derived facts**: Nightly jobs compute averages, trends
- **Fact corrections**: Handle log updates/deletions
- **Unit conversion**: Auto-convert to canonical units
- **Confidence scoring**: Weight AI-transcribed facts lower
- **Time-series partitioning**: Optimize for large volumes
- **Predicate versioning**: Handle vocabulary evolution

