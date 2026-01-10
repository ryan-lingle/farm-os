class CreateTasks < ActiveRecord::Migration[8.0]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.text :description
      t.string :state, default: 'backlog', null: false
      t.integer :estimate # in minutes
      t.date :target_date
      t.references :parent, foreign_key: { to_table: :tasks }
      t.references :project, foreign_key: true
      t.references :cycle, foreign_key: true

      t.timestamps
    end

    add_index :tasks, :state
    add_index :tasks, :target_date
  end
end
