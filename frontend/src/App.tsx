import { useEffect, useState } from "react";
import type { FormEvent } from "react";

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

function App() {
  const [view, setView] = useState<"dashboard" | "all_weights" | "all_workouts">("dashboard");
  const [weights, setWeights] = useState<Weight[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [weightError, setWeightError] = useState("");
  const [workoutError, setWorkoutError] = useState("");

  const [weightForm, setWeightForm] = useState({ name: "", date: todayDateString(), weight: "" });
  const [workoutForm, setWorkoutForm] = useState({
    name: "",
    date: todayDateString(),
    lift_split: "push",
    secondary_muscle_group: "",
    cardio_done: "false",
    cardio_type: "",
    cardio_distance_miles: "",
    cardio_duration_minutes: "",
  });

  async function loadWeights() {
    const response = await fetch(`${API_BASE}/weights`);
    const data = await response.json();
    setWeights(data.weights ?? []);
  }

  async function loadWorkouts() {
    const response = await fetch(`${API_BASE}/workouts`);
    const data = await response.json();
    setWorkouts(data.workouts ?? []);
  }

  async function onWeightSubmit(e: FormEvent) {
    e.preventDefault();
    setWeightError("");
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
    await loadWeights();
  }

  async function deleteWeight(id: number) {
    await fetch(`${API_BASE}/weights/${id}`, { method: "DELETE" });
    await loadWeights();
  }

  async function onWorkoutSubmit(e: FormEvent) {
    e.preventDefault();
    setWorkoutError("");
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
    await loadWorkouts();
  }

  async function deleteWorkout(id: number) {
    await fetch(`${API_BASE}/workouts/${id}`, { method: "DELETE" });
    await loadWorkouts();
  }

  useEffect(() => {
    void loadWeights();
    void loadWorkouts();
  }, []);

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

  if (view === "all_weights") {
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
                {allWeights.map((entry) => (
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
        </section>
      </main>
    );
  }

  if (view === "all_workouts") {
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
        <h1>Life Tracker</h1>
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
            <input value={workoutForm.secondary_muscle_group} onChange={(e) => setWorkoutForm({ ...workoutForm, secondary_muscle_group: e.target.value })} />
            <label>Cardio Done?</label>
            <select value={workoutForm.cardio_done} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_done: e.target.value })}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
            <label>Cardio Type</label>
            <input value={workoutForm.cardio_type} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_type: e.target.value })} />
            <label>Cardio Distance (miles)</label>
            <input type="number" step="0.1" value={workoutForm.cardio_distance_miles} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_distance_miles: e.target.value })} />
            <label>Cardio Duration (minutes)</label>
            <input type="number" value={workoutForm.cardio_duration_minutes} onChange={(e) => setWorkoutForm({ ...workoutForm, cardio_duration_minutes: e.target.value })} />
            <button type="submit">Add Workout</button>
          </form>
          {workoutError ? <p className="error-text">{workoutError}</p> : null}

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
