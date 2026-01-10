class AddCurrentLocationToAssets < ActiveRecord::Migration[8.0]
  def change
    add_reference :assets, :current_location, null: true, foreign_key: { to_table: :locations }
  end
end
