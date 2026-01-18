class AddArchivedAtToLogs < ActiveRecord::Migration[8.0]
  def change
    add_column :logs, :archived_at, :datetime
  end
end
