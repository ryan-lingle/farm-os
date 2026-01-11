class PlanTaskReference < ApplicationRecord
  belongs_to :plan
  belongs_to :task

  validates :plan_id, uniqueness: { scope: :task_id }
end
