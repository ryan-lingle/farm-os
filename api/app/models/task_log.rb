class TaskLog < ApplicationRecord
  belongs_to :task
  belongs_to :log

  validates :task_id, uniqueness: { scope: :log_id }
end
