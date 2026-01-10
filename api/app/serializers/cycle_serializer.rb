class CycleSerializer
  include JSONAPI::Serializer

  set_type "cycle"

  attributes :name, :start_date, :end_date, :created_at, :updated_at

  has_many :tasks

  # Timing attributes
  attribute :is_current do |object|
    object.current?
  end

  attribute :is_past do |object|
    object.past?
  end

  attribute :is_future do |object|
    object.future?
  end

  attribute :days_remaining do |object|
    object.days_remaining
  end

  attribute :days_elapsed do |object|
    object.days_elapsed
  end

  attribute :total_days do |object|
    object.total_days
  end

  attribute :progress_percentage do |object|
    object.progress_percentage
  end

  # Task statistics
  attribute :task_count do |object|
    object.task_count
  end

  attribute :completed_task_count do |object|
    object.completed_task_count
  end

  attribute :active_task_count do |object|
    object.active_task_count
  end

  attribute :task_completion_percentage do |object|
    object.task_completion_percentage
  end

  attribute :total_estimate do |object|
    object.total_estimate
  end

  attribute :completed_estimate do |object|
    object.completed_estimate
  end

  link :self do |object|
    "/api/v1/cycles/#{object.id}"
  end
end
