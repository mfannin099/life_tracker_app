import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Weight = {
  id: number;
  name: string;
  date: string;
  weight: number;
  created_at: string;
};

type Workout = {
  id: number;
  name: string;
  date: string;
  lift_split: string;
  secondary_muscle_group: string | null;
  cardio_done: boolean;
  cardio_type: string | null;
  cardio_distance_miles: number | null;
  cardio_duration_minutes: number | null;
  created_at: string;
};

type WeightChartRow = {
  date: string;
  avg?: number | null;
  moving_avg?: number | null;
  [key: string]: string | number | null | undefined;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function toSortableDate(value: string): number {
  const [month, day, year] = value.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function toDate(value: string): Date {
  const [month, day, year] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayDateString(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const year = String(today.getFullYear());
  return `${month}-${day}-${year}`;
}

function getMonthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCalendarDay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
  }).format(date);
}

function formatWeekdayShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
}

function formatMonthDayShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildMonthGrid(date: Date) {
  const { start, end } = getMonthBounds(date);
  const leadingBlanks = start.getDay();
  const daysInMonth = end.getDate();
  const cells: Array<{ key: string; date: Date | null }> = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({ key: `blank-${i}`, date: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: `day-${day}`,
      date: new Date(date.getFullYear(), date.getMonth(), day),
    });
  }

  return cells;
}

function uniqueWorkoutDates(workouts: Workout[]): Set<string> {
  return new Set(workouts.map((workout) => workout.date));
}

function countWorkoutsInRange(workouts: Workout[], start: Date, end: Date): number {
  return workouts.filter((workout) => {
    const workoutDate = toDate(workout.date);
    return workoutDate >= start && workoutDate <= end;
  }).length;
}

function calculateWorkoutStreaks(workouts: Workout[]) {
  const workoutDates = new Set(
    workouts.map((workout) => {
      const [month, day, year] = workout.date.split("-").map(Number);
      return new Date(year, month - 1, day).setHours(0, 0, 0, 0);
    }),
  );

  if (workoutDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedDates = Array.from(workoutDates).sort((a, b) => a - b);
  let longestStreak = 1;
  let currentRun = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = sortedDates[i - 1];
    const current = sortedDates[i];
    const dayDiff = Math.round((current - prev) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
    } else if (dayDiff > 1) {
      currentRun = 1;
    }
  }

  let currentStreak = 1;
  let cursor = sortedDates[sortedDates.length - 1];
  const oneDay = 24 * 60 * 60 * 1000;

  while (workoutDates.has(cursor - oneDay)) {
    currentStreak += 1;
    cursor -= oneDay;
  }

  return { currentStreak, longestStreak };
}

