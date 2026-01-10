class CreateTaskLocations < ActiveRecord::Migration[8.0]
  def change
    create_table :task_locations do |t|
      t.references :task, null: false, foreign_key: true
      t.references :location, null: false, foreign_key: true

      t.timestamps
    end

    add_index :task_locations, [:task_id, :location_id], unique: true
  end
end
