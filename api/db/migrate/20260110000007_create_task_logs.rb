class CreateTaskLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :task_logs do |t|
      t.references :task, null: false, foreign_key: true
      t.references :log, null: false, foreign_key: true

      t.timestamps
    end

    add_index :task_logs, [:task_id, :log_id], unique: true
  end
end
