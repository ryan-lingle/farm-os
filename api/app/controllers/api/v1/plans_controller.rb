module Api
  module V1
    class PlansController < ApiController
      before_action :set_plan, only: [:show, :update, :destroy]

      def index
        plans = Plan.all

        # Status filter
        if params.dig(:filter, :status)
          plans = plans.where(status: params[:filter][:status])
        end

        # In progress filter (planned + active)
        if params.dig(:filter, :in_progress) == "true"
          plans = plans.in_progress
        end

        # Root only filter (top-level plans)
        if params.dig(:filter, :root_only) == "true"
          plans = plans.root_only
        end

        # Parent filter (children of specific plan)
        if params.dig(:filter, :parent_id)
          plans = plans.where(parent_id: params[:filter][:parent_id])
        end

        # Date filters
        if params.dig(:filter, :start_date_before)
          plans = plans.where("start_date <= ?", Date.parse(params[:filter][:start_date_before]))
        end
        if params.dig(:filter, :start_date_after)
          plans = plans.where("start_date >= ?", Date.parse(params[:filter][:start_date_after]))
        end
        if params.dig(:filter, :target_date_before)
          plans = plans.where("target_date <= ?", Date.parse(params[:filter][:target_date_before]))
        end
        if params.dig(:filter, :target_date_after)
          plans = plans.where("target_date >= ?", Date.parse(params[:filter][:target_date_after]))
        end

        render json: PlanSerializer.new(plans).serializable_hash
      end

      def show
        render json: PlanSerializer.new(@plan).serializable_hash
      end

      def create
        plan = Plan.new(plan_params)

        if plan.save
          render json: PlanSerializer.new(plan).serializable_hash, status: :created
        else
          render_jsonapi_errors(plan.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @plan.update(plan_params)
          render json: PlanSerializer.new(@plan).serializable_hash
        else
          render_jsonapi_errors(@plan.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @plan.destroy
        head :no_content
      end

      private

      def set_plan
        @plan = Plan.find(params[:id])
      end

      def plan_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:plan)
        end

        base_params.permit(:name, :description, :status, :start_date, :target_date, :parent_id)
      end
    end
  end
end
