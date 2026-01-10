require "test_helper"

class FactEmissionTest < ActionDispatch::IntegrationTest
  test "harvest log emits yield fact on complete" do
    # Skip if migrations haven't run yet
    skip "Run migrations first" unless ActiveRecord::Base.connection.table_exists?('predicates')
    
    # Find the yield predicate (should be seeded)
    yield_pred = Predicate.find_or_create_by!(name: 'yield') do |p|
      p.kind = 'measurement'
      p.unit = 'egg'
      p.description = 'Test yield predicate'
    end
    
    # Create a test flock
    flock = Asset.create!(
      name: "Test Flock",
      asset_type: "animal",
      status: "active"
    )
    
    # Create a harvest log
    log = Log.create!(
      name: "Test Harvest",
      log_type: "harvest",
      timestamp: Time.current,
      status: "pending"
    )
    
    # Link flock as source with role
    log.asset_log_associations.create!(
      asset: flock,
      role: 'source'
    )
    
    # Add quantity
    log.quantities.create!(
      measure: 'count',
      value: 25,
      unit: 'egg',
      quantity_type: 'harvest'
    )
    
    # Before complete: no facts
    assert_equal 0, Fact.count, "Should have no facts before complete"
    
    # Complete the log (should emit fact)
    log.complete!
    
    # After complete: fact should exist
    assert_equal 1, Fact.count, "Should have 1 fact after complete"
    
    fact = Fact.last
    assert_equal flock.id, fact.subject_id, "Fact subject should be the flock"
    assert_equal yield_pred.id, fact.predicate_id, "Fact predicate should be yield"
    assert_equal 25.0, fact.value_numeric, "Fact value should be 25"
    assert_equal 'egg', fact.unit, "Fact unit should be egg"
    assert_equal log.id, fact.log_id, "Fact should link back to log"
  end
  
  test "harvest log creates output asset on complete" do
    skip "Run migrations first" unless ActiveRecord::Base.connection.table_exists?('predicates')
    
    # Find yield predicate
    Predicate.find_or_create_by!(name: 'yield') do |p|
      p.kind = 'measurement'
      p.unit = 'egg'
    end
    
    flock = Asset.create!(
      name: "Test Flock",
      asset_type: "animal"
    )
    
    log = Log.create!(
      name: "Test Harvest",
      log_type: "harvest",
      timestamp: Time.current,
      status: "pending"
    )
    
    log.asset_log_associations.create!(asset: flock, role: 'source')
    log.quantities.create!(measure: 'count', value: 25, unit: 'egg', quantity_type: 'harvest')
    
    # Before complete: no egg assets
    assert_equal 0, Asset.where(asset_type: 'egg').count
    
    # Complete the log
    log.complete!
    
    # After complete: egg asset should exist
    assert_equal 1, Asset.where(asset_type: 'egg').count
    egg_asset = Asset.find_by(asset_type: 'egg')
    
    assert_equal 25, egg_asset.quantity, "Egg asset should have quantity 25"
    assert_equal flock.id, egg_asset.parent_id, "Egg asset should be child of flock"
    assert_includes log.output_assets, egg_asset, "Log should link to egg asset as output"
  end
  
  test "movement log emits grazes fact on complete" do
    skip "Run migrations first" unless ActiveRecord::Base.connection.table_exists?('predicates')
    
    # Find grazes predicate (should be seeded)
    grazes_pred = Predicate.find_or_create_by!(name: 'grazes') do |p|
      p.kind = 'relation'
      p.description = 'Animal grazing location'
    end
    
    # Create herd and location
    herd = Asset.create!(name: "Test Herd", asset_type: "animal")
    location = Location.create!(name: "Paddock 7", location_type: "point")
    
    # Create movement log
    log = Log.create!(
      name: "Move to Paddock 7",
      log_type: "movement",
      timestamp: Time.current,
      status: "pending",
      to_location_id: location.id
    )
    
    log.asset_log_associations.create!(asset: herd, role: 'moved')
    
    # Before complete: no facts
    assert_equal 0, Fact.count
    
    # Complete the log
    log.complete!
    
    # Should emit grazes fact
    assert_equal 1, Fact.count, "Should have created a fact"
    fact = Fact.last
    assert_not_nil fact, "Fact should exist"
    assert_equal herd.id, fact.subject_id
    assert_equal grazes_pred.id, fact.predicate_id
    assert_equal location.id, fact.object_id, "Fact object should be the location"
    assert_nil fact.value_numeric, "Relation facts should not have numeric value"
  end
end

