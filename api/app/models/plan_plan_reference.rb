class PlanPlanReference < ApplicationRecord
  belongs_to :source_plan, class_name: 'Plan'
  belongs_to :target_plan, class_name: 'Plan'

  validates :source_plan_id, uniqueness: { scope: :target_plan_id }
  validate :cannot_reference_self

  private

  def cannot_reference_self
    if source_plan_id == target_plan_id
      errors.add(:target_plan_id, "cannot reference itself")
    end
  end
end
