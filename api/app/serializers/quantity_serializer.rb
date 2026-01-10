class QuantitySerializer
  include JSONAPI::Serializer

  set_type :quantity

  attributes :label, :measure, :value, :unit, :quantity_type
end
