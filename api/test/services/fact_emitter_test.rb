require "test_helper"

class FactEmitterTest < ActiveSupport::TestCase
  test "movement log has moved_assets" do
    skip unless ActiveRecord::Base.connection.table_exists?('predicates')
    
    # Create simple movement setup
    herd = Asset.create!(name: "Test Herd #{rand(1000)}", asset_type: "animal")
    location = Location.create!(name: "Test Paddock #{rand(1000)}", location_type: "point")
    
    log = Log.create!(
      name: "Movement Test #{rand(1000)}",
      log_type: "movement",
      timestamp: Time.current,
      status: "pending",
      to_location_id: location.id
    )
    
    # Add asset with 'moved' role
    log.asset_log_associations.create!(asset: herd, role: 'moved')
    
    # Reload and check
    log.reload
    
    puts "Log ID: #{log.id}"
    puts "Log type: #{log.log_type}"
    puts "To location ID: #{log.to_location_id}"
    puts "Asset log associations count: #{log.asset_log_associations.count}"
    puts "Moved associations count: #{log.moved_associations.count}"
    puts "Moved assets count: #{log.moved_assets.count}"
    
    assert_equal 1, log.moved_assets.count, "Should have 1 moved asset"
    assert_equal herd.id, log.moved_assets.first.id
  end
  
  test "fact emitter creates fact for movement log" do
    skip unless ActiveRecord::Base.connection.table_exists?('predicates')
    
    # Ensure grazes predicate exists
    grazes = Predicate.find_or_create_by!(name: 'grazes') do |p|
      p.kind = 'relation'
      p.description = 'Test grazes'
    end
    
    # Create movement setup
    herd = Asset.create!(name: "Test Herd #{rand(1000)}", asset_type: "animal")
    location = Location.create!(name: "Test Paddock #{rand(1000)}", location_type: "point")
    
    log = Log.create!(
      name: "Movement Test #{rand(1000)}",
      log_type: "movement",
      timestamp: Time.current,
      status: "pending",
      to_location_id: location.id
    )
    
    log.asset_log_associations.create!(asset: herd, role: 'moved')
    log.reload
    
    puts "\n=== Before FactEmitter ==="
    puts "Fact count: #{Fact.count}"
    puts "Log type: #{log.log_type}"
    puts "To location: #{log.to_location_id}"
    puts "Grazes predicate: #{grazes.inspect}"
    puts "Moved assets: #{log.moved_assets.map(&:id)}"
    
    # Call FactEmitter directly
    FactEmitter.emit_from_log(log)
    
    puts "\n=== After FactEmitter ==="
    puts "Fact count: #{Fact.count}"
    if Fact.last
      puts "Last fact: subject=#{Fact.last.subject_id}, predicate=#{Fact.last.predicate_id}, object=#{Fact.last.object_id}"
    end
    
    assert_equal 1, Fact.count, "Should have created a fact"
  end
end

