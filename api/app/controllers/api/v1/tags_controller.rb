module Api
  module V1
    class TagsController < ApiController
      before_action :set_tag, only: [:show, :update, :destroy]

      def index
        tags = Tag.alphabetical
        render json: TagSerializer.new(tags).serializable_hash
      end

      def show
        render json: TagSerializer.new(@tag).serializable_hash
      end

      def create
        tag = Tag.new(tag_params)

        if tag.save
          render json: TagSerializer.new(tag).serializable_hash, status: :created
        else
          render_jsonapi_errors(tag.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @tag.update(tag_params)
          render json: TagSerializer.new(@tag).serializable_hash
        else
          render_jsonapi_errors(@tag.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @tag.destroy
        head :no_content
      end

      private

      def set_tag
        @tag = Tag.find(params[:id])
      end

      def tag_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:tag)
        end

        base_params.permit(:name, :color, :description)
      end
    end
  end
end
