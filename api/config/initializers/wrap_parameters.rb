# Be sure to restart your server when you modify this file.

# This file configures Rails to wrap JSON parameters.

ActiveSupport.on_load(:action_controller) do
  wrap_parameters format: [ :json ] if respond_to?(:wrap_parameters)
end
