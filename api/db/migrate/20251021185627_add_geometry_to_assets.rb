class AddGeometryToAssets < ActiveRecord::Migration[8.0]
  def change
    add_column :assets, :geometry, :jsonb
  end
end
