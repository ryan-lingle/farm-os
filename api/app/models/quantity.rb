class Quantity < ApplicationRecord
  belongs_to :log, optional: true

  validates :measure, presence: true
  validates :value, presence: true, numericality: true
  validates :unit, presence: true
end
