class CreateTaskAssets < ActiveRecord::Migration[8.0]
  def change
    create_table :task_assets do |t|
      t.references :task, null: false, foreign_key: true
      t.references :asset, null: false, foreign_key: true

      t.timestamps
    end

    add_index :task_assets, [:task_id, :asset_id], unique: true
  end
end
