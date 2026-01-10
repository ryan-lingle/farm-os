class CreateAssetsLogsJoinTable < ActiveRecord::Migration[8.0]
  def change
    create_join_table :assets, :logs do |t|
      t.index :asset_id
      t.index :log_id
    end
  end
end
