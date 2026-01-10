class FactSerializer
  include JSONAPI::Serializer
  
  set_type :fact
  set_id :id
  
  attributes :value_numeric, :unit, :observed_at, :created_at, :updated_at
  
  # AI can follow these to get full context
  belongs_to :subject, record_type: :asset, serializer: :asset
  belongs_to :predicate, serializer: :predicate
  belongs_to :object, record_type: :asset, serializer: :asset, optional: true
  belongs_to :log, serializer: :log, optional: true
  
  # Add a human-readable representation
  attribute :statement do |fact|
    if fact.object_id.present?
      "#{fact.subject.name} #{fact.predicate.name} #{fact.object&.name}"
    else
      "#{fact.subject.name} #{fact.predicate.name} #{fact.value_numeric}#{fact.unit}"
    end
  end
end

