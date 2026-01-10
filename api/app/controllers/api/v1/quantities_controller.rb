module Api
  module V1
    class QuantitiesController < ApiController
      before_action :set_quantity, only: [:show, :update, :destroy]

      def index
        @quantities = Quantity.all

        # Filter by log_id
        @quantities = @quantities.where(log_id: params[:log_id]) if params[:log_id].present?

        # Pagination
        page_number = params.dig(:page, :number)&.to_i || 1
        page_size = params.dig(:page, :size)&.to_i || 50

        @quantities = @quantities.page(page_number).per(page_size)

        render_jsonapi(@quantities)
      end

      def show
        render_jsonapi(@quantity)
      end

      def create
        @quantity = Quantity.new(quantity_params)

        if @quantity.save
          render_jsonapi(@quantity, status: :created)
        else
          render_jsonapi_errors(@quantity.errors)
        end
      end

      def update
        if @quantity.update(quantity_params)
          render_jsonapi(@quantity)
        else
          render_jsonapi_errors(@quantity.errors)
        end
      end

      def destroy
        @quantity.destroy
        head :no_content
      end

      private

      def set_quantity
        @quantity = Quantity.find(params[:id])
      end

      def quantity_params
        # Handle jsonapi format
        if params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params
        end

        permitted = base_params.permit(
          :label, :measure, :value, :unit, :quantity_type, :log_id
        )

        # Default measure to quantity_type if not provided
        if permitted[:measure].blank? && permitted[:quantity_type].present?
          permitted[:measure] = permitted[:quantity_type]
        end

        # Default measure to 'count' if still blank
        permitted[:measure] ||= 'count'

        permitted
      end
    end
  end
end
