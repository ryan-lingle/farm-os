class Fact < ApplicationRecord
  # Associations
  belongs_to :subject, class_name: 'Asset'
  belongs_to :predicate
  belongs_to :object, class_name: 'Asset', optional: true
  belongs_to :log, optional: true
  
  # Validations
  validates :observed_at, presence: true
  validate :value_or_object_present
  validate :matches_predicate_kind
  
  # Scopes
  scope :measurements, -> { joins(:predicate).where(predicates: { kind: 'measurement' }) }
  scope :relations, -> { joins(:predicate).where(predicates: { kind: 'relation' }) }
  scope :states, -> { joins(:predicate).where(predicates: { kind: 'state' }) }
  scope :recent, -> { order(observed_at: :desc) }
  scope :since, ->(time) { where('observed_at >= ?', time) }
  scope :until, ->(time) { where('observed_at <= ?', time) }
  scope :for_predicate, ->(predicate_name) { joins(:predicate).where(predicates: { name: predicate_name }) }
  scope :for_subject, ->(asset_id) { where(subject_id: asset_id) }
  
  # Methods
  def value
    value_numeric || object
  end
  
  def to_s
    if object_id.present?
      "#{subject.name} #{predicate.name} #{object.name} @ #{observed_at}"
    else
      "#{subject.name} #{predicate.name} #{value_numeric}#{unit} @ #{observed_at}"
    end
  end
  
  private
  
  def value_or_object_present
    if predicate&.measurement? && value_numeric.nil?
      errors.add(:value_numeric, "must be present for measurement predicates")
    elsif predicate&.relation? && object_id.nil?
      errors.add(:object_id, "must be present for relation predicates")
    end
  end
  
  def matches_predicate_kind
    return unless predicate
    
    case predicate.kind
    when 'measurement'
      errors.add(:base, "Measurement facts require value_numeric") if value_numeric.nil?
      errors.add(:base, "Measurement facts should not have object_id") if object_id.present?
    when 'relation'
      errors.add(:base, "Relation facts require object_id") if object_id.nil?
      errors.add(:base, "Relation facts should not have value_numeric") if value_numeric.present?
    end
  end
end

