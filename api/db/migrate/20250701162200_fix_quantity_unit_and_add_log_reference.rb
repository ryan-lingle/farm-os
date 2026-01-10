class FixQuantityUnitAndAddLogReference < ActiveRecord::Migration[8.0]
  def change
    # Remove the foreign key constraint and the unit_id column
    remove_reference :quantities, :unit, foreign_key: { to_table: :taxonomy_terms }

    # Add unit as a simple string column
    add_column :quantities, :unit, :string

    # Add reference to logs
    add_reference :quantities, :log, foreign_key: true
  end
end
