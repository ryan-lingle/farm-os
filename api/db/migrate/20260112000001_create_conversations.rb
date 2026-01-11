class CreateConversations < ActiveRecord::Migration[8.0]
  def change
    create_table :conversations do |t|
      t.string :title
      t.string :external_id  # ID from external chat backend
      t.string :status, default: 'active', null: false  # active, archived
      t.references :task, foreign_key: true
      t.references :plan, foreign_key: true

      t.timestamps
    end

    add_index :conversations, :status
    add_index :conversations, :external_id
  end
end
