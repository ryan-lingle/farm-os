class Project < ApplicationRecord
  # Constants
  STATUSES = %w[planned active completed cancelled].freeze

  # Associations
  has_many :tasks, dependent: :nullify

  # Validations
  validates :name, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validate :target_date_after_start_date

  # Scopes
  scope :planned, -> { where(status: 'planned') }
  scope :active, -> { where(status: 'active') }
  scope :completed, -> { where(status: 'completed') }
  scope :cancelled, -> { where(status: 'cancelled') }
  scope :in_progress, -> { where(status: %w[planned active]) }

  # Callbacks
  before_validation :set_defaults

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

  # Task statistics
  def task_count
    tasks.count
  end

  def completed_task_count
    tasks.completed.count
  end

  def active_task_count
    tasks.active.count
  end

  def progress_percentage
    return 0 if task_count.zero?
    (completed_task_count.to_f / task_count * 100).round
  end

  # Total estimated time in minutes
  def total_estimate
    tasks.sum(:estimate)
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
end
