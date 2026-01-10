module Api
  module V1
    class TaskRelationsController < ApiController
      before_action :set_task_relation, only: [:show, :destroy]

      def index
        relations = TaskRelation.all

        # Filter by relation type
        if params.dig(:filter, :relation_type)
          relations = relations.where(relation_type: params[:filter][:relation_type])
        end

        # Filter by source task
        if params.dig(:filter, :source_task_id)
          relations = relations.where(source_task_id: params[:filter][:source_task_id])
        end

        # Filter by target task
        if params.dig(:filter, :target_task_id)
          relations = relations.where(target_task_id: params[:filter][:target_task_id])
        end

        # Filter by either source or target (all relations for a task)
        if params.dig(:filter, :task_id)
          task_id = params[:filter][:task_id]
          relations = relations.where(source_task_id: task_id).or(relations.where(target_task_id: task_id))
        end

        render json: TaskRelationSerializer.new(relations).serializable_hash
      end

      def show
        render json: TaskRelationSerializer.new(@task_relation).serializable_hash
      end

      def create
        relation = TaskRelation.new(task_relation_params)

        if relation.save
          render json: TaskRelationSerializer.new(relation).serializable_hash, status: :created
        else
          render_jsonapi_errors(relation.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @task_relation.destroy
        head :no_content
      end

      private

      def set_task_relation
        @task_relation = TaskRelation.find(params[:id])
      end

      def task_relation_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:task_relation)
        end

        base_params.permit(:source_task_id, :target_task_id, :relation_type)
      end
    end
  end
end
