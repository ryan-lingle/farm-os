class CreateQuantities < ActiveRecord::Migration[8.0]
  def change
    create_table :quantities do |t|
      t.string :label
      t.string :measure
      t.decimal :value
      t.references :unit, null: true, foreign_key: { to_table: :taxonomy_terms }
      t.string :quantity_type

      t.timestamps
    end
  end
end
