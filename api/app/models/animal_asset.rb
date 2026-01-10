class AnimalAsset < Asset
  # Additional fields specific to animals can be added later
  # For now, we'll use the base Asset fields

  def self.model_name
    Asset.model_name
  end
end
