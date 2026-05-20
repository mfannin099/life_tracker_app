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

function App() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const [weightForm, setWeightForm] = useState({ name: "", date: "", weight: "" });
  const [workoutForm, setWorkoutForm] = useState({
    name: "",
    date: "",
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
    await fetch(`${API_BASE}/weights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: weightForm.name,
        date: weightForm.date,
        weight: Number(weightForm.weight),
      }),
    });
    await loadWeights();
  }

  async function deleteWeight(id: number) {
    await fetch(`${API_BASE}/weights/${id}`, { method: "DELETE" });
    await loadWeights();
  }

  async function onWorkoutSubmit(e: FormEvent) {
    e.preventDefault();
    const cardioDone = workoutForm.cardio_done === "true";

    await fetch(`${API_BASE}/workouts`, {
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

  return (
    <main>
      <h1>Life Tracker Application</h1>
      <div className="layout">
        <section className="section">
          <h2>Weight Tracker</h2>
          <form onSubmit={onWeightSubmit}>
            <label>Name</label>
            <input value={weightForm.name} onChange={(e) => setWeightForm({ ...weightForm, name: e.target.value })} required />
            <label>Date (mm-dd-yyyy)</label>
            <input value={weightForm.date} onChange={(e) => setWeightForm({ ...weightForm, date: e.target.value })} required />
            <label>Weight (lbs)</label>
            <input type="number" step="0.1" value={weightForm.weight} onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })} required />
            <button type="submit">Add Weight</button>
          </form>

          <h3>Recent Weight Entries</h3>
          {weights.map((entry) => (
            <div className="entry" key={entry.id}>
              <strong>{entry.name}</strong> - {entry.date}: {entry.weight} lbs
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

          <h3>Recent Workouts</h3>
          {workouts.map((workout) => (
            <div className="entry" key={workout.id}>
              <strong>{workout.name}</strong> - {workout.date}
              <br />
              Split: {workout.lift_split}
              {workout.secondary_muscle_group ? ` (${workout.secondary_muscle_group})` : ""}
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
