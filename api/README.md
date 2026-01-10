# FarmAPI

A Rails 8 API-only application that mimics the farmOS API structure using JSON:API specification.

## Requirements

- Docker and Docker Compose
- Ruby 3.3.0 (for local development without Docker)

## Setup with Docker

1. Build the Docker containers:
   ```bash
   docker-compose build
   ```

2. Create and migrate the database:
   ```bash
   docker-compose run web rails db:create db:migrate
   ```

3. Start the application:
   ```bash
   docker-compose up
   ```

The API will be available at `http://localhost:3000`

## Development

To run Rails commands:
```bash
docker-compose run web rails console
docker-compose run web rails generate model Asset name:string
docker-compose run web rails db:migrate
```

To install new gems:
1. Add the gem to `Gemfile`
2. Run `docker-compose run web bundle install`
3. Rebuild the container: `docker-compose build web`

## API Structure

This API follows the JSON:API specification and includes:
- Schema endpoint for MCP server integration
- RESTful endpoints for farm resources (assets, logs, etc.)
- CORS enabled for cross-origin requests

## Testing

Run the test suite:
```bash
docker-compose run web rails test
```
