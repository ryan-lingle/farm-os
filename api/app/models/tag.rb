class Tag < ApplicationRecord
  # Associations
  has_many :task_tags, dependent: :destroy
  has_many :tasks, through: :task_tags

  # Validations
  validates :name, presence: true, uniqueness: { case_sensitive: false }
  validates :color, format: { with: /\A#[0-9A-Fa-f]{6}\z/, message: "must be a valid hex color" }, allow_blank: true

  # Scopes
  scope :alphabetical, -> { order(:name) }

  # Callbacks
  before_save :normalize_name

  private

  def normalize_name
    self.name = name.strip if name.present?
  end
end
