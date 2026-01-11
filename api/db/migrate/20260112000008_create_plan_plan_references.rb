class CreatePlanPlanReferences < ActiveRecord::Migration[8.0]
  def change
    # Plans can mention other plans in their description
    create_table :plan_plan_references do |t|
      t.references :source_plan, null: false, foreign_key: { to_table: :plans }
      t.references :target_plan, null: false, foreign_key: { to_table: :plans }
      t.timestamps
    end
    add_index :plan_plan_references, [:source_plan_id, :target_plan_id], unique: true
  end
end
