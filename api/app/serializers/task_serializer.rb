class TaskSerializer
  include JSONAPI::Serializer

  set_type "task"

  attributes :title, :description, :state, :estimate, :target_date, :parent_id, :plan_id, :cycle_id, :created_at, :updated_at

  belongs_to :parent, serializer: :task
  has_many :children, serializer: :task
  belongs_to :plan
  belongs_to :cycle
  has_many :assets
  has_many :locations
  has_many :logs

  # Computed attributes
  attribute :estimate_display do |object|
    object.estimate_display
  end

  attribute :estimate_in_hours do |object|
    object.estimate_in_hours
  end

  # Hierarchy attributes
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
    object.children.count
  end

  # State helpers
  attribute :is_active do |object|
    object.active?
  end

  attribute :is_completed do |object|
    object.completed?
  end

  attribute :is_blocked do |object|
    object.blocked?
  end

  # Relations summary
  attribute :blocks_count do |object|
    object.outgoing_relations.blocks.count
  end

  attribute :blocked_by_count do |object|
    object.incoming_relations.blocks.count
  end

  link :self do |object|
    "/api/v1/tasks/#{object.id}"
  end
end
