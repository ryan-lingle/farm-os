class AddParentIdToAssets < ActiveRecord::Migration[8.0]
  def change
    add_column :assets, :parent_id, :bigint
    add_index :assets, :parent_id
    add_foreign_key :assets, :assets, column: :parent_id
  end
end

