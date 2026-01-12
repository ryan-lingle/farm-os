# app/serializers/location_serializer.rb
class LocationSerializer
  include JSONAPI::Serializer

  attributes :name, :status, :notes, :location_type, :geometry, :parent_id, :archived_at, :created_at, :updated_at, :is_root_location
  
  # Relationships
  has_many :assets
  has_many :incoming_movements, serializer: :log
  has_many :outgoing_movements, serializer: :log
  belongs_to :parent, serializer: :location
  has_many :children, serializer: :location
  
  # Include computed attributes
  attribute :center_point do |location|
    location.center_point
  end
  
  attribute :area_in_acres do |location|
    location.area_in_acres
  end

  # Helper attribute for asset count
  attribute :asset_count do |location|
    location.assets.count
  end

  # Movement log counts
  attribute :incoming_movement_count do |location|
    location.incoming_movements.count
  end

  attribute :outgoing_movement_count do |location|
    location.outgoing_movements.count
  end

  # Recent movements for quick view
  attribute :recent_movements do |location|
    movements = (location.incoming_movements + location.outgoing_movements)
                .sort_by { |m| m.timestamp || m.created_at }
                .reverse
                .first(10)
    movements.map do |log|
      {
        id: log.id,
        name: log.name,
        log_type: log.log_type,
        timestamp: log.timestamp,
        direction: log.to_location_id == location.id ? 'incoming' : 'outgoing',
        from_location_id: log.from_location_id,
        to_location_id: log.to_location_id
      }
    end
  end

  # Hierarchy attributes
  attribute :depth do |location|
    location.depth
  end

  attribute :is_root do |location|
    location.root?
  end

  attribute :is_leaf do |location|
    location.leaf?
  end

  attribute :child_count do |location|
    location.children.count
  end

  attribute :total_asset_count do |location|
    location.all_assets.count
  end

  # Back-reference counts (entities that mention this location)
  attribute :referencing_task_count do |location|
    location.task_locations.count
  end

  attribute :referencing_plan_count do |location|
    location.plan_locations.count
  end

  # Actual referencing entities for building indexes
  attribute :referencing_tasks do |location|
    location.referencing_tasks.limit(20).map do |task|
      {
        id: task.id,
        title: task.title,
        state: task.state,
        plan_id: task.plan_id
      }
    end
  end

  attribute :referencing_plans do |location|
    location.referencing_plans.limit(20).map do |plan|
      {
        id: plan.id,
        name: plan.name,
        status: plan.status
      }
    end
  end
end
