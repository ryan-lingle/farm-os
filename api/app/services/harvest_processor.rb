class HarvestProcessor
  def self.process(log)
    new(log).process
  end
  
  def initialize(log)
    @log = log
  end
  
  def process
    quantity = @log.quantities.first
    return unless quantity
    
    source_asset = @log.source_assets.first
    return unless source_asset
    
    # Find or create output asset (e.g., eggs) for this source
    output_asset = find_or_create_output_asset(source_asset, quantity)
    
    # Add the harvested quantity to inventory
    output_asset.increment!(:quantity, quantity.value)
    
    # Link the output asset to this log with role='output'
    link_output_asset(output_asset)
    
    output_asset
  end
  
  private
  
  def find_or_create_output_asset(source_asset, quantity)
    # Determine the output asset type based on the quantity unit or log context
    output_type = determine_output_type(quantity)
    
    # Find existing output asset from this source
    # OR create a new one
    Asset.find_or_create_by!(
      asset_type: output_type,
      parent_id: source_asset.id,
      current_location_id: output_location
    ) do |asset|
      asset.name = "#{output_type.capitalize} from #{source_asset.name}"
      asset.quantity = 0
      asset.status = 'active'
    end
  end
  
  def determine_output_type(quantity)
    # Map quantity units to asset types
    case quantity.unit&.downcase
    when 'egg', 'eggs'
      'egg'
    when 'liter', 'liters', 'l', 'gallon', 'gallons'
      'milk'
    when 'lb', 'lbs', 'kg', 'pound', 'pounds', 'kilogram', 'kilograms'
      'harvest'
    else
      'product'
    end
  end
  
  def output_location
    # Use the log's to_location if specified
    # Otherwise use the source asset's current location
    @log.to_location_id || @log.source_assets.first&.current_location_id
  end
  
  def link_output_asset(output_asset)
    # Only add if not already linked
    unless @log.output_assets.include?(output_asset)
      @log.asset_log_associations.create!(
        asset: output_asset,
        role: 'output'
      )
    end
  end
end

