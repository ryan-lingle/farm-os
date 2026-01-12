class TagSerializer
  include JSONAPI::Serializer

  attributes :name, :color, :description, :created_at, :updated_at

  attribute :task_count do |tag|
    tag.tasks.count
  end
end
