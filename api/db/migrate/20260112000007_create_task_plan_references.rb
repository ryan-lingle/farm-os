class CreateTaskPlanReferences < ActiveRecord::Migration[8.0]
  def change
    # Tasks can mention plans in their description
    create_table :task_plan_references do |t|
      t.references :task, null: false, foreign_key: true
      t.references :plan, null: false, foreign_key: true
      t.timestamps
    end
    add_index :task_plan_references, [:task_id, :plan_id], unique: true
  end
end
