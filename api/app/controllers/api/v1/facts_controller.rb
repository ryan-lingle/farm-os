module Api
  module V1
    class FactsController < ApiController
      before_action :set_fact, only: [:show]

      def index
        @facts = Fact.includes(:predicate, :subject, :object, :log)
        
        # Filter by predicate (by ID or name)
        if params.dig(:filter, :predicate_id)
          @facts = @facts.where(predicate_id: params[:filter][:predicate_id])
        elsif params.dig(:filter, :predicate)
          predicate = Predicate.find_by(name: params[:filter][:predicate])
          @facts = @facts.where(predicate_id: predicate.id) if predicate
        end
        
        # Filter by subject (asset)
        @facts = @facts.where(subject_id: params[:filter][:subject_id]) if params.dig(:filter, :subject_id)
        
        # Filter by object (for relations)
        @facts = @facts.where(object_id: params[:filter][:object_id]) if params.dig(:filter, :object_id)
        
        # Time range filters
        @facts = @facts.where('observed_at >= ?', params[:filter][:since]) if params.dig(:filter, :since)
        @facts = @facts.where('observed_at <= ?', params[:filter][:until]) if params.dig(:filter, :until)
        
        # Filter by log
        @facts = @facts.where(log_id: params[:filter][:log_id]) if params.dig(:filter, :log_id)

        # Default ordering: most recent first
        @facts = @facts.order(observed_at: :desc)

        # Pagination
        page_number = params.dig(:page, :number)&.to_i || 1
        page_size = params.dig(:page, :size)&.to_i || 50

        @facts = @facts.page(page_number).per(page_size)

        # Include relationships by default for AI legibility
        includes = params[:include]&.split(',') || ['predicate', 'subject']

        render_jsonapi(@facts, include: includes)
      end

      def show
        render_jsonapi(@fact, include: ['predicate', 'subject', 'object', 'log'])
      end

      def create
        @fact = Fact.new(fact_params)

        if @fact.save
          render_jsonapi(@fact, status: :created, include: ['predicate', 'subject', 'object'])
        else
          render_jsonapi_errors(@fact.errors)
        end
      end

      private

      def set_fact
        @fact = Fact.find(params[:id])
      end

      def fact_params
        # Handle jsonapi-rails _jsonapi parameter
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
          relationships = params.require(:_jsonapi).require(:data)[:relationships] || {}
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
          relationships = params.require(:data)[:relationships] || {}
        else
          base_params = params
          relationships = {}
        end

        permitted = base_params.permit(
          :value_numeric, :unit, :observed_at, :subject_id, :predicate_id, :predicate_name, :object_id, :log_id
        )

        # Extract IDs from relationships (JSON:API format)
        permitted[:subject_id] ||= relationships.dig(:subject, :data, :id) if relationships.dig(:subject, :data)
        permitted[:predicate_id] ||= relationships.dig(:predicate, :data, :id) if relationships.dig(:predicate, :data)
        permitted[:object_id] ||= relationships.dig(:object, :data, :id) if relationships.dig(:object, :data)
        permitted[:log_id] ||= relationships.dig(:log, :data, :id) if relationships.dig(:log, :data)

        # Handle predicate_name by looking up the predicate
        if permitted[:predicate_name].present? && permitted[:predicate_id].blank?
          predicate = Predicate.find_by(name: permitted[:predicate_name])
          permitted[:predicate_id] = predicate.id if predicate
        end
        permitted.delete(:predicate_name)

        permitted
      end
    end
  end
end

