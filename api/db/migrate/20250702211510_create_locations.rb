class CreateLocations < ActiveRecord::Migration[8.0]
  def change
    create_table :locations do |t|
      t.string :name
      t.string :status
      t.text :notes
      t.string :location_type
      t.jsonb :geometry
      t.datetime :archived_at

      t.timestamps
    end
  end
end
