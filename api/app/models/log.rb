class Log < ApplicationRecord
  # Associations
  has_many :quantities, dependent: :destroy
  
  # Role-based asset associations
  has_many :asset_log_associations, class_name: 'AssetLog', dependent: :destroy
  has_many :assets, through: :asset_log_associations
  
  # Scoped associations for specific roles
  has_many :source_associations, -> { where(role: 'source') }, class_name: 'AssetLog'
  has_many :source_assets, through: :source_associations, source: :asset
  
  has_many :output_associations, -> { where(role: 'output') }, class_name: 'AssetLog'
  has_many :output_assets, through: :output_associations, source: :asset
  
  has_many :moved_associations, -> { where(role: 'moved') }, class_name: 'AssetLog'
  has_many :moved_assets, through: :moved_associations, source: :asset
  
  has_many :subject_associations, -> { where(role: 'subject') }, class_name: 'AssetLog'
  has_many :subject_assets, through: :subject_associations, source: :asset
  
  # Location associations
  belongs_to :from_location, class_name: 'Location', optional: true
  belongs_to :to_location, class_name: 'Location', optional: true
  
  # Facts emitted from this log
  has_many :facts, dependent: :nullify

  # Back-references (tasks/plans that mention this log)
  has_many :task_logs, dependent: :destroy
  has_many :referencing_tasks, through: :task_logs, source: :task
  has_many :plan_logs, dependent: :destroy
  has_many :referencing_plans, through: :plan_logs, source: :plan

  accepts_nested_attributes_for :quantities, allow_destroy: true

  # Validations
  validates :name, presence: true
  validates :status, inclusion: { in: %w[pending done] }, allow_nil: true
  validates :timestamp, presence: true

  # Scopes
  scope :pending, -> { where(status: "pending") }
  scope :done, -> { where(status: "done") }
  scope :recent, -> { order(timestamp: :desc) }

  # Callbacks
  before_validation :set_defaults

  # Methods
  def complete!
    update!(status: "done")
    execute_movement! if movement_log?
    process_harvest! if harvest_log?
    emit_facts!
  end

  def pending?
    status == "pending"
  end

  def done?
    status == "done"
  end

  def movement_log?
    log_type == "movement" || (from_location_id.present? && to_location_id.present?)
  end

  def harvest_log?
    log_type == "harvest"
  end

  def execute_movement!
    return unless movement_log? && to_location_id.present?

    # Set flag to prevent Asset callback from creating duplicate movement logs
    Asset.skip_movement_log_creation = true
    begin
      moved_assets.update_all(current_location_id: to_location_id)
      update!(moved_at: Time.current) if moved_at.blank?
    ensure
      Asset.skip_movement_log_creation = false
    end
  end

  def process_harvest!
    HarvestProcessor.process(self)
  rescue => e
    Rails.logger.error("Failed to process harvest for log #{id}: #{e.message}")
  end

  def emit_facts!
    FactEmitter.emit_from_log(self)
  rescue => e
    Rails.logger.error("Failed to emit facts for log #{id}: #{e.message}")
  end

  private

  def set_defaults
    self.status ||= "pending"
    self.timestamp ||= Time.current
  end
end
