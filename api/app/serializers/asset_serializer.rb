class AssetSerializer
  include JSONAPI::Serializer

  set_type "asset"

  attributes :name, :status, :notes, :geometry, :current_location_id, :quantity, :parent_id, :created_at, :updated_at, :archived_at

  has_one :current_location, serializer: :location
  belongs_to :parent, serializer: :asset
  has_many :children, serializer: :asset

  attribute :asset_type do |object|
    object.asset_type || object.class.name.underscore.gsub("_asset", "")
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

  # Log associations
  has_many :logs

  attribute :log_count do |object|
    object.logs.count
  end

  attribute :recent_logs do |object|
    object.logs.order(timestamp: :desc).limit(10).map do |log|
      {
        id: log.id,
        name: log.name,
        log_type: log.log_type,
        timestamp: log.timestamp,
        status: log.status,
        to_location_id: log.to_location_id
      }
    end
  end

  # Movement history for this asset
  attribute :movement_count do |object|
    object.logs.where(log_type: "movement").count
  end

  attribute :recent_movements do |object|
    object.logs.where(log_type: "movement").order(timestamp: :desc).limit(10).map do |log|
      {
        id: log.id,
        name: log.name,
        timestamp: log.timestamp,
        status: log.status,
        from_location_id: log.from_location_id,
        to_location_id: log.to_location_id
      }
    end
  end

  # Parent asset summary for display
  attribute :parent_summary do |object|
    next nil unless object.parent
    {
      id: object.parent.id,
      name: object.parent.name,
      asset_type: object.parent.asset_type
    }
  end

  # Children summaries for display
  attribute :children_summaries do |object|
    object.children.limit(20).map do |child|
      {
        id: child.id,
        name: child.name,
        asset_type: child.asset_type,
        status: child.status,
        quantity: child.quantity
      }
    end
  end

  # Back-reference counts (entities that mention this asset)
  attribute :referencing_task_count do |object|
    object.task_assets.count
  end

  attribute :referencing_plan_count do |object|
    object.plan_assets.count
  end

  # Actual referencing entities for building indexes
  attribute :referencing_tasks do |object|
    object.referencing_tasks.limit(20).map do |task|
      {
        id: task.id,
        title: task.title,
        state: task.state,
        plan_id: task.plan_id
      }
    end
  end

  attribute :referencing_plans do |object|
    object.referencing_plans.limit(20).map do |plan|
      {
        id: plan.id,
        name: plan.name,
        status: plan.status
      }
    end
  end

  link :self do |object|
    "/api/v1/assets/#{object.asset_type || object.class.name.underscore.gsub('_asset', '')}/#{object.id}"
  end
end
