class CreateFacts < ActiveRecord::Migration[8.0]
  def change
    create_table :facts, id: :uuid do |t|
      t.bigint :subject_id, null: false     # references assets.id
      t.uuid :predicate_id, null: false     # references predicates.id
      t.bigint :object_id                   # references assets.id (for relations)
      t.decimal :value_numeric, precision: 12, scale: 3
      t.string :unit
      t.datetime :observed_at, null: false
      t.bigint :log_id                      # references logs.id (provenance)

      t.timestamps
    end

    add_index :facts, [:subject_id, :predicate_id, :observed_at], name: 'index_facts_on_subject_predicate_time'
    add_index :facts, [:predicate_id, :observed_at]
    add_index :facts, [:object_id, :predicate_id, :observed_at], name: 'index_facts_on_object_predicate_time'
    add_index :facts, :log_id

    add_foreign_key :facts, :assets, column: :subject_id
    add_foreign_key :facts, :predicates, column: :predicate_id
    add_foreign_key :facts, :assets, column: :object_id
    add_foreign_key :facts, :logs, column: :log_id
  end
end

