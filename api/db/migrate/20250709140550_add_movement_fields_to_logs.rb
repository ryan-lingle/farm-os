class AddMovementFieldsToLogs < ActiveRecord::Migration[8.0]
  def change
    add_reference :logs, :from_location, null: true, foreign_key: { to_table: :locations }
    add_reference :logs, :to_location, null: true, foreign_key: { to_table: :locations }
    add_column :logs, :moved_at, :datetime
  end
end
