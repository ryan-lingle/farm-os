class AddMessagesToConversations < ActiveRecord::Migration[8.0]
  def change
    add_column :conversations, :messages, :jsonb, default: [], null: false
  end
end
