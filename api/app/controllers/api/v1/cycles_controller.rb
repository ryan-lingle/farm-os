module Api
  module V1
    class CyclesController < ApiController
      before_action :set_cycle, only: [:show, :update, :destroy]

      def index
        cycles = Cycle.all

        # Time-based filters
        if params.dig(:filter, :current) == "true"
          cycles = cycles.current
        elsif params.dig(:filter, :past) == "true"
          cycles = cycles.past
        elsif params.dig(:filter, :future) == "true"
          cycles = cycles.future
        end

        # Date range filters
        if params.dig(:filter, :start_date_before)
          cycles = cycles.where("start_date <= ?", Date.parse(params[:filter][:start_date_before]))
        end
        if params.dig(:filter, :start_date_after)
          cycles = cycles.where("start_date >= ?", Date.parse(params[:filter][:start_date_after]))
        end
        if params.dig(:filter, :end_date_before)
          cycles = cycles.where("end_date <= ?", Date.parse(params[:filter][:end_date_before]))
        end
        if params.dig(:filter, :end_date_after)
          cycles = cycles.where("end_date >= ?", Date.parse(params[:filter][:end_date_after]))
        end

        # Default order
        cycles = cycles.chronological

        render json: CycleSerializer.new(cycles).serializable_hash
      end

      def show
        render json: CycleSerializer.new(@cycle).serializable_hash
      end

      def create
        cycle = Cycle.new(cycle_params)

        if cycle.save
          render json: CycleSerializer.new(cycle).serializable_hash, status: :created
        else
          render_jsonapi_errors(cycle.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @cycle.update(cycle_params)
          render json: CycleSerializer.new(@cycle).serializable_hash
        else
          render_jsonapi_errors(@cycle.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @cycle.destroy
        head :no_content
      end

      # Auto-generate cycles endpoint
      def generate
        months_ahead = (params[:months_ahead] || 3).to_i
        months_behind = (params[:months_behind] || 1).to_i

        cycles = Cycle.ensure_cycles_exist(months_ahead: months_ahead, months_behind: months_behind)

        render json: CycleSerializer.new(cycles).serializable_hash, status: :created
      end

      # Get current cycle
      def current
        cycle = Cycle.current_cycle
        render json: CycleSerializer.new(cycle).serializable_hash
      end

      private

      def set_cycle
        @cycle = Cycle.find(params[:id])
      end

      def cycle_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:cycle)
        end

        base_params.permit(:name, :start_date, :end_date)
      end
    end
  end
end
