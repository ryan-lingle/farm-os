class CreateAssets < ActiveRecord::Migration[8.0]
  def change
    create_table :assets do |t|
      t.string :name
      t.string :status
      t.text :notes
      t.boolean :is_location
      t.boolean :is_fixed
      t.string :asset_type
      t.datetime :archived_at

      t.timestamps
    end
  end
end
