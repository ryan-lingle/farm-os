class PlanAsset < ApplicationRecord
  belongs_to :plan
  belongs_to :asset

  validates :plan_id, uniqueness: { scope: :asset_id }
end
