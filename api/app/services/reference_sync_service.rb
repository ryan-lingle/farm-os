# Extracts entity mentions from HTML content and syncs them to join tables
# This enables bidirectional references: when you mention an asset in a task/plan,
# the asset knows it's been referenced.
#
# Mention format in HTML:
# <span data-mention-type="asset" data-mention-id="123">Laying Hens</span>
#
class ReferenceSyncService
  # Regex to find mentions in HTML content
  # Matches: data-mention-type="type" data-mention-id="id"
  MENTION_REGEX = /data-mention-type="(\w+)"\s+data-mention-id="(\d+)"/

  # Sync references from a record's HTML content to its join tables
  # @param record [Task, Plan] - The record with HTML content
  # @param html_content [String] - The HTML content to parse (e.g., description)
  def self.sync_references(record, html_content)
    mentions = extract_mentions(html_content)

    case record
    when Task
      sync_task_references(record, mentions)
    when Plan
      sync_plan_references(record, mentions)
    else
      Rails.logger.warn "ReferenceSyncService: Unknown record type #{record.class.name}"
    end
  end

  # Extract all mentions from HTML content
  # @param html [String] - HTML content to parse
  # @return [Array<Hash>] - Array of {type:, id:} hashes
  def self.extract_mentions(html)
    return [] if html.blank?

    html.scan(MENTION_REGEX).map do |type, id|
      { type: type, id: id.to_i }
    end.uniq
  end

  private

  # Sync task references to join tables
  def self.sync_task_references(task, mentions)
    # Group mentions by type
    asset_ids = mentions.select { |m| m[:type] == 'asset' }.map { |m| m[:id] }
    location_ids = mentions.select { |m| m[:type] == 'location' }.map { |m| m[:id] }
    log_ids = mentions.select { |m| m[:type] == 'log' }.map { |m| m[:id] }
    plan_ids = mentions.select { |m| m[:type] == 'plan' }.map { |m| m[:id] }
    # Note: task-to-task references use TaskRelation with 'related' type

    # Sync assets
    sync_join_table(
      record: task,
      join_model: TaskAsset,
      foreign_key: :task_id,
      target_key: :asset_id,
      new_ids: asset_ids
    )

    # Sync locations
    sync_join_table(
      record: task,
      join_model: TaskLocation,
      foreign_key: :task_id,
      target_key: :location_id,
      new_ids: location_ids
    )

    # Sync logs
    sync_join_table(
      record: task,
      join_model: TaskLog,
      foreign_key: :task_id,
      target_key: :log_id,
      new_ids: log_ids
    )

    # Sync plans (tasks referencing plans)
    sync_join_table(
      record: task,
      join_model: TaskPlanReference,
      foreign_key: :task_id,
      target_key: :plan_id,
      new_ids: plan_ids
    )
  end

  # Sync plan references to join tables
  def self.sync_plan_references(plan, mentions)
    # Group mentions by type
    asset_ids = mentions.select { |m| m[:type] == 'asset' }.map { |m| m[:id] }
    location_ids = mentions.select { |m| m[:type] == 'location' }.map { |m| m[:id] }
    log_ids = mentions.select { |m| m[:type] == 'log' }.map { |m| m[:id] }
    task_ids = mentions.select { |m| m[:type] == 'task' }.map { |m| m[:id] }
    plan_ids = mentions.select { |m| m[:type] == 'plan' }.map { |m| m[:id] }

    # Exclude self-reference for plans
    plan_ids = plan_ids.reject { |id| id == plan.id }

    # Sync assets
    sync_join_table(
      record: plan,
      join_model: PlanAsset,
      foreign_key: :plan_id,
      target_key: :asset_id,
      new_ids: asset_ids
    )

    # Sync locations
    sync_join_table(
      record: plan,
      join_model: PlanLocation,
      foreign_key: :plan_id,
      target_key: :location_id,
      new_ids: location_ids
    )

    # Sync logs
    sync_join_table(
      record: plan,
      join_model: PlanLog,
      foreign_key: :plan_id,
      target_key: :log_id,
      new_ids: log_ids
    )

    # Sync tasks (plans referencing tasks)
    sync_join_table(
      record: plan,
      join_model: PlanTaskReference,
      foreign_key: :plan_id,
      target_key: :task_id,
      new_ids: task_ids
    )

    # Sync plans (plans referencing other plans)
    sync_join_table(
      record: plan,
      join_model: PlanPlanReference,
      foreign_key: :source_plan_id,
      target_key: :target_plan_id,
      new_ids: plan_ids
    )
  end

  # Generic method to sync a join table
  # Removes old references and adds new ones
  def self.sync_join_table(record:, join_model:, foreign_key:, target_key:, new_ids:)
    # Get current references
    current_ids = join_model.where(foreign_key => record.id).pluck(target_key)

    # Calculate diff
    to_add = new_ids - current_ids
    to_remove = current_ids - new_ids

    # Remove old references
    if to_remove.any?
      join_model.where(foreign_key => record.id, target_key => to_remove).destroy_all
    end

    # Add new references (verify they exist first)
    to_add.each do |target_id|
      begin
        join_model.create!(foreign_key => record.id, target_key => target_id)
      rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique => e
        Rails.logger.warn "ReferenceSyncService: Could not create reference #{join_model.name}(#{foreign_key}=#{record.id}, #{target_key}=#{target_id}): #{e.message}"
      end
    end
  end
end
