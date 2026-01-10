module Api
  module V1
    class BaseController < ApiController
      # This will serve as the root API endpoint
      def index
        render json: {
          jsonapi: {
            version: "1.0",
            meta: {
              links: {
                self: {
                  href: "http://jsonapi.org/format/1.0/"
                }
              }
            }
          },
          data: [],
          meta: {
            farm: {
              name: "Farm API",
              url: request.base_url,
              version: "1.x"
            }
          },
          links: build_api_links
        }
      end

      # Schema endpoint for MCP server
      def schema
        render json: {
          success: true,
          schema: {
            "$schema": "https://json-schema.org/draft/2019-09/hyper-schema",
            "$id": "#{request.base_url}/api/schema",
            allOf: [
              { "$ref": "https://jsonapi.org/schema#/definitions/success" },
              {
                type: "object",
                links: build_schema_links
              }
            ]
          }
        }
      end

      private

      def build_api_links
        {
          "asset--animal": { href: "#{request.base_url}/api/v1/assets/animal" },
          "asset--plant": { href: "#{request.base_url}/api/v1/assets/plant" },
          "asset--land": { href: "#{request.base_url}/api/v1/assets/land" },
          "asset--equipment": { href: "#{request.base_url}/api/v1/assets/equipment" },
          "asset--structure": { href: "#{request.base_url}/api/v1/assets/structure" },
          "asset--material": { href: "#{request.base_url}/api/v1/assets/material" },
          "log--activity": { href: "#{request.base_url}/api/v1/logs/activity" },
          "log--harvest": { href: "#{request.base_url}/api/v1/logs/harvest" },
          "quantities": { href: "#{request.base_url}/api/v1/quantities" },
          "locations": { href: "#{request.base_url}/api/v1/locations" },
          "predicates": { href: "#{request.base_url}/api/v1/predicates" },
          "facts": { href: "#{request.base_url}/api/v1/facts" },
          self: { href: "#{request.base_url}/api/v1" }
        }
      end

      def build_schema_links
        [
          {
            href: "{instanceHref}",
            rel: "related",
            title: "Animal assets",
            targetMediaType: "application/vnd.api+json",
            targetSchema: { "$ref": "#{request.base_url}/api/v1/assets/animal/schema" },
            templatePointers: { instanceHref: "/links/asset--animal/href" },
            templateRequired: [ "instanceHref" ]
          },
          {
            href: "{instanceHref}",
            rel: "related",
            title: "Plant assets",
            targetMediaType: "application/vnd.api+json",
            targetSchema: { "$ref": "#{request.base_url}/api/v1/assets/plant/schema" },
            templatePointers: { instanceHref: "/links/asset--plant/href" },
            templateRequired: [ "instanceHref" ]
          },
          {
            href: "{instanceHref}",
            rel: "related",
            title: "Land assets",
            targetMediaType: "application/vnd.api+json",
            targetSchema: { "$ref": "#{request.base_url}/api/v1/assets/land/schema" },
            templatePointers: { instanceHref: "/links/asset--land/href" },
            templateRequired: [ "instanceHref" ]
          },
          {
            href: "{instanceHref}",
            rel: "related",
            title: "Activity logs",
            targetMediaType: "application/vnd.api+json",
            targetSchema: { "$ref": "#{request.base_url}/api/v1/logs/activity/schema" },
            templatePointers: { instanceHref: "/links/log--activity/href" },
            templateRequired: [ "instanceHref" ]
          },
          {
            href: "{instanceHref}",
            rel: "related",
            title: "Harvest logs",
            targetMediaType: "application/vnd.api+json",
            targetSchema: { "$ref": "#{request.base_url}/api/v1/logs/harvest/schema" },
            templatePointers: { instanceHref: "/links/log--harvest/href" },
            templateRequired: [ "instanceHref" ]
          }
        ]
      end
    end
  end
end
