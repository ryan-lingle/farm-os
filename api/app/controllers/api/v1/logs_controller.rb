module Api
  module V1
    class LogsController < ApiController
      before_action :set_log_type
      before_action :set_log, only: [ :show, :update, :destroy ]

      def index
        @logs = Log.where(log_type: @log_type)
        @logs = @logs.where(status: params[:filter][:status]) if params.dig(:filter, :status)

        # Handle pagination - support both page[number] and page formats
        if params[:page].is_a?(Hash) || params[:page].is_a?(ActionController::Parameters)
          page_number = (params[:page][:number] || 1).to_i
          page_size = (params[:page][:size] || 20).to_i
        else
          page_number = (params[:page] || 1).to_i
          page_size = (params[:per_page] || 20).to_i
        end

        @logs = @logs.page(page_number).per(page_size)

        render_jsonapi(@logs)
      end

      def show
        render_jsonapi(@log)
      end

      def create
        @log = Log.new(log_params.except(:asset_ids))
        @log.log_type = @log_type

        if @log.save
          # Handle asset associations with appropriate role based on log type
          if log_params[:asset_ids].present?
            role = determine_asset_role(@log_type)
            log_params[:asset_ids].each do |asset_id|
              AssetLog.create!(log: @log, asset_id: asset_id, role: role)
            end
          end

          # If this is a completed movement log, execute the movement
          @log.complete! if @log.status == "done" && @log.movement_log?
          render_jsonapi(@log)
        else
          render_jsonapi_errors(@log.errors)
        end
      end

      def update
        if @log.update(log_params)
          render_jsonapi(@log)
        else
          render_jsonapi_errors(@log.errors)
        end
      end

      def destroy
        @log.destroy
        head :no_content
      end

      private

      def set_log_type
        @log_type = params[:log_type] || "log"
      end

      def set_log
        @log = Log.where(log_type: @log_type).find(params[:id])
      end

      def log_params
        # Handle jsonapi-rails _jsonapi parameter
        if params[:_jsonapi].present?
          attributes = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          attributes = params.require(:data).require(:attributes)
        else
          attributes = params
        end

        # Permit common log attributes and type-specific ones
        permitted = attributes.permit(
          :name, :status, :notes, :timestamp,
          :activity_type, :crop_type,
          :from_location_id, :to_location_id, :moved_at,
          quantities: [ :measure, :value, :unit, :label ],
          asset_ids: []
        )

        # Handle quantities if present
        if permitted[:quantities].present?
          permitted[:quantities_attributes] = permitted.delete(:quantities)
        end

        permitted
      end

      def determine_asset_role(log_type)
        case log_type
        when "movement"
          "moved"
        when "harvest"
          "source"
        when "input"
          "input"
        else
          "subject"
        end
      end
    end
  end
end
