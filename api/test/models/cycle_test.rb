require "test_helper"

class CycleTest < ActiveSupport::TestCase
  test "should require name" do
    cycle = Cycle.new(start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
    assert_not cycle.valid?
    assert_includes cycle.errors[:name], "can't be blank"
  end

  test "should require start_date" do
    cycle = Cycle.new(name: "January 2026", end_date: Date.new(2026, 1, 31))
    assert_not cycle.valid?
    assert_includes cycle.errors[:start_date], "can't be blank"
  end

  test "should require end_date" do
    cycle = Cycle.new(name: "January 2026", start_date: Date.new(2026, 1, 1))
    assert_not cycle.valid?
    assert_includes cycle.errors[:end_date], "can't be blank"
  end

  test "should validate end_date after start_date" do
    cycle = Cycle.new(
      name: "Invalid Cycle",
      start_date: Date.new(2026, 2, 1),
      end_date: Date.new(2026, 1, 1)
    )
    assert_not cycle.valid?
    assert_includes cycle.errors[:end_date], "must be after start date"
  end

  test "should prevent overlapping cycles" do
    Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))

    overlapping = Cycle.new(
      name: "Mid January 2026",
      start_date: Date.new(2026, 1, 15),
      end_date: Date.new(2026, 2, 15)
    )
    assert_not overlapping.valid?
    assert_includes overlapping.errors[:base], "Cycle dates overlap with existing cycle"
  end

  test "should allow non-overlapping cycles" do
    Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))

    february = Cycle.new(
      name: "February 2026",
      start_date: Date.new(2026, 2, 1),
      end_date: Date.new(2026, 2, 28)
    )
    assert february.valid?
  end

  test "generate_for_month creates monthly cycle" do
    cycle = Cycle.generate_for_month(2026, 3)

    assert_equal "March 2026", cycle.name
    assert_equal Date.new(2026, 3, 1), cycle.start_date
    assert_equal Date.new(2026, 3, 31), cycle.end_date
  end

  test "generate_for_month is idempotent" do
    cycle1 = Cycle.generate_for_month(2026, 4)
    cycle2 = Cycle.generate_for_month(2026, 4)

    assert_equal cycle1.id, cycle2.id
  end

  test "generate_for_date creates cycle for given date" do
    cycle = Cycle.generate_for_date(Date.new(2026, 5, 15))

    assert_equal "May 2026", cycle.name
    assert_equal Date.new(2026, 5, 1), cycle.start_date
    assert_equal Date.new(2026, 5, 31), cycle.end_date
  end

  test "ensure_cycles_exist generates multiple cycles" do
    travel_to Date.new(2026, 6, 15) do
      cycles = Cycle.ensure_cycles_exist(months_ahead: 2, months_behind: 1)

      names = cycles.map(&:name)
      assert_includes names, "May 2026"   # 1 month behind
      assert_includes names, "June 2026"  # current
      assert_includes names, "July 2026"  # 1 month ahead
      assert_includes names, "August 2026" # 2 months ahead
    end
  end

  test "current_cycle returns or creates current month" do
    travel_to Date.new(2026, 7, 15) do
      cycle = Cycle.current_cycle

      assert_equal "July 2026", cycle.name
      assert cycle.current?
    end
  end

  test "next_cycle returns or creates next month" do
    travel_to Date.new(2026, 8, 15) do
      next_cycle = Cycle.next_cycle

      assert_equal "September 2026", next_cycle.name
      assert next_cycle.future?
    end
  end

  test "current? returns true for current cycle" do
    travel_to Date.new(2026, 9, 15) do
      cycle = Cycle.create!(name: "September 2026", start_date: Date.new(2026, 9, 1), end_date: Date.new(2026, 9, 30))
      assert cycle.current?
    end
  end

  test "past? returns true for past cycle" do
    travel_to Date.new(2026, 10, 15) do
      cycle = Cycle.create!(name: "September 2026", start_date: Date.new(2026, 9, 1), end_date: Date.new(2026, 9, 30))
      assert cycle.past?
    end
  end

  test "future? returns true for future cycle" do
    travel_to Date.new(2026, 10, 15) do
      cycle = Cycle.create!(name: "November 2026", start_date: Date.new(2026, 11, 1), end_date: Date.new(2026, 11, 30))
      assert cycle.future?
    end
  end

  test "days_remaining calculation" do
    travel_to Date.new(2026, 1, 15) do
      cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
      assert_equal 17, cycle.days_remaining # Jan 15-31 = 17 days
    end
  end

  test "days_elapsed calculation" do
    travel_to Date.new(2026, 1, 15) do
      cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
      assert_equal 15, cycle.days_elapsed # Jan 1-15 = 15 days
    end
  end

  test "total_days calculation" do
    cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
    assert_equal 31, cycle.total_days
  end

  test "progress_percentage calculation" do
    travel_to Date.new(2026, 1, 16) do
      cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
      assert_equal 52, cycle.progress_percentage # 16/31 = ~52%
    end
  end

  test "scopes filter by timing" do
    travel_to Date.new(2026, 2, 15) do
      past_cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
      current_cycle = Cycle.create!(name: "February 2026", start_date: Date.new(2026, 2, 1), end_date: Date.new(2026, 2, 28))
      future_cycle = Cycle.create!(name: "March 2026", start_date: Date.new(2026, 3, 1), end_date: Date.new(2026, 3, 31))

      assert_includes Cycle.past, past_cycle
      assert_includes Cycle.current, current_cycle
      assert_includes Cycle.future, future_cycle
    end
  end

  test "should have many tasks" do
    cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
    task1 = Task.create!(title: "Task 1", cycle: cycle)
    task2 = Task.create!(title: "Task 2", cycle: cycle)

    assert_includes cycle.tasks, task1
    assert_includes cycle.tasks, task2
  end

  test "should calculate task statistics" do
    cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
    Task.create!(title: "Done Task", cycle: cycle, state: "done", estimate: 60)
    Task.create!(title: "Active Task", cycle: cycle, state: "in_progress", estimate: 30)

    assert_equal 2, cycle.task_count
    assert_equal 1, cycle.completed_task_count
    assert_equal 1, cycle.active_task_count
    assert_equal 50, cycle.task_completion_percentage
    assert_equal 90, cycle.total_estimate
    assert_equal 60, cycle.completed_estimate
  end

  test "should nullify tasks on destroy" do
    cycle = Cycle.create!(name: "January 2026", start_date: Date.new(2026, 1, 1), end_date: Date.new(2026, 1, 31))
    task = Task.create!(title: "Task 1", cycle: cycle)

    cycle.destroy

    task.reload
    assert_nil task.cycle_id
  end
end
