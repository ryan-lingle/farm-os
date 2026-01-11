class Asset < ApplicationRecord
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
end
