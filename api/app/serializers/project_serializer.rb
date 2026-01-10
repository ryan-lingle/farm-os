class ProjectSerializer
  include JSONAPI::Serializer

  set_type "project"

  attributes :name, :description, :status, :start_date, :target_date, :created_at, :updated_at

  has_many :tasks

  # Computed attributes
  attribute :task_count do |object|
    object.task_count
  end

  attribute :completed_task_count do |object|
    object.completed_task_count
  end

  attribute :active_task_count do |object|
    object.active_task_count
  end

  attribute :progress_percentage do |object|
    object.progress_percentage
  end

  attribute :total_estimate do |object|
    object.total_estimate
  end

  attribute :total_estimate_display do |object|
    object.total_estimate_display
  end

  # Status helpers
  attribute :is_in_progress do |object|
    object.in_progress?
  end

  link :self do |object|
    "/api/v1/projects/#{object.id}"
  end
end
