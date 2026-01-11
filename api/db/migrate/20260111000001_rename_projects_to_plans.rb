class RenameProjectsToPlans < ActiveRecord::Migration[8.0]
  def change
    # Rename the table
    rename_table :projects, :plans

    # Add parent_id for recursive plan hierarchy
    add_reference :plans, :parent, foreign_key: { to_table: :plans }

    # Rename project_id to plan_id on tasks
    rename_column :tasks, :project_id, :plan_id

    # Note: We'll handle making plan_id required in application logic initially
    # to avoid data migration issues with existing tasks
  end
end
