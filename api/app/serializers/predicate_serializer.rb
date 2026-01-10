class PredicateSerializer
  include JSONAPI::Serializer
  
  set_type :predicate
  set_id :id
  
  attributes :name, :kind, :unit, :description, :constraints, :created_at, :updated_at
  
  # No relationships - predicates are the vocabulary/schema
  # But we could add a meta field to show usage stats
  meta do |predicate|
    {
      facts_count: predicate.facts.count
    }
  end
end

