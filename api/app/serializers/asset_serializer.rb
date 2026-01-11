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
