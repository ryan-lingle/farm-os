class PlanSerializer
  include JSONAPI::Serializer

  set_type "plan"

  attributes :name, :description, :status, :start_date, :target_date, :parent_id, :created_at, :updated_at

  has_many :tasks
  has_many :children, serializer: PlanSerializer
  belongs_to :parent, serializer: PlanSerializer

  # Entity references (from mentions in description)
  has_many :assets
  has_many :locations
  has_many :logs
  has_many :referenced_tasks, serializer: :task
  has_many :referenced_plans, serializer: PlanSerializer

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

  # Hierarchy helpers
  attribute :depth do |object|
    object.depth
  end

  attribute :is_root do |object|
    object.root?
  end

  attribute :is_leaf do |object|
    object.leaf?
  end

  attribute :child_count do |object|
    object.child_count
  end

  attribute :direct_task_count do |object|
    object.direct_task_count
  end

  # Reference counts (for mentions)
  attribute :asset_count do |object|
    object.plan_assets.count
  end

  attribute :location_count do |object|
    object.plan_locations.count
  end

  attribute :log_count do |object|
    object.plan_logs.count
  end

  # Back-reference counts (entities that mention this plan)
  attribute :referencing_task_count do |object|
    object.task_plan_references.count
  end

  attribute :referencing_plan_count do |object|
    object.incoming_plan_references.count
  end

  link :self do |object|
    "/api/v1/plans/#{object.id}"
  end
end
