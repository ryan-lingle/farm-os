class FactEmitter
  def self.emit_from_log(log)
    new(log).emit
  end
  
  def initialize(log)
    @log = log
  end
  
  def emit
    case @log.log_type
    when 'harvest'
      emit_harvest_facts
    when 'movement'
      emit_movement_facts
    when 'observation'
      emit_observation_facts
    end
  end
  
  private
  
  # For harvest logs: emit yield facts about the SOURCE
  def emit_harvest_facts
    yield_pred = Predicate.find_by(name: 'yield')
    return unless yield_pred
    
    quantity = @log.quantities.first
    return unless quantity
    
    # KEY: Use role-based association to get the SOURCE
    @log.source_assets.each do |source_asset|
      Fact.create!(
        subject_id: source_asset.id,
        predicate_id: yield_pred.id,
        value_numeric: quantity.value,
        unit: quantity.unit,
        observed_at: @log.timestamp,
        log_id: @log.id
      )
    end
  end
  
  # For movement logs: emit grazes facts about MOVED assets
  def emit_movement_facts
    return unless @log.to_location_id
    
    grazes_pred = Predicate.find_by(name: 'grazes')
    return unless grazes_pred
    
    # KEY: Use role-based association to get MOVED assets
    @log.moved_assets.each do |moved_asset|
      Fact.create!(
        subject_id: moved_asset.id,
        predicate_id: grazes_pred.id,
        object_id: @log.to_location_id,
        observed_at: @log.timestamp,
        log_id: @log.id
      )
    end
  end
  
  # For observation logs: emit various facts about SUBJECT
  def emit_observation_facts
    # Could emit multiple facts from one observation
    @log.subject_assets.each do |subject_asset|
      emit_weight_fact(subject_asset) if has_weight_quantity?
      # Add more as needed (health_status, body_condition_score, etc.)
    end
  end
  
  def emit_weight_fact(subject_asset)
    weight_pred = Predicate.find_by(name: 'weight')
    return unless weight_pred
    
    weight = @log.quantities.find_by(quantity_type: 'weight')
    return unless weight
    
    Fact.create!(
      subject_id: subject_asset.id,
      predicate_id: weight_pred.id,
      value_numeric: weight.value,
      unit: weight.unit,
      observed_at: @log.timestamp,
      log_id: @log.id
    )
  end
  
  def has_weight_quantity?
    @log.quantities.exists?(quantity_type: 'weight')
  end
end

