class ConversationSerializer
  include JSONAPI::Serializer

  set_type "conversation"

  attributes :title, :external_id, :status, :task_id, :plan_id, :messages, :created_at, :updated_at

  belongs_to :task, serializer: :task
  belongs_to :plan

  # Computed attributes
  attribute :default_title do |object|
    object.default_title
  end

  attribute :has_context do |object|
    object.has_context?
  end

  attribute :context_type do |object|
    object.context_type
  end

  attribute :is_active do |object|
    object.active?
  end

  attribute :is_archived do |object|
    object.archived?
  end

  link :self do |object|
    "/api/v1/conversations/#{object.id}"
  end
end
