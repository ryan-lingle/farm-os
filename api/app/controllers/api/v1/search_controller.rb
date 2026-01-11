module Api
  module V1
    class SearchController < ApiController
      # GET /api/v1/search?q=query&types=asset,location,task,plan,log
      # Returns a unified search across multiple entity types for autocomplete
      def index
        query = params[:q]&.strip&.downcase
        types = params[:types]&.split(',') || %w[asset location task plan log]
        limit = (params[:limit] || 10).to_i.clamp(1, 50)

        results = []

        if query.present? && query.length >= 1
          results += search_assets(query, limit) if types.include?('asset')
          results += search_locations(query, limit) if types.include?('location')
          results += search_tasks(query, limit) if types.include?('task')
          results += search_plans(query, limit) if types.include?('plan')
          results += search_logs(query, limit) if types.include?('log')
        end

        # Sort by relevance (exact matches first, then by name)
        results.sort_by! do |r|
          name = r[:name].downcase
          if name == query
            [0, name]
          elsif name.start_with?(query)
            [1, name]
          else
            [2, name]
          end
        end

        render json: {
          jsonapi: { version: "1.0" },
          data: results.take(limit),
          meta: { query: query, types: types, total: results.length }
        }
      end

      private

      def search_assets(query, limit)
        Asset.active
          .where("LOWER(name) LIKE ?", "%#{query}%")
          .limit(limit)
          .map do |asset|
            {
              type: 'asset',
              id: asset.id,
              name: asset.name,
              asset_type: asset.asset_type,
              icon: asset_icon(asset.asset_type),
              url: "/assets/#{asset.asset_type}/#{asset.id}"
            }
          end
      end

      def search_locations(query, limit)
        Location.active
          .where("LOWER(name) LIKE ?", "%#{query}%")
          .limit(limit)
          .map do |location|
            {
              type: 'location',
              id: location.id,
              name: location.name,
              location_type: location.location_type,
              icon: 'map-pin',
              url: "/locations/#{location.id}"
            }
          end
      end

      def search_tasks(query, limit)
        Task.where("LOWER(title) LIKE ?", "%#{query}%")
          .where.not(state: 'cancelled')
          .limit(limit)
          .map do |task|
            {
              type: 'task',
              id: task.id,
              name: task.title,
              state: task.state,
              icon: 'check-square',
              url: "/tasks/#{task.id}"
            }
          end
      end

      def search_plans(query, limit)
        Plan.where("LOWER(name) LIKE ?", "%#{query}%")
          .where.not(status: 'cancelled')
          .limit(limit)
          .map do |plan|
            {
              type: 'plan',
              id: plan.id,
              name: plan.name,
              status: plan.status,
              icon: 'folder-kanban',
              url: "/plans/#{plan.id}"
            }
          end
      end

      def search_logs(query, limit)
        Log.where("LOWER(name) LIKE ?", "%#{query}%")
          .recent
          .limit(limit)
          .map do |log|
            {
              type: 'log',
              id: log.id,
              name: log.name,
              log_type: log.log_type,
              status: log.status,
              icon: 'file-text',
              url: "/logs/#{log.log_type}/#{log.id}"
            }
          end
      end

      def asset_icon(asset_type)
        case asset_type
        when 'animal' then 'bug'
        when 'plant' then 'leaf'
        when 'equipment' then 'tractor'
        when 'structure' then 'building'
        when 'material' then 'package'
        when 'land' then 'map'
        else 'box'
        end
      end
    end
  end
end
