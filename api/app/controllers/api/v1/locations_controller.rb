module Api
  module V1
    class LocationsController < ApiController
      before_action :set_location, only: [ :show, :update, :destroy ]

      def index
        # Filter out archived locations by default (unless explicitly requested)
        locations = params[:archived] == "true" ? Location.all : Location.active
        
        # Optional status filter
        locations = locations.where(status: params[:filter][:status]) if params.dig(:filter, :status)
        
        # Hierarchy filters
        if params.dig(:filter, :parent_id)
          locations = locations.where(parent_id: params[:filter][:parent_id])
        end

        # Filter for root locations only
        if params.dig(:filter, :root_only) == "true"
          locations = locations.where(parent_id: nil)
        end
        
        render json: LocationSerializer.new(locations).serializable_hash
      end

      def show
        render json: LocationSerializer.new(@location).serializable_hash
      end

      def create
        location = Location.new(location_params)
        
        # Auto-detect location_type from geometry if not provided
        if location.location_type.blank? && location.geometry.present?
          location.location_type = location.geometry.is_a?(Array) ? "polygon" : "point"
        end
        
        if location.save
          render json: LocationSerializer.new(location).serializable_hash, status: :created
        else
          render_jsonapi_errors(location.errors, status: :unprocessable_entity)
        end
      end

      def update
        if @location.update(location_params)
          render json: LocationSerializer.new(@location).serializable_hash
        else
          render_jsonapi_errors(@location.errors, status: :unprocessable_entity)
        end
      end

      def destroy
        @location.archive!
        head :no_content
      end

      private

      def set_location
        @location = Location.find(params[:id])
      end

      def location_params
        if params[:_jsonapi].present?
          base_params = params.require(:_jsonapi).require(:data).require(:attributes)
        elsif params[:data].present?
          base_params = params.require(:data).require(:attributes)
        else
          base_params = params.require(:location)
        end

        permitted = base_params.permit(:name, :status, :notes, :location_type, :archived_at, :parent_id)

        # Handle geometry - support both farmAPI format and GeoJSON format
        if base_params[:geometry].present?
          geometry = base_params[:geometry]
          
          # Check if it's GeoJSON format (has "type" and "coordinates")
          if geometry.is_a?(ActionController::Parameters) && geometry[:type].present? && geometry[:coordinates].present?
            # Convert GeoJSON to farmAPI format
            permitted[:geometry] = convert_geojson_to_farmos(geometry)
          elsif geometry.is_a?(Array)
            # Already in farmAPI format (array of points)
            permitted[:geometry] = geometry.map do |point|
              point.permit(:latitude, :longitude)
            end
          elsif geometry.is_a?(ActionController::Parameters)
            # Single point in farmAPI format
            permitted[:geometry] = geometry.permit(:latitude, :longitude, :radius)
          end
        end

        permitted
      end

      def convert_geojson_to_farmos(geojson)
        case geojson[:type]
        when "Point"
          # GeoJSON Point: coordinates = [lng, lat]
          {
            latitude: geojson[:coordinates][1],
            longitude: geojson[:coordinates][0]
          }
        when "Polygon"
          # GeoJSON Polygon: coordinates = [[[lng, lat], [lng, lat], ...]]
          # Take first ring (exterior boundary)
          geojson[:coordinates][0].map do |coord|
            {
              latitude: coord[1],
              longitude: coord[0]
            }
          end
        else
          geojson  # Fallback, let validation handle it
        end
      end
    end
  end
end
