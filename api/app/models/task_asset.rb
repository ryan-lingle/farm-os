class TaskAsset < ApplicationRecord
  belongs_to :task
  belongs_to :asset

  validates :task_id, uniqueness: { scope: :asset_id }
end
