class TaskRelation < ApplicationRecord
  # Constants
  RELATION_TYPES = %w[blocks related duplicate].freeze

  # Associations
  belongs_to :source_task, class_name: 'Task'
  belongs_to :target_task, class_name: 'Task'

  # Validations
  validates :relation_type, presence: true, inclusion: { in: RELATION_TYPES }
  validates :source_task_id, uniqueness: { scope: [:target_task_id, :relation_type] }
  validate :tasks_are_different
  validate :no_duplicate_inverse_for_symmetric_relations

  # Scopes
  scope :blocks, -> { where(relation_type: 'blocks') }
  scope :related, -> { where(relation_type: 'related') }
  scope :duplicate, -> { where(relation_type: 'duplicate') }

  # Type check methods
  def blocks?
    relation_type == 'blocks'
  end

  def related?
    relation_type == 'related'
  end

  def duplicate?
    relation_type == 'duplicate'
  end

  # Symmetric relations (related) should not have duplicates in reverse
  def symmetric?
    relation_type == 'related'
  end

  private

  def tasks_are_different
    if source_task_id == target_task_id
      errors.add(:base, "A task cannot be related to itself")
    end
  end

  def no_duplicate_inverse_for_symmetric_relations
    return unless symmetric?
    return unless source_task_id && target_task_id

    inverse_exists = TaskRelation.where(
      source_task_id: target_task_id,
      target_task_id: source_task_id,
      relation_type: relation_type
    ).where.not(id: id).exists?

    if inverse_exists
      errors.add(:base, "This relation already exists in the opposite direction")
    end
  end
end
