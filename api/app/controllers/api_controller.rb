class ApiController < ActionController::API
  # Base API controller

  private

  def render_jsonapi(resource, options = {})
    if resource.respond_to?(:each)
      # Collection
      render json: serialize_collection(resource, options)
    else
      # Single resource
      render json: serialize_resource(resource, options)
    end
  end

  def render_jsonapi_errors(errors, status: :unprocessable_entity)
    render json: {
      errors: errors.map do |attribute, messages|
        Array(messages).map do |message|
          {
            status: status.to_s,
            source: { pointer: "/data/attributes/#{attribute}" },
            detail: message
          }
        end
      end.flatten
    }, status: status
  end

  def serialize_collection(resources, options = {})
    serializer_class = options[:serializer] || "#{resources.klass.name}Serializer".constantize

    {
      jsonapi: { version: "1.0" },
      data: resources.map { |resource| serializer_class.new(resource).serializable_hash[:data] },
      meta: {
        total: resources.respond_to?(:total_count) ? resources.total_count : resources.count
      },
      links: pagination_links(resources)
    }
  end

  def serialize_resource(resource, options = {})
    serializer_class = options[:serializer] || "#{resource.class.name}Serializer".constantize

    {
      jsonapi: { version: "1.0" }
    }.merge(serializer_class.new(resource).serializable_hash)
  end

  def pagination_links(resources)
    return {} unless resources.respond_to?(:current_page)

    base_url = request.base_url + request.path

    {
      self: "#{base_url}?page=#{resources.current_page}",
      first: "#{base_url}?page=1",
      last: "#{base_url}?page=#{resources.total_pages}",
      prev: resources.prev_page ? "#{base_url}?page=#{resources.prev_page}" : nil,
      next: resources.next_page ? "#{base_url}?page=#{resources.next_page}" : nil
    }.compact
  end
end
