class AssetLog < ApplicationRecord
  self.table_name = 'assets_logs'
  
  belongs_to :asset
  belongs_to :log
  
  VALID_ROLES = %w[source output moved subject input related].freeze
  
  validates :role, presence: true, inclusion: { in: VALID_ROLES }
  
  # Scopes for common queries
  scope :sources, -> { where(role: 'source') }
  scope :outputs, -> { where(role: 'output') }
  scope :moved, -> { where(role: 'moved') }
  scope :subjects, -> { where(role: 'subject') }
end

