require "test_helper"

module Api
  module V1
    class ProjectsControllerTest < ActionDispatch::IntegrationTest
      setup do
        @project1 = Project.create!(name: "Project 1", status: "planned", start_date: Date.new(2026, 1, 1), target_date: Date.new(2026, 3, 31))
        @project2 = Project.create!(name: "Project 2", status: "active", start_date: Date.new(2026, 2, 1), target_date: Date.new(2026, 4, 30))
        @project3 = Project.create!(name: "Project 3", status: "completed")
        @project4 = Project.create!(name: "Project 4", status: "cancelled")
      end

      test "should get index" do
        get "/api/v1/projects"
        assert_response :success

        json_response = JSON.parse(response.body)
        assert json_response["data"].is_a?(Array)
        assert_equal 4, json_response["data"].length
      end

      test "should filter projects by status" do
        get "/api/v1/projects", params: { filter: { status: "planned" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        project_ids = json_response["data"].map { |p| p["id"].to_i }

        assert_includes project_ids, @project1.id
        assert_not_includes project_ids, @project2.id
      end

      test "should filter in_progress projects" do
        get "/api/v1/projects", params: { filter: { in_progress: "true" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        project_ids = json_response["data"].map { |p| p["id"].to_i }

        assert_includes project_ids, @project1.id
        assert_includes project_ids, @project2.id
        assert_not_includes project_ids, @project3.id
        assert_not_includes project_ids, @project4.id
      end

      test "should filter by start_date_after" do
        get "/api/v1/projects", params: { filter: { start_date_after: "2026-01-15" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        project_ids = json_response["data"].map { |p| p["id"].to_i }

        assert_includes project_ids, @project2.id
        assert_not_includes project_ids, @project1.id
      end

      test "should filter by target_date_before" do
        get "/api/v1/projects", params: { filter: { target_date_before: "2026-04-01" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        project_ids = json_response["data"].map { |p| p["id"].to_i }

        assert_includes project_ids, @project1.id
        assert_not_includes project_ids, @project2.id
      end

      test "should show project" do
        get "/api/v1/projects/#{@project1.id}"
        assert_response :success

        json_response = JSON.parse(response.body)
        assert_equal @project1.id, json_response["data"]["id"].to_i
        assert_equal "Project 1", json_response["data"]["attributes"]["name"]
        assert_equal "planned", json_response["data"]["attributes"]["status"]
      end

      test "should show project with computed attributes" do
        Task.create!(title: "Done Task", project: @project1, state: "done")
        Task.create!(title: "Active Task", project: @project1, state: "in_progress", estimate: 60)

        get "/api/v1/projects/#{@project1.id}"
        assert_response :success

        json_response = JSON.parse(response.body)
        attrs = json_response["data"]["attributes"]

        assert_equal 2, attrs["task_count"]
        assert_equal 1, attrs["completed_task_count"]
        assert_equal 1, attrs["active_task_count"]
        assert_equal 50, attrs["progress_percentage"]
      end

      test "should create project" do
        assert_difference("Project.count") do
          post "/api/v1/projects",
            params: {
              data: {
                type: "projects",
                attributes: {
                  name: "New Project",
                  description: "Test description",
                  status: "active",
                  start_date: "2026-05-01",
                  target_date: "2026-06-30"
                }
              }
            },
            as: :json
        end

        assert_response :created
        json_response = JSON.parse(response.body)
        assert_equal "New Project", json_response["data"]["attributes"]["name"]
        assert_equal "active", json_response["data"]["attributes"]["status"]
      end

      test "should create project with default status" do
        assert_difference("Project.count") do
          post "/api/v1/projects",
            params: {
              data: {
                type: "projects",
                attributes: {
                  name: "Default Status Project"
                }
              }
            },
            as: :json
        end

        assert_response :created
        json_response = JSON.parse(response.body)
        assert_equal "planned", json_response["data"]["attributes"]["status"]
      end

      test "should fail to create project without name" do
        assert_no_difference("Project.count") do
          post "/api/v1/projects",
            params: {
              data: {
                type: "projects",
                attributes: {
                  status: "active"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should fail to create project with target_date before start_date" do
        assert_no_difference("Project.count") do
          post "/api/v1/projects",
            params: {
              data: {
                type: "projects",
                attributes: {
                  name: "Invalid Dates",
                  start_date: "2026-06-01",
                  target_date: "2026-05-01"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should update project" do
        patch "/api/v1/projects/#{@project1.id}",
          params: {
            data: {
              type: "projects",
              attributes: {
                name: "Updated Project",
                status: "active"
              }
            }
          },
          as: :json

        assert_response :success
        @project1.reload
        assert_equal "Updated Project", @project1.name
        assert_equal "active", @project1.status
      end

      test "should destroy project" do
        assert_difference("Project.count", -1) do
          delete "/api/v1/projects/#{@project1.id}"
        end

        assert_response :no_content
      end

      test "destroying project should nullify tasks" do
        task = Task.create!(title: "Project Task", project: @project1)

        delete "/api/v1/projects/#{@project1.id}"
        assert_response :no_content

        task.reload
        assert_nil task.project_id
      end
    end
  end
end
