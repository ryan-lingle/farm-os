require "test_helper"

module Api
  module V1
    class TasksControllerTest < ActionDispatch::IntegrationTest
      setup do
        @project = Project.create!(name: "Test Project")
        @cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))

        @task1 = Task.create!(title: "Task 1", state: "backlog", project: @project)
        @task2 = Task.create!(title: "Task 2", state: "todo", project: @project, cycle: @cycle)
        @task3 = Task.create!(title: "Task 3", state: "in_progress", cycle: @cycle)
        @task4 = Task.create!(title: "Task 4", state: "done")

        @parent_task = Task.create!(title: "Parent Task")
        @child_task = Task.create!(title: "Child Task", parent: @parent_task)

        @location = Location.create!(name: "Test Location", location_type: "point", geometry: { "latitude" => 40.7128, "longitude" => -74.0060 })
        @asset = Asset.create!(name: "Test Asset", asset_type: "animal")
        @log = Log.create!(name: "Test Log", log_type: "activity")
      end

      test "should get index" do
        get "/api/v1/tasks"
        assert_response :success

        json_response = JSON.parse(response.body)
        assert json_response["data"].is_a?(Array)
      end

      test "should filter tasks by state" do
        get "/api/v1/tasks", params: { filter: { state: "backlog" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task1.id
        assert_not_includes task_ids, @task2.id
      end

      test "should filter tasks by project_id" do
        get "/api/v1/tasks", params: { filter: { project_id: @project.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task1.id
        assert_includes task_ids, @task2.id
        assert_not_includes task_ids, @task3.id
      end

      test "should filter tasks by cycle_id" do
        get "/api/v1/tasks", params: { filter: { cycle_id: @cycle.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task2.id
        assert_includes task_ids, @task3.id
        assert_not_includes task_ids, @task1.id
      end

      test "should filter tasks by parent_id" do
        get "/api/v1/tasks", params: { filter: { parent_id: @parent_task.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @child_task.id
        assert_not_includes task_ids, @parent_task.id
      end

      test "should filter root only tasks" do
        get "/api/v1/tasks", params: { filter: { root_only: "true" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @parent_task.id
        assert_not_includes task_ids, @child_task.id
      end

      test "should filter unscheduled tasks" do
        get "/api/v1/tasks", params: { filter: { unscheduled: "true" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task1.id
        assert_not_includes task_ids, @task2.id
      end

      test "should filter active tasks" do
        get "/api/v1/tasks", params: { filter: { active: "true" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task1.id
        assert_includes task_ids, @task2.id
        assert_includes task_ids, @task3.id
        assert_not_includes task_ids, @task4.id
      end

      test "should filter completed tasks" do
        get "/api/v1/tasks", params: { filter: { completed: "true" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task4.id
        assert_not_includes task_ids, @task1.id
      end

      test "should show task" do
        get "/api/v1/tasks/#{@task1.id}"
        assert_response :success

        json_response = JSON.parse(response.body)
        assert_equal @task1.id, json_response["data"]["id"].to_i
        assert_equal "Task 1", json_response["data"]["attributes"]["title"]
      end

      test "should create task" do
        assert_difference("Task.count") do
          post "/api/v1/tasks",
            params: {
              data: {
                type: "tasks",
                attributes: {
                  title: "New Task",
                  description: "Test description",
                  state: "todo",
                  estimate: 60,
                  target_date: "2026-01-15",
                  project_id: @project.id,
                  cycle_id: @cycle.id
                }
              }
            },
            as: :json
        end

        assert_response :created
        json_response = JSON.parse(response.body)
        assert_equal "New Task", json_response["data"]["attributes"]["title"]
        assert_equal "todo", json_response["data"]["attributes"]["state"]
        assert_equal 60, json_response["data"]["attributes"]["estimate"]
      end

      test "should create task with asset links" do
        assert_difference("Task.count") do
          post "/api/v1/tasks",
            params: {
              data: {
                type: "tasks",
                attributes: {
                  title: "Task with Assets",
                  asset_ids: [@asset.id]
                }
              }
            },
            as: :json
        end

        assert_response :created
        task = Task.last
        assert_includes task.assets, @asset
      end

      test "should create task with location links" do
        assert_difference("Task.count") do
          post "/api/v1/tasks",
            params: {
              data: {
                type: "tasks",
                attributes: {
                  title: "Task with Locations",
                  location_ids: [@location.id]
                }
              }
            },
            as: :json
        end

        assert_response :created
        task = Task.last
        assert_includes task.locations, @location
      end

      test "should create task with log links" do
        assert_difference("Task.count") do
          post "/api/v1/tasks",
            params: {
              data: {
                type: "tasks",
                attributes: {
                  title: "Task with Logs",
                  log_ids: [@log.id]
                }
              }
            },
            as: :json
        end

        assert_response :created
        task = Task.last
        assert_includes task.logs, @log
      end

      test "should create subtask" do
        assert_difference("Task.count") do
          post "/api/v1/tasks",
            params: {
              data: {
                type: "tasks",
                attributes: {
                  title: "Subtask",
                  parent_id: @parent_task.id
                }
              }
            },
            as: :json
        end

        assert_response :created
        task = Task.last
        assert_equal @parent_task.id, task.parent_id
      end

      test "should fail to create task without title" do
        assert_no_difference("Task.count") do
          post "/api/v1/tasks",
            params: {
              data: {
                type: "tasks",
                attributes: {
                  state: "todo"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should update task" do
        patch "/api/v1/tasks/#{@task1.id}",
          params: {
            data: {
              type: "tasks",
              attributes: {
                title: "Updated Task",
                state: "in_progress"
              }
            }
          },
          as: :json

        assert_response :success
        @task1.reload
        assert_equal "Updated Task", @task1.title
        assert_equal "in_progress", @task1.state
      end

      test "should update task asset links" do
        @task1.assets << @asset

        asset2 = Asset.create!(name: "Asset 2", asset_type: "plant")

        patch "/api/v1/tasks/#{@task1.id}",
          params: {
            data: {
              type: "tasks",
              attributes: {
                asset_ids: [asset2.id]
              }
            }
          },
          as: :json

        assert_response :success
        @task1.reload
        assert_includes @task1.assets, asset2
        assert_not_includes @task1.assets, @asset
      end

      test "should destroy task" do
        assert_difference("Task.count", -1) do
          delete "/api/v1/tasks/#{@task1.id}"
        end

        assert_response :no_content
      end

      test "should filter by asset_id" do
        @task1.assets << @asset

        get "/api/v1/tasks", params: { filter: { asset_id: @asset.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task1.id
        assert_not_includes task_ids, @task2.id
      end

      test "should filter by location_id" do
        @task1.locations << @location

        get "/api/v1/tasks", params: { filter: { location_id: @location.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        task_ids = json_response["data"].map { |t| t["id"].to_i }

        assert_includes task_ids, @task1.id
        assert_not_includes task_ids, @task2.id
      end
    end
  end
end
