class TaskLocation < ApplicationRecord
  belongs_to :task
  belongs_to :location

  validates :task_id, uniqueness: { scope: :location_id }
end
