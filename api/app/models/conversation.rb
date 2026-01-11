class Conversation < ApplicationRecord
  # Constants
  STATUSES = %w[active archived].freeze

  # Associations
  belongs_to :task, optional: true
  belongs_to :plan, optional: true

  # Validations
  validates :status, presence: true, inclusion: { in: STATUSES }

  # Scopes
  scope :active, -> { where(status: 'active') }
  scope :archived, -> { where(status: 'archived') }
  scope :recent, -> { order(updated_at: :desc) }
  scope :with_context, -> { where.not(task_id: nil).or(where.not(plan_id: nil)) }

  # Callbacks
  before_validation :set_defaults

  # Status methods
  def active?
    status == 'active'
  end

  def archived?
    status == 'archived'
  end

  # Generate a default title from context or first message hint
  def default_title
    if task.present?
      "Chat about: #{task.title.truncate(50)}"
    elsif plan.present?
      "Chat about: #{plan.name.truncate(50)}"
    else
      "New conversation"
    end
  end

  # Context helpers
  def has_context?
    task_id.present? || plan_id.present?
  end

  def context_type
    return 'task' if task_id.present?
    return 'plan' if plan_id.present?
    nil
  end

  def context_object
    task || plan
  end

  private

  def set_defaults
    self.status ||= 'active'
  end
end
