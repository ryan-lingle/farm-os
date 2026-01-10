require "test_helper"

module Api
  module V1
    class CyclesControllerTest < ActionDispatch::IntegrationTest
      setup do
        @past_cycle = Cycle.create!(name: "December 2025", start_date: Date.new(2025, 12, 1), end_date: Date.new(2025, 12, 31))
        @current_cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
        @future_cycle = Cycle.create!(name: "February 2026", start_date: Date.new(2026, 2, 1), end_date: Date.new(2026, 2, 28))
      end

      test "should get index" do
        travel_to Date.new(2026, 1, 15) do
          get "/api/v1/cycles"
          assert_response :success

          json_response = JSON.parse(response.body)
          assert json_response["data"].is_a?(Array)
          assert_equal 3, json_response["data"].length
        end
      end

      test "should filter current cycles" do
        travel_to Date.new(2026, 1, 15) do
          get "/api/v1/cycles", params: { filter: { current: "true" } }
          assert_response :success

          json_response = JSON.parse(response.body)
          cycle_ids = json_response["data"].map { |c| c["id"].to_i }

          assert_includes cycle_ids, @current_cycle.id
          assert_not_includes cycle_ids, @past_cycle.id
          assert_not_includes cycle_ids, @future_cycle.id
        end
      end

      test "should filter past cycles" do
        travel_to Date.new(2026, 1, 15) do
          get "/api/v1/cycles", params: { filter: { past: "true" } }
          assert_response :success

          json_response = JSON.parse(response.body)
          cycle_ids = json_response["data"].map { |c| c["id"].to_i }

          assert_includes cycle_ids, @past_cycle.id
          assert_not_includes cycle_ids, @current_cycle.id
          assert_not_includes cycle_ids, @future_cycle.id
        end
      end

      test "should filter future cycles" do
        travel_to Date.new(2026, 1, 15) do
          get "/api/v1/cycles", params: { filter: { future: "true" } }
          assert_response :success

          json_response = JSON.parse(response.body)
          cycle_ids = json_response["data"].map { |c| c["id"].to_i }

          assert_includes cycle_ids, @future_cycle.id
          assert_not_includes cycle_ids, @current_cycle.id
          assert_not_includes cycle_ids, @past_cycle.id
        end
      end

      test "should filter by start_date_after" do
        get "/api/v1/cycles", params: { filter: { start_date_after: "2026-01-01" } }
        assert_response :success

        json_response = JSON.parse(response.body)
        cycle_ids = json_response["data"].map { |c| c["id"].to_i }

        assert_includes cycle_ids, @current_cycle.id
        assert_includes cycle_ids, @future_cycle.id
        assert_not_includes cycle_ids, @past_cycle.id
      end

      test "should show cycle" do
        travel_to Date.new(2026, 1, 15) do
          get "/api/v1/cycles/#{@current_cycle.id}"
          assert_response :success

          json_response = JSON.parse(response.body)
          assert_equal @current_cycle.id, json_response["data"]["id"].to_i
          assert_equal "January 2026", json_response["data"]["attributes"]["name"]
        end
      end

      test "should show cycle with computed attributes" do
        travel_to Date.new(2026, 1, 16) do
          Task.create!(title: "Done Task", cycle: @current_cycle, state: "done", estimate: 60)
          Task.create!(title: "Active Task", cycle: @current_cycle, state: "in_progress", estimate: 30)

          get "/api/v1/cycles/#{@current_cycle.id}"
          assert_response :success

          json_response = JSON.parse(response.body)
          attrs = json_response["data"]["attributes"]

          assert_equal true, attrs["is_current"]
          assert_equal false, attrs["is_past"]
          assert_equal false, attrs["is_future"]
          assert_equal 2, attrs["task_count"]
          assert_equal 1, attrs["completed_task_count"]
          assert_equal 50, attrs["task_completion_percentage"]
        end
      end

      test "should create cycle" do
        assert_difference("Cycle.count") do
          post "/api/v1/cycles",
            params: {
              data: {
                type: "cycles",
                attributes: {
                  name: "March 2026",
                  start_date: "2026-03-01",
                  end_date: "2026-03-31"
                }
              }
            },
            as: :json
        end

        assert_response :created
        json_response = JSON.parse(response.body)
        assert_equal "March 2026", json_response["data"]["attributes"]["name"]
      end

      test "should fail to create cycle without name" do
        assert_no_difference("Cycle.count") do
          post "/api/v1/cycles",
            params: {
              data: {
                type: "cycles",
                attributes: {
                  start_date: "2026-03-01",
                  end_date: "2026-03-31"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should fail to create overlapping cycle" do
        assert_no_difference("Cycle.count") do
          post "/api/v1/cycles",
            params: {
              data: {
                type: "cycles",
                attributes: {
                  name: "Overlapping",
                  start_date: "2026-01-15",
                  end_date: "2026-02-15"
                }
              }
            },
            as: :json
        end

        assert_response :unprocessable_entity
      end

      test "should update cycle" do
        patch "/api/v1/cycles/#{@current_cycle.id}",
          params: {
            data: {
              type: "cycles",
              attributes: {
                name: "Updated January 2026"
              }
            }
          },
          as: :json

        assert_response :success
        @current_cycle.reload
        assert_equal "Updated January 2026", @current_cycle.name
      end

      test "should destroy cycle" do
        assert_difference("Cycle.count", -1) do
          delete "/api/v1/cycles/#{@future_cycle.id}"
        end

        assert_response :no_content
      end

      test "should generate cycles" do
        # Clear existing cycles for clean test
        Cycle.destroy_all

        travel_to Date.new(2026, 6, 15) do
          post "/api/v1/cycles/generate", params: { months_ahead: 2, months_behind: 1 }
          assert_response :created

          json_response = JSON.parse(response.body)
          names = json_response["data"].map { |c| c["attributes"]["name"] }

          assert_includes names, "May 2026"
          assert_includes names, "June 2026"
          assert_includes names, "July 2026"
          assert_includes names, "August 2026"
        end
      end

      test "should get current cycle" do
        travel_to Date.new(2026, 1, 15) do
          get "/api/v1/cycles/current"
          assert_response :success

          json_response = JSON.parse(response.body)
          assert_equal @current_cycle.id, json_response["data"]["id"].to_i
        end
      end

      test "should auto-create current cycle if none exists" do
        Cycle.destroy_all

        travel_to Date.new(2026, 7, 15) do
          get "/api/v1/cycles/current"
          assert_response :success

          json_response = JSON.parse(response.body)
          assert_equal "July 2026", json_response["data"]["attributes"]["name"]
        end
      end

      test "destroying cycle should nullify tasks" do
        task = Task.create!(title: "Cycle Task", cycle: @future_cycle)

        delete "/api/v1/cycles/#{@future_cycle.id}"
        assert_response :no_content

        task.reload
        assert_nil task.cycle_id
      end
    end
  end
end
