class CreateLogs < ActiveRecord::Migration[8.0]
  def change
    create_table :logs do |t|
      t.string :name
      t.string :status
      t.text :notes
      t.string :log_type
      t.datetime :timestamp

      t.timestamps
    end
  end
end
