module Api
  module V1
    class PredicatesController < ApiController
      before_action :set_predicate, only: [:show]

      def index
        @predicates = Predicate.all
        
        # Filter by kind if specified
        @predicates = @predicates.where(kind: params[:filter][:kind]) if params.dig(:filter, :kind)
        
        # Filter by name if specified (useful for AI lookups)
        @predicates = @predicates.where(name: params[:filter][:name]) if params.dig(:filter, :name)

        # Pagination
        page_number = params.dig(:page, :number)&.to_i || 1
        page_size = params.dig(:page, :size)&.to_i || 50

        @predicates = @predicates.page(page_number).per(page_size)

        render_jsonapi(@predicates)
      end

      def show
        render_jsonapi(@predicate)
      end

      private

      def set_predicate
        @predicate = Predicate.find(params[:id])
      end
    end
  end
end

