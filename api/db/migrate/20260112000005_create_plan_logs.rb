class CreatePlanLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :plan_logs do |t|
      t.references :plan, null: false, foreign_key: true
      t.references :log, null: false, foreign_key: true
      t.timestamps
    end
    add_index :plan_logs, [:plan_id, :log_id], unique: true
  end
end
