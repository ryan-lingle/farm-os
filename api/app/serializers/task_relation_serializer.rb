class TaskRelationSerializer
  include JSONAPI::Serializer

  set_type "task_relation"

  attributes :relation_type, :source_task_id, :target_task_id, :created_at, :updated_at

  belongs_to :source_task, serializer: :task
  belongs_to :target_task, serializer: :task

  link :self do |object|
    "/api/v1/task_relations/#{object.id}"
  end
end
