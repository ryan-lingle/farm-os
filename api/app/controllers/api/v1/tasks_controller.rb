module Api
  module V1
    class TasksController < ApiController
      before_action :set_task, only: [:show, :update, :destroy]

      def index
        tasks = Task.all

        # State filter
        if params.dig(:filter, :state)
          tasks = tasks.where(state: params[:filter][:state])
        end

        # Project filter
        if params.dig(:filter, :project_id)
          tasks = tasks.where(project_id: params[:filter][:project_id])
        end

        # Cycle filter
        if params.dig(:filter, :cycle_id)
          tasks = tasks.where(cycle_id: params[:filter][:cycle_id])
        end

        # Parent filter (for subtasks)
        if params.dig(:filter, :parent_id)
          tasks = tasks.where(parent_id: params[:filter][:parent_id])
        end

        # Root only filter
        if params.dig(:filter, :root_only) == "true"
          tasks = tasks.where(parent_id: nil)
        end

        # Unscheduled filter
        if params.dig(:filter, :unscheduled) == "true"
          tasks = tasks.unscheduled
        end

        # Active/completed filters
        if params.dig(:filter, :active) == "true"
          tasks = tasks.active
        elsif params.dig(:filter, :completed) == "true"
          tasks = tasks.completed
        end

        # Target date filters
        if params.dig(:filter, :target_date_before)
          tasks = tasks.where("target_date <= ?", Date.parse(params[:filter][:target_date_before]))
        end
        if params.dig(:filter, :target_date_after)
          tasks = tasks.where("target_date >= ?", Date.parse(params[:filter][:target_date_after]))
        end

        # Asset filter
        if params.dig(:filter, :asset_id)
          tasks = tasks.joins(:task_assets).where(task_assets: { asset_id: params[:filter][:asset_id] })
        end

        # Location filter
        if params.dig(:filter, :location_id)
          tasks = tasks.joins(:task_locations).where(task_locations: { location_id: params[:filter][:location_id] })
        end

        render json: TaskSerializer.new(tasks).serializable_hash
      end

      def show
        render json: TaskSerializer.new(@task).serializable_hash
      end

      def create
        task = Task.new(task_params)

        if task.save
          # Handle asset associations
          if params_asset_ids.present?
            params_asset_ids.each do |asset_id|
              task.task_assets.create(asset_id: asset_id)
            end
          end

          # Handle location associations
          if params_location_ids.present?
            params_location_ids.each do |location_id|
              task.task_locations.create(location_id: location_id)
            end
          end

          # Handle log associations
          if params_log_ids.present?
            params_log_ids.each do |log_id|
              task.task_logs.create(log_id: log_id)
            end
          end

          render json: TaskSerializer.new(task.reload).serializable_hash, status: :created
        else
          render_jsonapi_errors(task.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @task.update(task_params)
          # Handle asset associations if provided
          if params_asset_ids
            @task.task_assets.destroy_all
            params_asset_ids.each do |asset_id|
              @task.task_assets.create(asset_id: asset_id)
            end
          end

          # Handle location associations if provided
          if params_location_ids
            @task.task_locations.destroy_all
            params_location_ids.each do |location_id|
              @task.task_locations.create(location_id: location_id)
            end
          end

          # Handle log associations if provided
          if params_log_ids
            @task.task_logs.destroy_all
            params_log_ids.each do |log_id|
              @task.task_logs.create(log_id: log_id)
            end
          end

          render json: TaskSerializer.new(@task.reload).serializable_hash
        else
          render_jsonapi_errors(@task.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @task.destroy
        head :no_content
      end

      private

      def set_task
        @task = Task.find(params[:id])
      end

      def task_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:task)
        end

        base_params.permit(:title, :description, :state, :estimate, :target_date, :parent_id, :project_id, :cycle_id)
      end

      def params_asset_ids
        if params[:_jsonapi].present?
          params.dig(:_jsonapi, :data, :attributes, :asset_ids)
        elsif params[:data].present?
          params.dig(:data, :attributes, :asset_ids)
        else
          params.dig(:task, :asset_ids)
        end
      end

      def params_location_ids
        if params[:_jsonapi].present?
          params.dig(:_jsonapi, :data, :attributes, :location_ids)
        elsif params[:data].present?
          params.dig(:data, :attributes, :location_ids)
        else
          params.dig(:task, :location_ids)
        end
      end

      def params_log_ids
        if params[:_jsonapi].present?
          params.dig(:_jsonapi, :data, :attributes, :log_ids)
        elsif params[:data].present?
          params.dig(:data, :attributes, :log_ids)
        else
          params.dig(:task, :log_ids)
        end
      end
    end
  end
end
