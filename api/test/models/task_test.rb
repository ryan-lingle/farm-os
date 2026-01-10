require "test_helper"

class TaskTest < ActiveSupport::TestCase
  def setup
    @project = Project.create!(name: "Test Project")
    @cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
  end

  test "should require title" do
    task = Task.new(state: "backlog")
    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  test "should default state to backlog" do
    task = Task.new(title: "Test Task")
    assert_equal "backlog", task.state
  end

  test "should validate state inclusion" do
    task = Task.new(title: "Test Task", state: "invalid_state")
    assert_not task.valid?
    assert_includes task.errors[:state], "is not included in the list"
  end

  test "should accept valid states" do
    Task::STATES.each do |state|
      task = Task.new(title: "Test Task", state: state)
      assert task.valid?, "State #{state} should be valid"
    end
  end

  test "should validate estimate is non-negative integer" do
    task = Task.new(title: "Test Task", estimate: -10)
    assert_not task.valid?
    assert_includes task.errors[:estimate], "must be greater than or equal to 0"
  end

  test "should allow nil estimate" do
    task = Task.new(title: "Test Task")
    assert task.valid?
  end

  test "should belong to project" do
    task = Task.create!(title: "Test Task", project: @project)
    assert_equal @project, task.project
  end

  test "should belong to cycle" do
    task = Task.create!(title: "Test Task", cycle: @cycle)
    assert_equal @cycle, task.cycle
  end

  test "should support parent-child hierarchy" do
    parent = Task.create!(title: "Parent Task")
    child = Task.create!(title: "Child Task", parent: parent)

    assert_equal parent, child.parent
    assert_includes parent.children, child
  end

  test "should calculate ancestors" do
    grandparent = Task.create!(title: "Grandparent")
    parent = Task.create!(title: "Parent", parent: grandparent)
    child = Task.create!(title: "Child", parent: parent)

    assert_equal [parent, grandparent], child.ancestors
    assert_equal [grandparent], parent.ancestors
    assert_empty grandparent.ancestors
  end

  test "should calculate descendants" do
    parent = Task.create!(title: "Parent")
    child1 = Task.create!(title: "Child 1", parent: parent)
    child2 = Task.create!(title: "Child 2", parent: parent)
    grandchild = Task.create!(title: "Grandchild", parent: child1)

    descendants = parent.descendants
    assert_includes descendants, child1
    assert_includes descendants, child2
    assert_includes descendants, grandchild
  end

  test "should identify root task" do
    parent = Task.create!(title: "Parent")
    child = Task.create!(title: "Child", parent: parent)

    assert parent.root?
    assert_not child.root?
  end

  test "should identify leaf task" do
    parent = Task.create!(title: "Parent")
    child = Task.create!(title: "Child", parent: parent)

    assert_not parent.leaf?
    assert child.leaf?
  end

  test "should calculate depth" do
    grandparent = Task.create!(title: "Grandparent")
    parent = Task.create!(title: "Parent", parent: grandparent)
    child = Task.create!(title: "Child", parent: parent)

    assert_equal 0, grandparent.depth
    assert_equal 1, parent.depth
    assert_equal 2, child.depth
  end

  test "should calculate root" do
    grandparent = Task.create!(title: "Grandparent")
    parent = Task.create!(title: "Parent", parent: grandparent)
    child = Task.create!(title: "Child", parent: parent)

    assert_equal grandparent, child.root
    assert_equal grandparent, parent.root
    assert_equal grandparent, grandparent.root
  end

  test "should display estimate in hours" do
    task = Task.create!(title: "Test Task", estimate: 90)
    assert_equal 1.5, task.estimate_in_hours
  end

  test "should display estimate as string" do
    task1 = Task.create!(title: "Test Task 1", estimate: 90)
    assert_equal "1h 30m", task1.estimate_display

    task2 = Task.create!(title: "Test Task 2", estimate: 60)
    assert_equal "1h", task2.estimate_display

    task3 = Task.create!(title: "Test Task 3", estimate: 45)
    assert_equal "45m", task3.estimate_display
  end

  test "state query methods" do
    task = Task.create!(title: "Test Task")

    task.update!(state: "backlog")
    assert task.backlog?
    assert task.active?
    assert_not task.completed?

    task.update!(state: "todo")
    assert task.todo?
    assert task.active?

    task.update!(state: "in_progress")
    assert task.in_progress?
    assert task.active?

    task.update!(state: "done")
    assert task.done?
    assert task.completed?
    assert_not task.active?

    task.update!(state: "cancelled")
    assert task.cancelled?
    assert task.completed?
  end

  test "scopes filter by state" do
    backlog_task = Task.create!(title: "Backlog", state: "backlog")
    todo_task = Task.create!(title: "Todo", state: "todo")
    in_progress_task = Task.create!(title: "In Progress", state: "in_progress")
    done_task = Task.create!(title: "Done", state: "done")
    cancelled_task = Task.create!(title: "Cancelled", state: "cancelled")

    assert_includes Task.backlog, backlog_task
    assert_includes Task.todo, todo_task
    assert_includes Task.in_progress, in_progress_task
    assert_includes Task.done, done_task
    assert_includes Task.cancelled, cancelled_task

    active_tasks = Task.active
    assert_includes active_tasks, backlog_task
    assert_includes active_tasks, todo_task
    assert_includes active_tasks, in_progress_task
    assert_not_includes active_tasks, done_task
    assert_not_includes active_tasks, cancelled_task

    completed_tasks = Task.completed
    assert_includes completed_tasks, done_task
    assert_includes completed_tasks, cancelled_task
    assert_not_includes completed_tasks, backlog_task
  end

  test "scopes filter by schedule" do
    scheduled_task = Task.create!(title: "Scheduled", cycle: @cycle)
    unscheduled_task = Task.create!(title: "Unscheduled")

    assert_includes Task.scheduled, scheduled_task
    assert_not_includes Task.scheduled, unscheduled_task

    assert_includes Task.unscheduled, unscheduled_task
    assert_not_includes Task.unscheduled, scheduled_task
  end

  test "should link to assets" do
    task = Task.create!(title: "Test Task")
    asset = Asset.create!(name: "Test Asset", asset_type: "animal")
    task.assets << asset

    assert_includes task.assets, asset
  end

  test "should link to locations" do
    task = Task.create!(title: "Test Task")
    location = Location.create!(name: "Test Location", location_type: "point")
    task.locations << location

    assert_includes task.locations, location
  end

  test "should link to logs" do
    task = Task.create!(title: "Test Task")
    log = Log.create!(name: "Test Log", log_type: "activity")
    task.logs << log

    assert_includes task.logs, log
  end
end
