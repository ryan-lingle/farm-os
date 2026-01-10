class RemoveLocationFieldsFromAssets < ActiveRecord::Migration[8.0]
  def change
    # Remove redundant location-related fields
    # Keep current_location_id (needed to track where assets are)
    # Keep geometry (useful for asset shape/bounds within a location)
    remove_column :assets, :is_location, :boolean
    remove_column :assets, :is_fixed, :boolean
  end
end
