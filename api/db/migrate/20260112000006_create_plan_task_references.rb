class CreatePlanTaskReferences < ActiveRecord::Migration[8.0]
  def change
    # Cross-plan task references (distinct from plan_id ownership)
    # This allows plans to mention tasks from other plans in their description
    create_table :plan_task_references do |t|
      t.references :plan, null: false, foreign_key: true
      t.references :task, null: false, foreign_key: true
      t.timestamps
    end
    add_index :plan_task_references, [:plan_id, :task_id], unique: true
  end
end
