Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # API routes
  namespace :api do
    namespace :v1 do
      # Root API endpoint
      root to: "base#index"
      get "schema", to: "base#schema"

      # Asset routes
      scope "assets" do
        get ":asset_type", to: "assets#index"
        post ":asset_type", to: "assets#create"
        get ":asset_type/:id", to: "assets#show"
        patch ":asset_type/:id", to: "assets#update"
        delete ":asset_type/:id", to: "assets#destroy"
      end

      # Log routes
      scope "logs" do
        get ":log_type", to: "logs#index"
        post ":log_type", to: "logs#create"
        get ":log_type/:id", to: "logs#show"
        patch ":log_type/:id", to: "logs#update"
        delete ":log_type/:id", to: "logs#destroy"
      end

      # Quantity routes
      resources :quantities, only: [ :index, :show, :create, :update, :destroy ]

      # Location routes
      resources :locations, only: [ :index, :show, :create, :update, :destroy ]

      # Predicate routes (vocabulary/schema discovery)
      resources :predicates, only: [ :index, :show ]

      # Fact routes (semantic knowledge graph)
      resources :facts, only: [ :index, :show, :create ]
    end
  end

  # Redirect root to API
  root to: redirect("/api/v1")

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
