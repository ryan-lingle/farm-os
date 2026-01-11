class PlanLocation < ApplicationRecord
  belongs_to :plan
  belongs_to :location

  validates :plan_id, uniqueness: { scope: :location_id }
end
