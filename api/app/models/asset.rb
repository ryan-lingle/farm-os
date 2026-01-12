class Asset < ApplicationRecord
  # Thread-local flag to prevent infinite loops when movement logs update assets
  thread_mattr_accessor :skip_movement_log_creation

  # Associations
  has_and_belongs_to_many :logs
  belongs_to :current_location, class_name: 'Location', optional: true

  # Hierarchy - self-referential associations
  belongs_to :parent, class_name: 'Asset', optional: true
  has_many :children, class_name: 'Asset', foreign_key: 'parent_id', dependent: :nullify

  # Back-references (tasks/plans that mention this asset)
  has_many :task_assets, dependent: :destroy
  has_many :referencing_tasks, through: :task_assets, source: :task
  has_many :plan_assets, dependent: :destroy
  has_many :referencing_plans, through: :plan_assets, source: :plan

  # Validations
  validates :name, presence: true
  validates :status, inclusion: { in: %w[active archived] }, allow_nil: true

  # Scopes
  scope :active, -> { where(status: "active") }
  scope :archived, -> { where(status: "archived") }

  # Callbacks
  before_validation :set_defaults
  after_update :create_movement_log_on_location_change, if: :should_create_movement_log?

  # Methods
  def archive!
    update!(status: "archived", archived_at: Time.current)
  end

  def unarchive!
    update!(status: "active", archived_at: nil)
  end

  def active?
    status == "active"
  end

  def archived?
    status == "archived"
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
    return Asset.none unless parent_id
    parent.children.where.not(id: id)
  end

  def depth
    ancestors.count
  end

  private

  def set_defaults
    self.status ||= "active"
  end

  def should_create_movement_log?
    return false if Asset.skip_movement_log_creation
    saved_change_to_current_location_id? && current_location_id.present?
  end

  def create_movement_log_on_location_change
    from_location_id = current_location_id_before_last_save
    to_location_id = current_location_id

    log = Log.create!(
      name: "#{name} moved to #{current_location&.name || 'new location'}",
      log_type: "movement",
      status: "done",
      timestamp: Time.current,
      from_location_id: from_location_id,
      to_location_id: to_location_id,
      moved_at: Time.current,
      notes: "Automatically created from asset location change"
    )

    # Associate this asset with the movement log as a "moved" asset
    AssetLog.create!(log: log, asset: self, role: "moved")
  end
end
