class AddRoleToAssetsLogs < ActiveRecord::Migration[8.0]
  def change
    add_column :assets_logs, :role, :string, null: false, default: 'related'
    add_index :assets_logs, [:log_id, :role]
    add_index :assets_logs, [:asset_id, :role]
  end
end

