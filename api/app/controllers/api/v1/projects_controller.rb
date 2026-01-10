module Api
  module V1
    class ProjectsController < ApiController
      before_action :set_project, only: [:show, :update, :destroy]

      def index
        projects = Project.all

        # Status filter
        if params.dig(:filter, :status)
          projects = projects.where(status: params[:filter][:status])
        end

        # In progress filter (planned + active)
        if params.dig(:filter, :in_progress) == "true"
          projects = projects.in_progress
        end

        # Date filters
        if params.dig(:filter, :start_date_before)
          projects = projects.where("start_date <= ?", Date.parse(params[:filter][:start_date_before]))
        end
        if params.dig(:filter, :start_date_after)
          projects = projects.where("start_date >= ?", Date.parse(params[:filter][:start_date_after]))
        end
        if params.dig(:filter, :target_date_before)
          projects = projects.where("target_date <= ?", Date.parse(params[:filter][:target_date_before]))
        end
        if params.dig(:filter, :target_date_after)
          projects = projects.where("target_date >= ?", Date.parse(params[:filter][:target_date_after]))
        end

        render json: ProjectSerializer.new(projects).serializable_hash
      end

      def show
        render json: ProjectSerializer.new(@project).serializable_hash
      end

      def create
        project = Project.new(project_params)

        if project.save
          render json: ProjectSerializer.new(project).serializable_hash, status: :created
        else
          render_jsonapi_errors(project.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @project.update(project_params)
          render json: ProjectSerializer.new(@project).serializable_hash
        else
          render_jsonapi_errors(@project.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @project.destroy
        head :no_content
      end

      private

      def set_project
        @project = Project.find(params[:id])
      end

      def project_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:project)
        end

        base_params.permit(:name, :description, :status, :start_date, :target_date)
      end
    end
  end
end
