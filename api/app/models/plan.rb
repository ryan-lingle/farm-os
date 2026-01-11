class Plan < ApplicationRecord
  # Constants
  STATUSES = %w[planned active completed cancelled].freeze

  # Associations - Recursive hierarchy
  belongs_to :parent, class_name: 'Plan', optional: true
  has_many :children, class_name: 'Plan', foreign_key: :parent_id, dependent: :nullify
  has_many :tasks, dependent: :nullify

  # Entity references (from mentions in description)
  has_many :plan_assets, dependent: :destroy
  has_many :assets, through: :plan_assets
  has_many :plan_locations, dependent: :destroy
  has_many :locations, through: :plan_locations
  has_many :plan_logs, dependent: :destroy
  has_many :logs, through: :plan_logs
  has_many :plan_task_references, dependent: :destroy
  has_many :referenced_tasks, through: :plan_task_references, source: :task
  has_many :outgoing_plan_references, class_name: 'PlanPlanReference', foreign_key: :source_plan_id, dependent: :destroy
  has_many :referenced_plans, through: :outgoing_plan_references, source: :target_plan

  # Back-references (plans/tasks that mention this plan)
  has_many :incoming_plan_references, class_name: 'PlanPlanReference', foreign_key: :target_plan_id, dependent: :destroy
  has_many :referencing_plans, through: :incoming_plan_references, source: :source_plan
  has_many :task_plan_references, dependent: :destroy
  has_many :referencing_tasks, through: :task_plan_references, source: :task

  # Validations
  validates :name, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validate :target_date_after_start_date
  validate :parent_cannot_be_self
  validate :parent_cannot_create_cycle

  # Scopes
  scope :planned, -> { where(status: 'planned') }
  scope :active, -> { where(status: 'active') }
  scope :completed, -> { where(status: 'completed') }
  scope :cancelled, -> { where(status: 'cancelled') }
  scope :in_progress, -> { where(status: %w[planned active]) }
  scope :root_only, -> { where(parent_id: nil) }

  # Callbacks
  before_validation :set_defaults

  # Hierarchy methods
  def root?
    parent_id.nil?
  end

  def leaf?
    children.empty?
  end

  def depth
    return 0 if root?
    parent.depth + 1
  end

  def ancestors
    return [] if root?
    [parent] + parent.ancestors
  end

  def descendants
    children.flat_map { |child| [child] + child.descendants }
  end

  def all_tasks
    # Include tasks from this plan and all descendant plans
    Task.where(plan_id: [id] + descendants.map(&:id))
  end

  # Status methods
  def planned?
    status == 'planned'
  end

  def active?
    status == 'active'
  end

  def completed?
    status == 'completed'
  end

  def cancelled?
    status == 'cancelled'
  end

  def in_progress?
    %w[planned active].include?(status)
  end

  # Task statistics (including descendant plans)
  def task_count
    all_tasks.count
  end

  def completed_task_count
    all_tasks.completed.count
  end

  def active_task_count
    all_tasks.active.count
  end

  def progress_percentage
    return 0 if task_count.zero?
    (completed_task_count.to_f / task_count * 100).round
  end

  # Total estimated time in minutes
  def total_estimate
    all_tasks.sum(:estimate)
  end

  def total_estimate_display
    minutes = total_estimate || 0
    hours = minutes / 60
    mins = minutes % 60
    if hours > 0 && mins > 0
      "#{hours}h #{mins}m"
    elsif hours > 0
      "#{hours}h"
    else
      "#{mins}m"
    end
  end

  # Direct children counts (not including descendants)
  def direct_task_count
    tasks.count
  end

  def child_count
    children.count
  end

  private

  def set_defaults
    self.status ||= 'planned'
  end

  def target_date_after_start_date
    return unless start_date.present? && target_date.present?
    if target_date < start_date
      errors.add(:target_date, "must be after start date")
    end
  end

  def parent_cannot_be_self
    return unless id.present? && parent_id.present?
    if parent_id == id
      errors.add(:parent_id, "cannot be the plan itself")
    end
  end

  def parent_cannot_create_cycle
    return unless parent_id_changed? && parent_id.present?

    # Check if new parent would create a cycle
    ancestor = parent
    while ancestor
      if ancestor.id == id
        errors.add(:parent_id, "would create a circular reference")
        return
      end
      ancestor = ancestor.parent
    end
  end
end
