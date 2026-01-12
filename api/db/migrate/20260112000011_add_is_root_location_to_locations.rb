class AddIsRootLocationToLocations < ActiveRecord::Migration[8.0]
  def change
    add_column :locations, :is_root_location, :boolean, default: false, null: false
    add_index :locations, :is_root_location, where: "is_root_location = true", unique: true
  end
end
