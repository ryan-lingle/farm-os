module Api
  module V1
    class ConversationsController < ApiController
      before_action :set_conversation, only: [:show, :update, :destroy]

      def index
        conversations = Conversation.all

        # Status filter
        if params.dig(:filter, :status)
          conversations = conversations.where(status: params[:filter][:status])
        end

        # Task filter
        if params.dig(:filter, :task_id)
          conversations = conversations.where(task_id: params[:filter][:task_id])
        end

        # Plan filter
        if params.dig(:filter, :plan_id)
          conversations = conversations.where(plan_id: params[:filter][:plan_id])
        end

        # With context filter
        if params.dig(:filter, :with_context) == "true"
          conversations = conversations.with_context
        end

        # Default to recent ordering
        conversations = conversations.recent

        render json: ConversationSerializer.new(conversations).serializable_hash
      end

      def show
        render json: ConversationSerializer.new(@conversation).serializable_hash
      end

      def create
        conversation = Conversation.new(conversation_params)

        if conversation.save
          render json: ConversationSerializer.new(conversation).serializable_hash, status: :created
        else
          render_jsonapi_errors(conversation.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @conversation.update(conversation_params)
          render json: ConversationSerializer.new(@conversation).serializable_hash
        else
          render_jsonapi_errors(@conversation.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @conversation.destroy
        head :no_content
      end

      private

      def set_conversation
        @conversation = Conversation.find(params[:id])
      end

      def conversation_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).fetch(:attributes, {})
        elsif params[:data].present?
          base_params = params.require(:data).fetch(:attributes, {})
        elsif params[:conversation].present?
          base_params = params.require(:conversation)
        else
          base_params = ActionController::Parameters.new({})
        end

        base_params.permit(:title, :external_id, :status, :task_id, :plan_id, messages: [:role, :content, :images, :toolCalls])
      end
    end
  end
end
