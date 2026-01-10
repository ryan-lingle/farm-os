class RemoveObjectForeignKeyFromFacts < ActiveRecord::Migration[8.0]
  def change
    # Remove the foreign key constraint on object_id
    # because it can reference either assets.id or locations.id
    remove_foreign_key :facts, column: :object_id, if_exists: true
  end
end

