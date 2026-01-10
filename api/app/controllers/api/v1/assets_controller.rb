module Api
  module V1
    class AssetsController < ApiController
      before_action :set_asset_type
      before_action :set_asset, only: [ :show, :update, :destroy ]

      def index
        @assets = Asset.where(asset_type: @asset_type)
        
        # Filter out archived assets by default (unless explicitly requested)
        @assets = @assets.active unless params[:archived] == "true"
        
        # Optional status filter (overrides default active filter)
        @assets = @assets.where(status: params[:filter][:status]) if params.dig(:filter, :status)

        # Location filter
        if params.dig(:filter, :current_location_id)
          @assets = @assets.where(current_location_id: params[:filter][:current_location_id])
        end

        # Hierarchy filters
        if params.dig(:filter, :parent_id)
          @assets = @assets.where(parent_id: params[:filter][:parent_id])
        end

        # Filter for root assets only
        if params.dig(:filter, :root_only) == "true"
          @assets = @assets.where(parent_id: nil)
        end

        # Handle pagination - support both page[number] and page formats
        if params[:page].is_a?(Hash) || params[:page].is_a?(ActionController::Parameters)
          page_number = (params[:page][:number] || 1).to_i
          page_size = (params[:page][:size] || 20).to_i
        else
          page_number = (params[:page] || 1).to_i
          page_size = (params[:per_page] || 20).to_i
        end

        @assets = @assets.page(page_number).per(page_size)

        render_jsonapi(@assets)
      end

      def show
        render_jsonapi(@asset)
      end

      def create
        @asset = Asset.new(asset_params)
        @asset.asset_type = @asset_type

        if @asset.save
          render_jsonapi(@asset)
        else
          render_jsonapi_errors(@asset.errors)
        end
      end

      def update
        if @asset.update(asset_params)
          render_jsonapi(@asset)
        else
          render_jsonapi_errors(@asset.errors)
        end
      end

      def destroy
        @asset.archive!
        head :no_content
      end

      private

      def set_asset_type
        @asset_type = params[:asset_type] || "asset"
      end

      def set_asset
        @asset = Asset.where(asset_type: @asset_type).find(params[:id])
      end

      def asset_params
        # Handle jsonapi-rails _jsonapi parameter
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params
        end

        permitted = base_params.permit(
          :name, :status, :notes, :current_location_id, :quantity, :parent_id
        )

        # Handle geometry parameter if present
        if base_params[:geometry].present?
          geometry_params = base_params[:geometry]
          permitted[:geometry] = {
            type: geometry_params[:type],
            coordinates: geometry_params[:coordinates]
          }
        end

        permitted
      end
    end
  end
end
