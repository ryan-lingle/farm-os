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

  link :self do |object|
    "/api/v1/assets/#{object.asset_type || object.class.name.underscore.gsub('_asset', '')}/#{object.id}"
  end
end
