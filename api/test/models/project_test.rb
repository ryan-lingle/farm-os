require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  test "should require name" do
    project = Project.new(status: "planned")
    assert_not project.valid?
    assert_includes project.errors[:name], "can't be blank"
  end

  test "should default status to planned" do
    project = Project.new(name: "Test Project")
    assert_equal "planned", project.status
  end

  test "should validate status inclusion" do
    project = Project.new(name: "Test Project", status: "invalid_status")
    assert_not project.valid?
    assert_includes project.errors[:status], "is not included in the list"
  end

  test "should accept valid statuses" do
    Project::STATUSES.each do |status|
      project = Project.new(name: "Test Project", status: status)
      assert project.valid?, "Status #{status} should be valid"
    end
  end

  test "should validate target_date after start_date" do
    project = Project.new(
      name: "Test Project",
      start_date: Date.new(2026, 2, 1),
      target_date: Date.new(2026, 1, 1)
    )
    assert_not project.valid?
    assert_includes project.errors[:target_date], "must be after start date"
  end

  test "should allow target_date equal to start_date" do
    project = Project.new(
      name: "Test Project",
      start_date: Date.new(2026, 1, 1),
      target_date: Date.new(2026, 1, 1)
    )
    # target_date == start_date should be valid (project completes same day it starts)
    assert project.valid?
  end

  test "should allow target_date after start_date" do
    project = Project.new(
      name: "Test Project",
      start_date: Date.new(2026, 1, 1),
      target_date: Date.new(2026, 2, 1)
    )
    assert project.valid?
  end

  test "status query methods" do
    project = Project.create!(name: "Test Project")

    project.update!(status: "planned")
    assert project.planned?
    assert project.in_progress?

    project.update!(status: "active")
    assert project.active?
    assert project.in_progress?

    project.update!(status: "completed")
    assert project.completed?
    assert_not project.in_progress?

    project.update!(status: "cancelled")
    assert project.cancelled?
    assert_not project.in_progress?
  end

  test "scopes filter by status" do
    planned = Project.create!(name: "Planned", status: "planned")
    active = Project.create!(name: "Active", status: "active")
    completed = Project.create!(name: "Completed", status: "completed")
    cancelled = Project.create!(name: "Cancelled", status: "cancelled")

    assert_includes Project.planned, planned
    assert_includes Project.active, active
    assert_includes Project.completed, completed
    assert_includes Project.cancelled, cancelled

    in_progress = Project.in_progress
    assert_includes in_progress, planned
    assert_includes in_progress, active
    assert_not_includes in_progress, completed
    assert_not_includes in_progress, cancelled
  end

  test "should have many tasks" do
    project = Project.create!(name: "Test Project")
    task1 = Task.create!(title: "Task 1", project: project)
    task2 = Task.create!(title: "Task 2", project: project)

    assert_includes project.tasks, task1
    assert_includes project.tasks, task2
  end

  test "should calculate task_count" do
    project = Project.create!(name: "Test Project")
    Task.create!(title: "Task 1", project: project)
    Task.create!(title: "Task 2", project: project)

    assert_equal 2, project.task_count
  end

  test "should calculate completed_task_count" do
    project = Project.create!(name: "Test Project")
    Task.create!(title: "Done Task", project: project, state: "done")
    Task.create!(title: "Cancelled Task", project: project, state: "cancelled")
    Task.create!(title: "Active Task", project: project, state: "in_progress")

    assert_equal 2, project.completed_task_count
  end

  test "should calculate active_task_count" do
    project = Project.create!(name: "Test Project")
    Task.create!(title: "Backlog Task", project: project, state: "backlog")
    Task.create!(title: "Todo Task", project: project, state: "todo")
    Task.create!(title: "Done Task", project: project, state: "done")

    assert_equal 2, project.active_task_count
  end

  test "should calculate progress_percentage" do
    project = Project.create!(name: "Test Project")
    Task.create!(title: "Done Task", project: project, state: "done")
    Task.create!(title: "Cancelled Task", project: project, state: "cancelled")
    Task.create!(title: "Active Task 1", project: project, state: "in_progress")
    Task.create!(title: "Active Task 2", project: project, state: "backlog")

    assert_equal 50, project.progress_percentage
  end

  test "progress_percentage should be 0 when no tasks" do
    project = Project.create!(name: "Test Project")
    assert_equal 0, project.progress_percentage
  end

  test "should calculate total_estimate" do
    project = Project.create!(name: "Test Project")
    Task.create!(title: "Task 1", project: project, estimate: 60)
    Task.create!(title: "Task 2", project: project, estimate: 30)
    Task.create!(title: "Task 3", project: project, estimate: nil)

    assert_equal 90, project.total_estimate
  end

  test "should display total_estimate as string" do
    project = Project.create!(name: "Test Project")
    Task.create!(title: "Task 1", project: project, estimate: 90)
    Task.create!(title: "Task 2", project: project, estimate: 30)

    assert_equal "2h", project.total_estimate_display
  end

  test "should nullify tasks on destroy" do
    project = Project.create!(name: "Test Project")
    task = Task.create!(title: "Task 1", project: project)

    project.destroy

    task.reload
    assert_nil task.project_id
  end
end
