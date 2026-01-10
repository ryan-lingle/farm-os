require "test_helper"

module Api
  module V1
    class AssetsControllerTest < ActionDispatch::IntegrationTest
      setup do
        # Create test locations
        @location1 = Location.create!(
          name: "North Field",
          location_type: "polygon",
          geometry: [
            { "latitude" => 40.7128, "longitude" => -74.0060 },
            { "latitude" => 40.7129, "longitude" => -74.0061 },
            { "latitude" => 40.7130, "longitude" => -74.0062 }
          ]
        )
        
        @location2 = Location.create!(
          name: "South Field",
          location_type: "polygon",
          geometry: [
            { "latitude" => 40.7100, "longitude" => -74.0050 },
            { "latitude" => 40.7101, "longitude" => -74.0051 },
            { "latitude" => 40.7102, "longitude" => -74.0052 }
          ]
        )

        # Create test assets with locations
        @asset1 = Asset.create!(
          name: "Cow #1",
          asset_type: "animal",
          status: "active",
          current_location: @location1
        )

        @asset2 = Asset.create!(
          name: "Cow #2",
          asset_type: "animal",
          status: "active",
          current_location: @location1
        )

        @asset3 = Asset.create!(
          name: "Cow #3",
          asset_type: "animal",
          status: "active",
          current_location: @location2
        )

        @asset4 = Asset.create!(
          name: "Tomato Plant",
          asset_type: "plant",
          status: "active",
          current_location: @location2
        )

        @asset_no_location = Asset.create!(
          name: "Unlocated Asset",
          asset_type: "animal",
          status: "active"
        )
      end

      test "should get index" do
        get "/api/v1/assets/animal"
        assert_response :success
        
        json_response = JSON.parse(response.body)
        assert json_response["data"].is_a?(Array)
      end

      test "should filter assets by current_location_id" do
        get "/api/v1/assets/animal", params: { filter: { current_location_id: @location1.id } }
        assert_response :success
        
        json_response = JSON.parse(response.body)
        asset_ids = json_response["data"].map { |asset| asset["id"].to_i }
        
        # Should include assets at location1
        assert_includes asset_ids, @asset1.id
        assert_includes asset_ids, @asset2.id
        
        # Should not include assets at location2 or without location
        assert_not_includes asset_ids, @asset3.id
        assert_not_includes asset_ids, @asset_no_location.id
      end

      test "should filter assets by different location" do
        get "/api/v1/assets/animal", params: { filter: { current_location_id: @location2.id } }
        assert_response :success
        
        json_response = JSON.parse(response.body)
        asset_ids = json_response["data"].map { |asset| asset["id"].to_i }
        
        # Should only include asset at location2
        assert_includes asset_ids, @asset3.id
        
        # Should not include assets at location1 or without location
        assert_not_includes asset_ids, @asset1.id
        assert_not_includes asset_ids, @asset2.id
        assert_not_includes asset_ids, @asset_no_location.id
      end

      test "should work with location filter across different asset types" do
        get "/api/v1/assets/plant", params: { filter: { current_location_id: @location2.id } }
        assert_response :success
        
        json_response = JSON.parse(response.body)
        asset_ids = json_response["data"].map { |asset| asset["id"].to_i }
        
        # Should include the plant at location2
        assert_includes asset_ids, @asset4.id
        
        # Should not include animal assets
        assert_not_includes asset_ids, @asset1.id
        assert_not_includes asset_ids, @asset2.id
        assert_not_includes asset_ids, @asset3.id
      end

      test "should return empty array when filtering by location with no assets" do
        empty_location = Location.create!(
          name: "Empty Field",
          location_type: "point",
          geometry: { "latitude" => 40.7000, "longitude" => -74.0000 }
        )
        
        get "/api/v1/assets/animal", params: { filter: { current_location_id: empty_location.id } }
        assert_response :success
        
        json_response = JSON.parse(response.body)
        assert_equal [], json_response["data"]
      end

      test "should combine location filter with status filter" do
        # Create an archived asset at location1
        archived_asset = Asset.create!(
          name: "Archived Cow",
          asset_type: "animal",
          status: "archived",
          current_location: @location1
        )
        
        # Filter by location and archived status
        get "/api/v1/assets/animal", params: { 
          filter: { 
            current_location_id: @location1.id,
            status: "archived"
          } 
        }
        assert_response :success
        
        json_response = JSON.parse(response.body)
        asset_ids = json_response["data"].map { |asset| asset["id"].to_i }
        
        # Should only include the archived asset at location1
        assert_includes asset_ids, archived_asset.id
        assert_not_includes asset_ids, @asset1.id
        assert_not_includes asset_ids, @asset2.id
      end

      test "should create asset with location" do
        assert_difference("Asset.count") do
          post "/api/v1/assets/animal", 
            params: {
              data: {
                type: "assets",
                attributes: {
                  name: "New Cow",
                  status: "active",
                  current_location_id: @location1.id
                }
              }
            },
            as: :json
        end
        
        assert_response :success
        json_response = JSON.parse(response.body)
        assert_equal @location1.id, json_response["data"]["attributes"]["current_location_id"]
      end

      test "should update asset location" do
        patch "/api/v1/assets/animal/#{@asset1.id}",
          params: {
            data: {
              type: "assets",
              attributes: {
                current_location_id: @location2.id
              }
            }
          },
          as: :json
        
        assert_response :success
        @asset1.reload
        assert_equal @location2.id, @asset1.current_location_id
      end
    end
  end
end

