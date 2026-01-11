class TaskPlanReference < ApplicationRecord
  belongs_to :task
  belongs_to :plan

  validates :task_id, uniqueness: { scope: :plan_id }
end
