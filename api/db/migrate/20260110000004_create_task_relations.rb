class CreateTaskRelations < ActiveRecord::Migration[8.0]
  def change
    create_table :task_relations do |t|
      t.references :source_task, null: false, foreign_key: { to_table: :tasks }
      t.references :target_task, null: false, foreign_key: { to_table: :tasks }
      t.string :relation_type, null: false

      t.timestamps
    end

    add_index :task_relations, :relation_type
    add_index :task_relations, [:source_task_id, :target_task_id, :relation_type], unique: true, name: 'index_task_relations_unique'
  end
end
