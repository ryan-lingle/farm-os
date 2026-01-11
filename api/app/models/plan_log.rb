class PlanLog < ApplicationRecord
  belongs_to :plan
  belongs_to :log

  validates :plan_id, uniqueness: { scope: :log_id }
end
