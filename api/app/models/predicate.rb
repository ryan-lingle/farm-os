class Predicate < ApplicationRecord
  # Associations
  has_many :facts, dependent: :restrict_with_error
  
  # Validations
  validates :name, presence: true, uniqueness: true
  validates :kind, presence: true, inclusion: { in: %w[measurement relation state] }
  
  # Scopes
  scope :measurements, -> { where(kind: 'measurement') }
  scope :relations, -> { where(kind: 'relation') }
  scope :states, -> { where(kind: 'state') }
  
  # Methods
  def measurement?
    kind == 'measurement'
  end
  
  def relation?
    kind == 'relation'
  end
  
  def state?
    kind == 'state'
  end
  
  # Constraint helpers for AI validation
  def domain_types
    constraints.dig('domain')&.split('|') || []
  end
  
  def range_types
    constraints.dig('range')&.split('|') || []
  end
  
  def min_value
    constraints.dig('min')
  end
  
  def max_value
    constraints.dig('max')
  end
  
  def validate_domain(asset)
    return true if domain_types.empty?
    domain_types.include?(asset.asset_type) || domain_types.include?(asset.class.name)
  end
  
  def validate_range(value_or_asset)
    return true if range_types.empty?
    
    if value_or_asset.is_a?(Numeric)
      range_types.include?('number')
    elsif value_or_asset.respond_to?(:asset_type)
      range_types.include?(value_or_asset.asset_type) || range_types.include?(value_or_asset.class.name)
    else
      false
    end
  end
end

