class CreateTaxonomyTerms < ActiveRecord::Migration[8.0]
  def change
    create_table :taxonomy_terms do |t|
      t.string :name
      t.string :vocabulary
      t.text :description

      t.timestamps
    end
  end
end
