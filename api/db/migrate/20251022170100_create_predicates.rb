class CreatePredicates < ActiveRecord::Migration[8.0]
  def change
    create_table :predicates, id: :uuid do |t|
      t.string :name, null: false
      t.string :kind, null: false  # measurement|relation|state
      t.string :unit
      t.text :description
      t.jsonb :constraints, default: {}

      t.timestamps
    end

    add_index :predicates, :name, unique: true
    add_index :predicates, :kind
  end
end

