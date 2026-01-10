class CreateProjects < ActiveRecord::Migration[8.0]
  def change
    create_table :projects do |t|
      t.string :name, null: false
      t.text :description
      t.string :status, default: 'planned', null: false
      t.date :start_date
      t.date :target_date

      t.timestamps
    end

    add_index :projects, :status
  end
end
