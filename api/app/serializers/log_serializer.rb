class LogSerializer
  include JSONAPI::Serializer

  set_type :log

  attributes :name, :status, :notes, :timestamp, :log_type, :from_location_id, :to_location_id, :moved_at, :created_at, :updated_at

  has_many :quantities
  has_many :assets
  has_one :from_location, serializer: :location
  has_one :to_location, serializer: :location

  # Helper attribute to identify movement logs
  attribute :is_movement do |log|
    log.movement_log?
  end

  # Back-reference counts (entities that mention this log)
  attribute :referencing_task_count do |log|
    log.task_logs.count
  end

  attribute :referencing_plan_count do |log|
    log.plan_logs.count
  end
end
