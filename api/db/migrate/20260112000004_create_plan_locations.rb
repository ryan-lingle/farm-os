class CreatePlanLocations < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_locations do |t|
      t.references :plan, null: false, foreign_key: true
      t.references :location, null: false, foreign_key: true
      t.timestamps
    end
    add_index :plan_locations, [:plan_id, :location_id], unique: true
  end
end
