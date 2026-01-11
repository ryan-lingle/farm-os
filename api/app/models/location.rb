# app/models/location.rb
class Location < ApplicationRecord
  # Associations
  has_many :assets, foreign_key: 'current_location_id', dependent: :nullify
  has_many :outgoing_movements, class_name: 'Log', foreign_key: 'from_location_id', dependent: :nullify
  has_many :incoming_movements, class_name: 'Log', foreign_key: 'to_location_id', dependent: :nullify

  # Hierarchy - self-referential associations
  belongs_to :parent, class_name: 'Location', optional: true
  has_many :children, class_name: 'Location', foreign_key: 'parent_id', dependent: :nullify

  # Back-references (tasks/plans that mention this location)
  has_many :task_locations, dependent: :destroy
  has_many :referencing_tasks, through: :task_locations, source: :task
  has_many :plan_locations, dependent: :destroy
  has_many :referencing_plans, through: :plan_locations, source: :plan

  validates :name, presence: true
  validates :location_type, inclusion: { in: %w[point polygon],
    message: "%{value} is not a valid location_type" }

  validate :validate_geometry

  # Scopes
  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :points, -> { where(location_type: "point") }
  scope :polygons, -> { where(location_type: "polygon") }

  # Calculate area for polygon locations (in square meters)
  def area
    return nil unless location_type == 'polygon' && geometry.is_a?(Array)
    
    # Simple polygon area calculation using Shoelace formula
    # Note: This is approximate and works best for small areas
    points = geometry.map { |p| [p['latitude'].to_f, p['longitude'].to_f] }
    return nil if points.length < 3
    
    area = 0.0
    points.each_with_index do |point, i|
      j = (i + 1) % points.length
      area += point[0] * points[j][1]
      area -= points[j][0] * point[1]
    end
    
    # Convert to square meters (approximate)
    # 1 degree latitude ≈ 111,111 meters
    # 1 degree longitude varies by latitude
    avg_lat = points.sum { |p| p[0] } / points.length
    lat_to_meters = 111_111
    lon_to_meters = 111_111 * Math.cos(avg_lat * Math::PI / 180)
    
    (area.abs / 2 * lat_to_meters * lon_to_meters).round(2)
  end
  
  # Convert area to acres
  def area_in_acres
    return nil unless area
    (area / 4046.86).round(2)  # 1 acre = 4046.86 square meters
  end
  
  # Get the center point of the location
  def center_point
    case location_type
    when 'point'
      geometry
    when 'polygon'
      return nil unless geometry.is_a?(Array) && geometry.any?
      
      lat_sum = geometry.sum { |p| p['latitude'].to_f }
      lon_sum = geometry.sum { |p| p['longitude'].to_f }
      
      {
        'latitude' => lat_sum / geometry.length,
        'longitude' => lon_sum / geometry.length
      }
    end
  end

  def archive!
    update!(archived_at: Time.current)
  end

  def unarchive!
    update!(archived_at: nil)
  end

  def active?
    archived_at.nil?
  end

  def archived?
    archived_at.present?
  end

  # Hierarchy methods
  def ancestors
    return [] unless parent
    [parent] + parent.ancestors
  end

  def descendants
    children + children.flat_map(&:descendants)
  end

  def root
    parent ? parent.root : self
  end

  def root?
    parent_id.nil?
  end

  def leaf?
    children.empty?
  end

  def siblings
    return Location.none unless parent_id
    parent.children.where.not(id: id)
  end

  def depth
    ancestors.count
  end

  # Get all assets in this location and all child locations
  def all_assets
    Asset.where(current_location_id: [id] + descendants.map(&:id))
  end

  private

  def validate_geometry
    return if geometry.blank?
    
    case location_type
    when 'point'
      unless geometry.is_a?(Hash) && geometry['latitude'] && geometry['longitude']
        errors.add(:geometry, 'Point must have latitude and longitude')
      end
    when 'polygon'
      unless geometry.is_a?(Array) && geometry.length >= 3
        errors.add(:geometry, 'Polygon must have at least 3 points')
      end
      
      geometry.each_with_index do |point, index|
        unless point.is_a?(Hash) && point['latitude'] && point['longitude']
          errors.add(:geometry, "Point #{index + 1} must have latitude and longitude")
        end
      end
    end
  end
end
