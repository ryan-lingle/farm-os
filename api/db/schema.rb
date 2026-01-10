# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_10_22_170300) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "assets", force: :cascade do |t|
    t.string "name"
    t.string "status"
    t.text "notes"
    t.string "asset_type"
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "current_location_id"
    t.jsonb "geometry"
    t.integer "quantity"
    t.bigint "parent_id"
    t.index ["current_location_id"], name: "index_assets_on_current_location_id"
    t.index ["parent_id"], name: "index_assets_on_parent_id"
  end

  create_table "assets_logs", id: false, force: :cascade do |t|
    t.bigint "asset_id", null: false
    t.bigint "log_id", null: false
    t.string "role", default: "related", null: false
    t.index ["asset_id", "role"], name: "index_assets_logs_on_asset_id_and_role"
    t.index ["asset_id"], name: "index_assets_logs_on_asset_id"
    t.index ["log_id", "role"], name: "index_assets_logs_on_log_id_and_role"
    t.index ["log_id"], name: "index_assets_logs_on_log_id"
  end

  create_table "facts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.bigint "subject_id", null: false
    t.uuid "predicate_id", null: false
    t.bigint "object_id"
    t.decimal "value_numeric", precision: 12, scale: 3
    t.string "unit"
    t.datetime "observed_at", null: false
    t.bigint "log_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["log_id"], name: "index_facts_on_log_id"
    t.index ["object_id", "predicate_id", "observed_at"], name: "index_facts_on_object_predicate_time"
    t.index ["predicate_id", "observed_at"], name: "index_facts_on_predicate_id_and_observed_at"
    t.index ["subject_id", "predicate_id", "observed_at"], name: "index_facts_on_subject_predicate_time"
  end

  create_table "locations", force: :cascade do |t|
    t.string "name"
    t.string "status"
    t.text "notes"
    t.string "location_type"
    t.jsonb "geometry"
    t.datetime "archived_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "parent_id"
    t.index ["parent_id"], name: "index_locations_on_parent_id"
  end

  create_table "logs", force: :cascade do |t|
    t.string "name"
    t.string "status"
    t.text "notes"
    t.string "log_type"
    t.datetime "timestamp"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "from_location_id"
    t.bigint "to_location_id"
    t.datetime "moved_at"
    t.index ["from_location_id"], name: "index_logs_on_from_location_id"
    t.index ["to_location_id"], name: "index_logs_on_to_location_id"
  end

  create_table "predicates", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "kind", null: false
    t.string "unit"
    t.text "description"
    t.jsonb "constraints", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["kind"], name: "index_predicates_on_kind"
    t.index ["name"], name: "index_predicates_on_name", unique: true
  end

  create_table "quantities", force: :cascade do |t|
    t.string "label"
    t.string "measure"
    t.decimal "value"
    t.string "quantity_type"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "unit"
    t.bigint "log_id"
    t.index ["log_id"], name: "index_quantities_on_log_id"
  end

  create_table "taxonomy_terms", force: :cascade do |t|
    t.string "name"
    t.string "vocabulary"
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  add_foreign_key "assets", "assets", column: "parent_id"
  add_foreign_key "assets", "locations", column: "current_location_id"
  add_foreign_key "facts", "assets", column: "subject_id"
  add_foreign_key "facts", "logs"
  add_foreign_key "facts", "predicates"
  add_foreign_key "locations", "locations", column: "parent_id"
  add_foreign_key "logs", "locations", column: "from_location_id"
  add_foreign_key "logs", "locations", column: "to_location_id"
  add_foreign_key "quantities", "logs"
end
