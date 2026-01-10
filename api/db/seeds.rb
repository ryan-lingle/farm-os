# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).

# Seed Predicates (vocabulary for facts)
puts "Seeding predicates..."

predicates_data = [
  {
    name: 'yield',
    kind: 'measurement',
    unit: 'egg',
    description: 'Number of eggs harvested from a flock or individual bird',
    constraints: { domain: 'AnimalAsset', range: 'number', min: 0 }
  },
  {
    name: 'grazes',
    kind: 'relation',
    description: 'Indicates that an animal or herd is currently grazing in a specific location',
    constraints: { domain: 'AnimalAsset', range: 'Location' }
  },
  {
    name: 'butterfat_pct',
    kind: 'measurement',
    unit: '%',
    description: 'Milk butterfat percentage for dairy animals',
    constraints: { domain: 'AnimalAsset', range: 'number', min: 0, max: 15 }
  },
  {
    name: 'weight',
    kind: 'measurement',
    unit: 'kg',
    description: 'Weight of an animal or product',
    constraints: { domain: 'AnimalAsset|PlantAsset', range: 'number', min: 0 }
  },
  {
    name: 'milk_yield',
    kind: 'measurement',
    unit: 'liter',
    description: 'Volume of milk harvested from dairy animals',
    constraints: { domain: 'AnimalAsset', range: 'number', min: 0 }
  },
  {
    name: 'contains',
    kind: 'relation',
    description: 'Indicates that a pasture or location contains a specific plant species or asset',
    constraints: { domain: 'Location', range: 'PlantAsset' }
  },
  {
    name: 'rainfall_mm',
    kind: 'measurement',
    unit: 'mm',
    description: 'Rainfall measurement for a location',
    constraints: { domain: 'Location', range: 'number', min: 0 }
  },
  {
    name: 'health_status',
    kind: 'state',
    description: 'Health status of an animal (healthy, sick, recovering, etc.)',
    constraints: { domain: 'AnimalAsset', range: 'string' }
  },
  {
    name: 'body_condition_score',
    kind: 'measurement',
    unit: 'score',
    description: 'Body condition score for livestock (typically 1-5 or 1-9 scale)',
    constraints: { domain: 'AnimalAsset', range: 'number', min: 1, max: 9 }
  }
]

predicates_data.each do |data|
  Predicate.find_or_create_by!(name: data[:name]) do |predicate|
    predicate.kind = data[:kind]
    predicate.unit = data[:unit]
    predicate.description = data[:description]
    predicate.constraints = data[:constraints]
  end
  puts "  ✓ #{data[:name]}"
end

puts "Predicates seeded successfully!"
