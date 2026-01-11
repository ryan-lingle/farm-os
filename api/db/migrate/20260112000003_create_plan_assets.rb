class CreatePlanAssets < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_assets do |t|
      t.references :plan, null: false, foreign_key: true
      t.references :asset, null: false, foreign_key: true
      t.timestamps
    end
    add_index :plan_assets, [:plan_id, :asset_id], unique: true
  end
end
