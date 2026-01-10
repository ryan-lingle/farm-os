require "test_helper"

module Api
  module V1
    class TaskRelationsControllerTest < ActionDispatch::IntegrationTest
      setup do
        @task1 = Task.create!(title: "Task 1")
        @task2 = Task.create!(title: "Task 2")
        @task3 = Task.create!(title: "Task 3")
        @task4 = Task.create!(title: "Task 4")

        @blocks_relation = TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")
        @related_relation = TaskRelation.create!(source_task: @task1, target_task: @task3, relation_type: "related")
      end

      test "should get index" do
        get "/api/v1/task_relations"
        assert_response :success

        json_response = JSON.parse(response.body)
        assert json_response["data"].is_a?(Array)
        assert_equal 2, json_response["data"].length
      end

      test "should filter by relation_type" do
        get "/api/v1/task_relations", params: { filter: { relation_type: "blocks" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        relation_ids = json_response["data"].map { |r| r["id"].to_i }

        assert_includes relation_ids, @blocks_relation.id
        assert_not_includes relation_ids, @related_relation.id
      end

      test "should filter by source_task_id" do
        get "/api/v1/task_relations", params: { filter: { source_task_id: @task1.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        assert_equal 2, json_response["data"].length
      end

      test "should filter by target_task_id" do
        get "/api/v1/task_relations", params: { filter: { target_task_id: @task2.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        relation_ids = json_response["data"].map { |r| r["id"].to_i }

        assert_includes relation_ids, @blocks_relation.id
        assert_not_includes relation_ids, @related_relation.id
      end

      test "should filter by task_id (either source or target)" do
        # Task1 is source of both relations
        get "/api/v1/task_relations", params: { filter: { task_id: @task1.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        assert_equal 2, json_response["data"].length

        # Task2 is only target of blocks relation
        get "/api/v1/task_relations", params: { filter: { task_id: @task2.id } }
        assert_response :success

        json_response = JSON.parse(response.body)
        assert_equal 1, json_response["data"].length
      end

      test "should show task_relation" do
        get "/api/v1/task_relations/#{@blocks_relation.id}"
        assert_response :success

        json_response = JSON.parse(response.body)
        assert_equal @blocks_relation.id, json_response["data"]["id"].to_i
        assert_equal "blocks", json_response["data"]["attributes"]["relation_type"]
      end

      test "should create task_relation" do
        assert_difference("TaskRelation.count") do
          post "/api/v1/task_relations",
            params: {
              data: {
                type: "task_relations",
                attributes: {
                  source_task_id: @task2.id,
                  target_task_id: @task4.id,
                  relation_type: "blocks"
                }
              }
            },
            as: :json
        end

        assert_response :created
        json_response = JSON.parse(response.body)
        assert_equal "blocks", json_response["data"]["attributes"]["relation_type"]
      end

      test "should fail to create duplicate relation" do
        assert_no_difference("TaskRelation.count") do
          post "/api/v1/task_relations",
            params: {
              data: {
                type: "task_relations",
                attributes: {
                  source_task_id: @task1.id,
                  target_task_id: @task2.id,
                  relation_type: "blocks"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should fail to create self-referential relation" do
        assert_no_difference("TaskRelation.count") do
          post "/api/v1/task_relations",
            params: {
              data: {
                type: "task_relations",
                attributes: {
                  source_task_id: @task1.id,
                  target_task_id: @task1.id,
                  relation_type: "blocks"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should fail to create inverse symmetric relation" do
        assert_no_difference("TaskRelation.count") do
          post "/api/v1/task_relations",
            params: {
              data: {
                type: "task_relations",
                attributes: {
                  source_task_id: @task3.id,
                  target_task_id: @task1.id,
                  relation_type: "related"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should destroy task_relation" do
        assert_difference("TaskRelation.count", -1) do
          delete "/api/v1/task_relations/#{@blocks_relation.id}"
        end

        assert_response :no_content
      end
    end
  end
end