function App() {
  const [view, setView] = useState<"dashboard" | "all_weights" | "all_workouts">("dashboard");
  const [weights, setWeights] = useState<Weight[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weightError, setWeightError] = useState("");
  const [workoutError, setWorkoutError] = useState("");
  const [weightSuccess, setWeightSuccess] = useState("");
  const [workoutSuccess, setWorkoutSuccess] = useState("");
  const [weightsPage, setWeightsPage] = useState(0);

  const STORED_NAME_KEY = "fitnessTracker.name";
  const getStoredName = () => localStorage.getItem(STORED_NAME_KEY) ?? "";
  const rememberName = (name: string) => {
    if (name.trim()) {
      localStorage.setItem(STORED_NAME_KEY, name.trim());
    }
  };

  const resetWeightForm = () => ({ name: getStoredName(), date: todayDateString(), weight: "" });
  const resetWorkoutForm = () => ({
    name: getStoredName(),
    date: todayDateString(),
    lift_split: "push",
    secondary_muscle_group: "",
    cardio_done: "false",
    cardio_type: "",
    cardio_distance_miles: "",
    cardio_duration_minutes: "",
  });

  const [weightForm, setWeightForm] = useState(resetWeightForm());
  const [workoutForm, setWorkoutForm] = useState(resetWorkoutForm());

  async function loadWeights() {
    const response = await fetch(`${API_BASE}/weights`);
    const data = await response.json();
    const normalized = (data.weights ?? []).map((w: Weight) => ({ ...w, name: (w.name ?? "").trim() }));
    setWeights(normalized);
    setWeightsPage(0);
  }

  async function loadWorkouts() {
    const response = await fetch(`${API_BASE}/workouts`);
    const data = await response.json();
    const normalized = (data.workouts ?? []).map((w: Workout) => ({ ...w, name: (w.name ?? "").trim() }));
    setWorkouts(normalized);
  }

  async function onWeightSubmit(e: FormEvent) {
    e.preventDefault();
    setWeightError("");
    setWeightSuccess("");
    const response = await fetch(`${API_BASE}/weights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: weightForm.name,
        date: weightForm.date,
        weight: Number(weightForm.weight),
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      setWeightError(`Failed to add weight (${response.status}): ${text}`);
      return;
    }
    setWeightSuccess(`✓ Weight added for ${weightForm.name}!`);
    rememberName(weightForm.name);
    setWeightForm(resetWeightForm());
    await loadWeights();
  }

  async function deleteWeight(id: number) {
    if (!window.confirm("Delete this weight entry? This cannot be undone.")) {
      return;
    }
    await fetch(`${API_BASE}/weights/${id}`, { method: "DELETE" });
    await loadWeights();
  }

  async function onWorkoutSubmit(e: FormEvent) {
    e.preventDefault();
    setWorkoutError("");
    setWorkoutSuccess("");
    const cardioDone = workoutForm.cardio_done === "true";

    const response = await fetch(`${API_BASE}/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: workoutForm.name,
        date: workoutForm.date,
        lift_split: workoutForm.lift_split,
        secondary_muscle_group: workoutForm.secondary_muscle_group || null,
        cardio_done: cardioDone,
        cardio_type: cardioDone ? workoutForm.cardio_type || null : null,
        cardio_distance_miles:
          cardioDone && workoutForm.cardio_distance_miles
            ? Number(workoutForm.cardio_distance_miles)
            : null,
        cardio_duration_minutes:
          cardioDone && workoutForm.cardio_duration_minutes
            ? Number(workoutForm.cardio_duration_minutes)
            : null,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      setWorkoutError(`Failed to add workout (${response.status}): ${text}`);
      return;
    }
    setWorkoutSuccess(`✓ Workout logged for ${workoutForm.name}!`);
    rememberName(workoutForm.name);
    setWorkoutForm(resetWorkoutForm());
    await loadWorkouts();
  }

  async function deleteWorkout(id: number) {
    if (!window.confirm("Delete this workout entry? This cannot be undone.")) {
      return;
    }
    await fetch(`${API_BASE}/workouts/${id}`, { method: "DELETE" });
    await loadWorkouts();
  }

  useEffect(() => {
    void loadWeights();
    void loadWorkouts();
  }, []);

  useEffect(() => {
    if (weightSuccess) {
      const timer = setTimeout(() => setWeightSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [weightSuccess]);

  useEffect(() => {
    if (workoutSuccess) {
      const timer = setTimeout(() => setWorkoutSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [workoutSuccess]);

  const recentWeights = [...weights]
    .sort((a, b) => toSortableDate(b.date) - toSortableDate(a.date) || b.id - a.id)
    .slice(0, 5);

  const recentWorkouts = [...workouts]
    .sort((a, b) => toSortableDate(b.date) - toSortableDate(a.date) || b.id - a.id)
    .slice(0, 5);
  const allWeights = [...weights].sort(
    (a, b) => toSortableDate(b.date) - toSortableDate(a.date) || b.id - a.id,
  );
  const allWorkouts = [...workouts].sort(
    (a, b) => toSortableDate(b.date) - toSortableDate(a.date) || b.id - a.id,
  );

  const latestWeight = recentWeights[0]?.weight ?? null;
  const latestWorkoutSplit = recentWorkouts[0]?.lift_split ?? null;
  const now = new Date();
  const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const workoutsLastWeek = workouts.filter((w) => {
    const workoutDate = toDate(w.date);
    return workoutDate >= lastWeekStart && workoutDate <= now;
  }).length;
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const workoutsThisMonth = countWorkoutsInRange(workouts, currentMonthStart, currentMonthEnd);
  const workoutStreaks = calculateWorkoutStreaks(workouts);
  const monthGrid = buildMonthGrid(now);
  const workoutDatesThisMonth = uniqueWorkoutDates(
    workouts.filter((workout) => {
      const workoutDate = toDate(workout.date);
      return workoutDate >= currentMonthStart && workoutDate <= currentMonthEnd;
    }),
  );

  if (view === "all_weights") {
    const itemsPerPage = 15;
    const totalPages = Math.ceil(allWeights.length / itemsPerPage);
    const paginatedWeights = allWeights.slice(weightsPage * itemsPerPage, (weightsPage + 1) * itemsPerPage);
    
    // Prepare chart data grouped by user
    const dateToUserWeights: Record<string, Record<string, number>> = {};
    [...allWeights].reverse().forEach((entry) => {
      if (!dateToUserWeights[entry.date]) {
        dateToUserWeights[entry.date] = {};
      }
      dateToUserWeights[entry.date][entry.name] = entry.weight;
    });
    
    const chartData: WeightChartRow[] = Object.entries(dateToUserWeights).map(([date, userWeights]) => ({
      date,
      ...userWeights,
    }));
    // Ensure chart data is in chronological order so lines connect correctly
    chartData.sort((a, b) => toSortableDate(a.date) - toSortableDate(b.date));
    
    // Get unique user names BEFORE using them in calculations
    const userNames = Array.from(new Set(allWeights.map((w) => w.name)));
    const colors = ["#0891b2", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a"];

    // Compute per-date average weight and 7-day moving average
    try {
      for (let i = 0; i < chartData.length; i++) {
        const row = chartData[i];
        // Calculate average of all user weights on this date
        const vals = userNames
          .map((n) => row[n])
          .filter((v) => typeof v === 'number' && !isNaN(v)) as number[];
        row.avg = vals.length > 0 ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
      }

      // Compute 7-day moving average (or fewer days if less data exists)
      const windowSize = 7;
      for (let i = 0; i < chartData.length; i++) {
        const start = Math.max(0, i - (windowSize - 1));
        const slice = chartData
          .slice(start, i + 1)
          .map((r) => r.avg)
          .filter((v) => v != null) as number[];
        chartData[i].moving_avg = slice.length > 0 ? slice.reduce((s, x) => s + x, 0) / slice.length : null;
      }
    } catch (err) {
      console.warn('Error computing moving average:', err);
      // Gracefully continue without moving average if calculation fails
    }


    return (
      <main>
        <header className="page-header">
          <h1>All Weight Entries</h1>
          <p>Complete history of recorded weights.</p>
        </header>
        <section className="section">
          <button type="button" className="ghost" onClick={() => setView("dashboard")}>
            Back to Dashboard
          </button>

          <div style={{ marginTop: "20px", marginBottom: "30px" }}>
            <h3 style={{ marginTop: 0 }}>Weight Trend</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 13 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '4px' }}
                  formatter={(value) => {
                    const numericValue =
                      typeof value === "number"
                        ? value
                        : Array.isArray(value) && typeof value[0] === "number"
                          ? value[0]
                          : null;
                    return numericValue !== null ? numericValue.toFixed(1) : "-";
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                {userNames.map((userName, idx) => (
                  <Line
                    key={userName}
                    type="monotone"
                    dataKey={userName}
                    stroke={colors[idx % colors.length]}
                    name={userName}
                    connectNulls={true}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
                {/* 7-day moving average (orange line) */}
                <Line
                  type="monotone"
                  dataKey="moving_avg"
                  stroke="#fb923c"
                  name="7-day avg"
                  strokeWidth={3}
                  dot={false}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Weight (lbs)</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWeights.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.date}</td>
                    <td>{entry.weight}</td>
                    <td>{entry.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center", alignItems: "center" }}>
            <button
              type="button"
              className="ghost"
              onClick={() => setWeightsPage(Math.max(0, weightsPage - 1))}
              disabled={weightsPage === 0}
            >
              ← Previous
            </button>
            <span style={{ margin: "0 10px", fontSize: "0.9rem" }}>
              Page {weightsPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="ghost"
              onClick={() => setWeightsPage(Math.min(totalPages - 1, weightsPage + 1))}
              disabled={weightsPage >= totalPages - 1}
            >
              Next →
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (view === "all_workouts") {
    const liftSplitLabels: Record<string, string> = {
      push: "Push",
      pull: "Pull",
      legs: "Legs",
      shoulders: "Shoulders",
      arms: "Arms",
      full_body: "Full Body",
      rest: "Rest",
      other: "Other",
    };
    const liftSplitOrder = ["push", "pull", "legs", "shoulders", "arms", "full_body", "rest", "other"];
    const liftSplitCounts = liftSplitOrder.map((key) => {
      const count = allWorkouts.filter((workout) => workout.lift_split === key).length;
      return {
        key,
        label: liftSplitLabels[key] ?? key,
        count,
      };
    });
    const liftSplitMax = Math.max(1, ...liftSplitCounts.map((item) => item.count));

    const broadFocusCounts = [
      {
        label: "Upper",
        count: allWorkouts.filter((workout) =>
          ["push", "pull", "shoulders", "arms"].includes(workout.lift_split),
        ).length,
      },
      {
        label: "Lower",
        count: allWorkouts.filter((workout) => workout.lift_split === "legs").length,
      },
      {
        label: "Full Body",
        count: allWorkouts.filter((workout) => workout.lift_split === "full_body").length,
      },
      {
        label: "Rest",
        count: allWorkouts.filter((workout) => workout.lift_split === "rest").length,
      },
      {
        label: "Other",
        count: allWorkouts.filter((workout) => workout.lift_split === "other").length,
      },
    ];

    const cardioWorkouts = allWorkouts.filter((workout) => workout.cardio_done);
    const cardioMilesTotal = cardioWorkouts.reduce((sum, workout) => sum + (workout.cardio_distance_miles ?? 0), 0);
    const cardioMinutesTotal = cardioWorkouts.reduce((sum, workout) => sum + (workout.cardio_duration_minutes ?? 0), 0);
    const cardioSessionsWithDuration = cardioWorkouts.filter(
      (workout) => typeof workout.cardio_duration_minutes === "number",
    ).length;
    const avgSessionLength =
      cardioSessionsWithDuration > 0 ? cardioMinutesTotal / cardioSessionsWithDuration : null;

    const cardioWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const cardioThisWeek = cardioWorkouts.filter((workout) => {
      const workoutDate = toDate(workout.date);
      return workoutDate >= cardioWeekStart && workoutDate <= now;
    });
    const cardioMilesThisWeek = cardioThisWeek.reduce(
      (sum, workout) => sum + (workout.cardio_distance_miles ?? 0),
      0,
    );
    const cardioMinutesThisWeek = cardioThisWeek.reduce(
      (sum, workout) => sum + (workout.cardio_duration_minutes ?? 0),
      0,
    );
    const cardioDailyVolume = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      const dayMatches = cardioWorkouts.filter(
        (workout) => toDate(workout.date).toDateString() === day.toDateString(),
      );
      return {
        label: formatWeekdayShort(day),
        sublabel: formatMonthDayShort(day),
        workouts: dayMatches.length,
        miles: dayMatches.reduce((sum, workout) => sum + (workout.cardio_distance_miles ?? 0), 0),
        minutes: dayMatches.reduce((sum, workout) => sum + (workout.cardio_duration_minutes ?? 0), 0),
      };
    });
    const cardioDailyPeak = Math.max(1, ...cardioDailyVolume.map((item) => item.workouts));

    return (
      <main>
        <header className="page-header">
          <h1>All Workout Entries</h1>
          <p>Complete history of recorded workouts.</p>
        </header>
        <section className="section">
          <button type="button" className="ghost" onClick={() => setView("dashboard")}>
            Back to Dashboard
          </button>
          <section className="workout-analytics">
            <div className="workout-analytics-header">
              <div>
                <span className="insights-kicker">Workout Analytics</span>
                <h3 style={{ margin: "6px 0 0" }}>Training breakdown</h3>
              </div>
              <div className="analytics-summary-chip">
                <span>Total workouts</span>
                <strong>{allWorkouts.length}</strong>
              </div>
            </div>

            <div className="workout-analytics-grid">
              <article className="analytics-panel analytics-panel-wide">
                <div className="analytics-panel-title">
                  <h4>Lift Split Analysis</h4>
                  <span>Raw split counts and broader focus buckets</span>
                </div>

                <div className="analytics-list">
                  {liftSplitCounts.map((item) => (
                    <div className="analytics-row" key={item.key}>
                      <div className="analytics-row-label">
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="analytics-bar-track">
                        <div
                          className="analytics-bar-fill analytics-bar-fill-blue"
                          style={{ width: `${(item.count / liftSplitMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="focus-chip-row">
                  {broadFocusCounts.map((item) => (
                    <div className="focus-chip" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                      <em>{allWorkouts.length > 0 ? Math.round((item.count / allWorkouts.length) * 100) : 0}%</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="analytics-panel analytics-panel-wide">
                <div className="analytics-panel-title">
                  <h4>Cardio Analytics</h4>
                  <span>All cardio plus current 7-day volume</span>
                </div>

                <div className="cardio-kpi-grid">
                  <div className="kpi-card">
                    <span>Cardio sessions</span>
                    <strong>{cardioWorkouts.length}</strong>
                  </div>
                  <div className="kpi-card">
                    <span>Total miles</span>
                    <strong>{cardioMilesTotal.toFixed(1)}</strong>
                  </div>
                  <div className="kpi-card">
                    <span>Total minutes</span>
                    <strong>{cardioMinutesTotal}</strong>
                  </div>
                  <div className="kpi-card">
                    <span>Avg session length</span>
                    <strong>{avgSessionLength !== null ? `${avgSessionLength.toFixed(1)} min` : "--"}</strong>
                  </div>
                </div>

                <div className="cardio-weekly-strip">
                  <div className="cardio-weekly-strip-head">
                    <span>Weekly Cardio Volume</span>
                    <strong>
                      {cardioMilesThisWeek.toFixed(1)} mi / {cardioMinutesThisWeek} min
                    </strong>
                  </div>
                  <div className="cardio-weekly-bars">
                    {cardioDailyVolume.map((item) => (
                      <div className="cardio-day" key={`${item.label}-${item.sublabel}`}>
                        <span className="cardio-day-label">{item.label}</span>
                        <div className="cardio-day-bar-track" title={`${item.sublabel}: ${item.workouts} workouts`}>
                          <div
                            className="cardio-day-bar-fill"
                            style={{ height: `${(item.workouts / cardioDailyPeak) * 100}%` }}
                          />
                        </div>
                        <span className="cardio-day-meta">{item.workouts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Lift Split</th>
                  <th>Secondary</th>
                  <th>Cardio</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {allWorkouts.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.name}</td>
                    <td>{entry.date}</td>
                    <td>{entry.lift_split}</td>
                    <td>{entry.secondary_muscle_group ?? "-"}</td>
                    <td>
                      {entry.cardio_done
                        ? `${entry.cardio_type ?? "cardio"} (${entry.cardio_distance_miles ?? "-"} mi / ${entry.cardio_duration_minutes ?? "-"} min)`
                        : "No"}
                    </td>
                    <td>{entry.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="page-header">
        <h1>Fitness Tracker</h1>
        <p>Track your weight and workouts with a cleaner daily flow.</p>
      </header>

      <section className="summary-grid">
        <article className="summary-card">
          <span>Latest Weight</span>
          <strong>{latestWeight !== null ? `${latestWeight} lbs` : "--"}</strong>
        </article>
        <article className="summary-card">
          <span>Workouts Last 7 Days</span>
          <strong>{workoutsLastWeek}</strong>
        </article>
        <article className="summary-card">
          <span>Last Split</span>
          <strong>{latestWorkoutSplit ?? "--"}</strong>
        </article>
      </section>

      <div className="layout">
        <section className="section">
          <h2>Weight Tracker</h2>
          <button type="button" className="ghost" onClick={() => setView("all_weights")}>
            View All Weights Table
          </button>
          <form onSubmit={onWeightSubmit}>
            <label>Name</label>
            <input value={weightForm.name} onChange={(e) => setWeightForm({ ...weightForm, name: e.target.value })} required />
            <label>Date (mm-dd-yyyy)</label>
            <input value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} required />
            <label>Weight (lbs)</label>
            <input type="number" step="0.1" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })} required />
            <button type="submit">Add Weight</button>
          </form>
          {weightError ? <p className="error-text">{weightError}</p> : null}
          {weightSuccess ? <p className="success-text">{weightSuccess}</p> : null}

          <h3>Recent Weight Entries</h3>
          {recentWeights.map((entry) => (
            <div className="entry" key={entry.id}>
              <div className="entry-top">
                <strong>{entry.name}</strong>
                <span>{entry.date}</span>
              </div>
              <p>{entry.weight} lbs</p>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  void deleteWeight(entry.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </section>

        <section className="section">
          <h2>Workout Tracker</h2>
          <button type="button" className="ghost" onClick={() => setView("all_workouts")}>
            View All Workouts Table
          </button>
          <section className="workout-insights" aria-label="Workout consistency summary">
            <div className="workout-insights-header">
              <div>
                <span className="insights-kicker">Workout Consistency</span>
                <h3 style={{ margin: "6px 0 0" }}>{formatMonthLabel(now)}</h3>
              </div>
              <div className="workout-insight-chip">
                <span>This week</span>
                <strong>{workoutsLastWeek}</strong>
              </div>
            </div>

            <div className="workout-stats-grid">
              <article className="workout-stat-card">
                <span>Workouts This Week</span>
                <strong>{workoutsLastWeek}</strong>
              </article>
              <article className="workout-stat-card">
                <span>Workouts This Month</span>
                <strong>{workoutsThisMonth}</strong>
              </article>
              <article className="workout-stat-card">
                <span>Current Streak</span>
                <strong>{workoutStreaks.currentStreak} days</strong>
              </article>
              <article className="workout-stat-card">
                <span>Longest Streak</span>
                <strong>{workoutStreaks.longestStreak} days</strong>
              </article>
            </div>

            <div className="workout-heatmap">
              <div className="workout-heatmap-legend">
                <span>0 = no workout</span>
                <span>1 = workout present</span>
              </div>
              <div className="calendar-weekdays" aria-hidden="true">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>
              <div className="calendar-grid" role="grid" aria-label={`Workout heatmap for ${formatMonthLabel(now)}`}>
                {monthGrid.map((cell) => {
                  if (!cell.date) {
                    return <div className="calendar-cell calendar-cell-empty" key={cell.key} aria-hidden="true" />;
                  }

                  const dayKey = `${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(
                    cell.date.getDate(),
                  ).padStart(2, "0")}-${cell.date.getFullYear()}`;
                  const hasWorkout = workoutDatesThisMonth.has(dayKey);
                  const isToday = cell.date.toDateString() === now.toDateString();

                  return (
                    <div
                      className={[
                        "calendar-cell",
                        hasWorkout ? "calendar-cell-active" : "calendar-cell-inactive",
                        isToday ? "calendar-cell-today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={cell.key}
                      role="gridcell"
                      aria-label={`${formatCalendarDay(cell.date)}: ${hasWorkout ? "workout present" : "no workout"}`}
                      title={`${formatCalendarDay(cell.date)}: ${hasWorkout ? "workout present" : "no workout"}`}
                    >
                      <span className="calendar-day-number">{formatCalendarDay(cell.date)}</span>
                      <strong>{hasWorkout ? "1" : "0"}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <form onSubmit={onWorkoutSubmit}>
            <label>Name</label>
            <input value={workoutForm.name} onChange={(e) => setWorkoutForm({ ...workoutForm, name: e.target.value })} required />
            <label>Date (mm-dd-yyyy)</label>
            <input value={workoutForm.date} onChange={(e) => setWorkoutForm({ ...workoutForm, date: e.target.value })} required />
            <label>Lift Split</label>
            <select value={workoutForm.lift_split} onChange={(e) => setWorkoutForm({ ...workoutForm, lift_split: e.target.value })}>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="legs">Legs</option>
              <option value="shoulders">Shoulders</option>
              <option value="arms">Arms</option>
              <option value="full_body">Full Body</option>
              <option value="rest">Rest</option>
              <option value="other">Other</option>
            </select>
            <label>Secondary Muscle Group</label>
            <select value={workoutForm.secondary_muscle_group ?? ""} onChange={(e) => setWorkoutForm({ ...workoutForm, secondary_muscle_group: e.target.value })}>
              <option value="">None</option>
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="legs">Legs</option>
              <option value="shoulders">Shoulders</option>
              <option value="arms">Arms</option>
              <option value="full_body">Full Body</option>
              <option value="rest">Rest</option>
              <option value="other">Other</option>
              <option value="biceps">Biceps</option>
              <option value="triceps">Triceps</option>
            </select>
            <label>Cardio Done?</label>
            <select value={workoutForm.cardio_done} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_done: e.target.value })}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
            <label>Cardio Type</label>
            <select value={workoutForm.cardio_type} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_type: e.target.value })}>
              <option value="">Select</option>
              <option value="running">Running</option>
              <option value="biking">Biking</option>
              <option value="swimming">Swimming</option>
              <option value="sports">Sports</option>
            </select>
            <label>Cardio Distance (miles)</label>
            <input type="number" step="0.1" value={workoutForm.cardio_distance_miles} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_distance_miles: e.target.value })} />
            <label>Cardio Duration (minutes)</label>
            <input type="number" value={workoutForm.cardio_duration_minutes} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_duration_minutes: e.target.value })} />
            <button type="submit">Add Workout</button>
          </form>
          {workoutError ? <p className="error-text">{workoutError}</p> : null}
          {workoutSuccess ? <p className="success-text">{workoutSuccess}</p> : null}

          <h3>Recent Workouts</h3>
          {recentWorkouts.map((workout) => (
            <div className="entry" key={workout.id}>
              <div className="entry-top">
                <strong>{workout.name}</strong>
                <span>{workout.date}</span>
              </div>
              <p>
                {workout.lift_split}
                {workout.secondary_muscle_group ? ` / ${workout.secondary_muscle_group}` : ""}
              </p>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  void deleteWorkout(workout.id);
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

export default App;
