class Task < ApplicationRecord
  # Constants
  STATES = %w[backlog todo in_progress done cancelled].freeze

  # Associations
  belongs_to :parent, class_name: 'Task', optional: true
  has_many :children, class_name: 'Task', foreign_key: 'parent_id', dependent: :nullify
  belongs_to :plan
  belongs_to :cycle, optional: true

  # Many-to-many associations via join tables (entity references from mentions)
  has_many :task_assets, dependent: :destroy
  has_many :assets, through: :task_assets
  has_many :task_locations, dependent: :destroy
  has_many :locations, through: :task_locations
  has_many :task_logs, dependent: :destroy
  has_many :logs, through: :task_logs
  has_many :task_plan_references, dependent: :destroy
  has_many :referenced_plans, through: :task_plan_references, source: :plan
  has_many :task_tags, dependent: :destroy
  has_many :tags, through: :task_tags

  # Back-references (plans that mention this task)
  has_many :plan_task_references, dependent: :destroy
  has_many :referencing_plans, through: :plan_task_references, source: :plan

  # Relations (blocks, blocked_by, related, duplicate)
  has_many :outgoing_relations, class_name: 'TaskRelation', foreign_key: 'source_task_id', dependent: :destroy
  has_many :incoming_relations, class_name: 'TaskRelation', foreign_key: 'target_task_id', dependent: :destroy

  # Validations
  validates :title, presence: true
  validates :state, presence: true, inclusion: { in: STATES }
  validates :estimate, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  # Scopes
  scope :backlog, -> { where(state: 'backlog') }
  scope :todo, -> { where(state: 'todo') }
  scope :in_progress, -> { where(state: 'in_progress') }
  scope :done, -> { where(state: 'done') }
  scope :cancelled, -> { where(state: 'cancelled') }
  scope :active, -> { where(state: %w[backlog todo in_progress]) }
  scope :completed, -> { where(state: %w[done cancelled]) }
  scope :unscheduled, -> { where(cycle_id: nil) }
  scope :scheduled, -> { where.not(cycle_id: nil) }
  scope :in_past_cycles, -> { joins(:cycle).merge(Cycle.past) }

  # Callbacks
  before_validation :set_defaults

  # State methods
  def backlog?
    state == 'backlog'
  end

  def todo?
    state == 'todo'
  end

  def in_progress?
    state == 'in_progress'
  end

  def done?
    state == 'done'
  end

  def cancelled?
    state == 'cancelled'
  end

  def active?
    %w[backlog todo in_progress].include?(state)
  end

  def completed?
    %w[done cancelled].include?(state)
  end

  # Hierarchy methods
  def ancestors
    return [] unless parent
    [parent] + parent.ancestors
  end

  def descendants
    children + children.flat_map(&:descendants)
  end

  def root
    parent ? parent.root : self
  end

  def root?
    parent_id.nil?
  end

  def leaf?
    children.empty?
  end

  def siblings
    return Task.none unless parent_id
    parent.children.where.not(id: id)
  end

  def depth
    ancestors.count
  end

  # Estimate display helpers
  def estimate_in_hours
    return nil unless estimate
    estimate / 60.0
  end

  def estimate_display
    return nil unless estimate
    hours = estimate / 60
    minutes = estimate % 60
    if hours > 0 && minutes > 0
      "#{hours}h #{minutes}m"
    elsif hours > 0
      "#{hours}h"
    else
      "#{minutes}m"
    end
  end

  # Relation helpers
  def blocks
    outgoing_relations.where(relation_type: 'blocks').map(&:target_task)
  end

  def blocked_by
    incoming_relations.where(relation_type: 'blocks').map(&:source_task)
  end

  def related_tasks
    (outgoing_relations.where(relation_type: 'related').map(&:target_task) +
     incoming_relations.where(relation_type: 'related').map(&:source_task)).uniq
  end

  def duplicates
    outgoing_relations.where(relation_type: 'duplicate').map(&:target_task)
  end

  def duplicate_of
    incoming_relations.where(relation_type: 'duplicate').map(&:source_task)
  end

  def blocked?
    blocked_by.any? { |task| task.active? }
  end

  # Class methods for cycle management
  class << self
    # Roll over incomplete tasks from past cycles to the current cycle
    # This mimics Linear's behavior where unfinished tasks automatically
    # move forward when a cycle ends
    def rollover_from_past_cycles!
      current_cycle = Cycle.current_cycle
      return { rolled_over: 0, tasks: [] } unless current_cycle

      tasks_to_rollover = active.in_past_cycles
      rolled_over_tasks = []

      tasks_to_rollover.find_each do |task|
        old_cycle_name = task.cycle&.name
        task.update!(cycle: current_cycle)
        rolled_over_tasks << {
          id: task.id,
          title: task.title,
          from_cycle: old_cycle_name,
          to_cycle: current_cycle.name
        }
      end

      { rolled_over: rolled_over_tasks.count, tasks: rolled_over_tasks }
    end

    # Check if there are any tasks that need to be rolled over
    def pending_rollover_count
      active.in_past_cycles.count
    end
  end

  private

  def set_defaults
    self.state ||= 'backlog'
  end
end
