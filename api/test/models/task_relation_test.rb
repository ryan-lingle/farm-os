require "test_helper"

class TaskRelationTest < ActiveSupport::TestCase
  def setup
    @task1 = Task.create!(title: "Task 1")
    @task2 = Task.create!(title: "Task 2")
    @task3 = Task.create!(title: "Task 3")
  end

  test "should require relation_type" do
    relation = TaskRelation.new(source_task: @task1, target_task: @task2)
    assert_not relation.valid?
    assert_includes relation.errors[:relation_type], "can't be blank"
  end

  test "should validate relation_type inclusion" do
    relation = TaskRelation.new(source_task: @task1, target_task: @task2, relation_type: "invalid")
    assert_not relation.valid?
    assert_includes relation.errors[:relation_type], "is not included in the list"
  end

  test "should accept valid relation_types" do
    TaskRelation::RELATION_TYPES.each do |type|
      relation = TaskRelation.new(source_task: @task1, target_task: @task2, relation_type: type)
      # Need to use a fresh task for each to avoid duplicate validation
      task_a = Task.create!(title: "Task A #{type}")
      task_b = Task.create!(title: "Task B #{type}")
      relation = TaskRelation.new(source_task: task_a, target_task: task_b, relation_type: type)
      assert relation.valid?, "Relation type #{type} should be valid"
    end
  end

  test "should prevent self-referential relations" do
    relation = TaskRelation.new(source_task: @task1, target_task: @task1, relation_type: "blocks")
    assert_not relation.valid?
    assert_includes relation.errors[:base], "A task cannot be related to itself"
  end

  test "should prevent duplicate relations" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")

    duplicate = TaskRelation.new(source_task: @task1, target_task: @task2, relation_type: "blocks")
    assert_not duplicate.valid?
  end

  test "should allow same tasks with different relation_types" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")

    different_type = TaskRelation.new(source_task: @task1, target_task: @task2, relation_type: "related")
    assert different_type.valid?
  end

  test "should prevent inverse duplicate for symmetric relations" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "related")

    inverse = TaskRelation.new(source_task: @task2, target_task: @task1, relation_type: "related")
    assert_not inverse.valid?
    assert_includes inverse.errors[:base], "This relation already exists in the opposite direction"
  end

  test "should allow inverse for non-symmetric relations" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")

    inverse = TaskRelation.new(source_task: @task2, target_task: @task1, relation_type: "blocks")
    assert inverse.valid?
  end

  test "relation_type query methods" do
    blocks_relation = TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")
    assert blocks_relation.blocks?
    assert_not blocks_relation.related?
    assert_not blocks_relation.duplicate?

    related_relation = TaskRelation.create!(source_task: @task1, target_task: @task3, relation_type: "related")
    assert related_relation.related?
    assert related_relation.symmetric?
  end

  test "scopes filter by relation_type" do
    blocks = TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")
    related = TaskRelation.create!(source_task: @task1, target_task: @task3, relation_type: "related")

    task4 = Task.create!(title: "Task 4")
    duplicate = TaskRelation.create!(source_task: @task2, target_task: task4, relation_type: "duplicate")

    assert_includes TaskRelation.blocks, blocks
    assert_includes TaskRelation.related, related
    assert_includes TaskRelation.duplicate, duplicate
  end

  test "task should know what it blocks" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")
    TaskRelation.create!(source_task: @task1, target_task: @task3, relation_type: "blocks")

    blocked_tasks = @task1.blocks
    assert_includes blocked_tasks, @task2
    assert_includes blocked_tasks, @task3
  end

  test "task should know what blocks it" do
    TaskRelation.create!(source_task: @task1, target_task: @task3, relation_type: "blocks")
    TaskRelation.create!(source_task: @task2, target_task: @task3, relation_type: "blocks")

    blockers = @task3.blocked_by
    assert_includes blockers, @task1
    assert_includes blockers, @task2
  end

  test "task should know related tasks" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "related")

    assert_includes @task1.related_tasks, @task2
    assert_includes @task2.related_tasks, @task1
  end

  test "task blocked? returns true when blocked by active tasks" do
    TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")

    assert @task2.blocked?

    @task1.update!(state: "done")
    assert_not @task2.blocked?
  end

  test "destroying task destroys related relations" do
    relation = TaskRelation.create!(source_task: @task1, target_task: @task2, relation_type: "blocks")

    @task1.destroy

    assert_not TaskRelation.exists?(relation.id)
  end
end
