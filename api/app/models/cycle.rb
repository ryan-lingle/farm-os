class Cycle < ApplicationRecord
  # Associations
  has_many :tasks, dependent: :nullify

  # Validations
  validates :name, presence: true
  validates :start_date, presence: true
  validates :end_date, presence: true
  validate :end_date_after_start_date
  validate :no_overlapping_cycles

  # Scopes
  scope :current, -> { where('start_date <= ? AND end_date >= ?', Date.current, Date.current) }
  scope :past, -> { where('end_date < ?', Date.current) }
  scope :future, -> { where('start_date > ?', Date.current) }
  scope :chronological, -> { order(start_date: :asc) }
  scope :reverse_chronological, -> { order(start_date: :desc) }

  # Class methods for auto-generation
  class << self
    def generate_for_month(year, month)
      start_date = Date.new(year, month, 1)
      end_date = start_date.end_of_month
      name = start_date.strftime('%B %Y')

      find_or_create_by!(start_date: start_date, end_date: end_date) do |cycle|
        cycle.name = name
      end
    end

    def generate_for_date(date)
      generate_for_month(date.year, date.month)
    end

    def current_cycle
      current.first || generate_for_date(Date.current)
    end

    def ensure_cycles_exist(months_ahead: 3, months_behind: 1)
      today = Date.current

      # Generate past months
      months_behind.times do |i|
        date = today - (i + 1).months
        generate_for_month(date.year, date.month)
      end

      # Generate current month
      generate_for_month(today.year, today.month)

      # Generate future months
      months_ahead.times do |i|
        date = today + (i + 1).months
        generate_for_month(date.year, date.month)
      end

      chronological.all
    end

    def next_cycle
      future.chronological.first || generate_for_date(Date.current + 1.month)
    end

    def previous_cycle
      past.reverse_chronological.first
    end
  end

  # Instance methods
  def current?
    start_date <= Date.current && end_date >= Date.current
  end

  def past?
    end_date < Date.current
  end

  def future?
    start_date > Date.current
  end

  def days_remaining
    return 0 if past?
    return (end_date - start_date).to_i + 1 if future?
    (end_date - Date.current).to_i + 1
  end

  def days_elapsed
    return 0 if future?
    return (end_date - start_date).to_i + 1 if past?
    (Date.current - start_date).to_i + 1
  end

  def total_days
    (end_date - start_date).to_i + 1
  end

  def progress_percentage
    return 100 if past?
    return 0 if future?
    (days_elapsed.to_f / total_days * 100).round
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

  def task_completion_percentage
    return 0 if task_count.zero?
    (completed_task_count.to_f / task_count * 100).round
  end

  # Total estimated time in minutes
  def total_estimate
    tasks.sum(:estimate)
  end

  def completed_estimate
    tasks.completed.sum(:estimate)
  end

  private

  def end_date_after_start_date
    return unless start_date.present? && end_date.present?
    if end_date < start_date
      errors.add(:end_date, "must be after start date")
    end
  end

  def no_overlapping_cycles
    return unless start_date.present? && end_date.present?

    overlapping = Cycle.where.not(id: id)
                       .where('start_date <= ? AND end_date >= ?', end_date, start_date)

    if overlapping.exists?
      errors.add(:base, "Cycle dates overlap with existing cycle")
    end
  end
end
