class AddParentIdToLocations < ActiveRecord::Migration[8.0]
  def change
    add_column :locations, :parent_id, :bigint
    add_index :locations, :parent_id
    add_foreign_key :locations, :locations, column: :parent_id
  end
end

