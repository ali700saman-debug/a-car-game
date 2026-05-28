export const CITY = {
  id: "CITY",
  name: "Free Drive City",
  bounds: { x: 1200, z: 1200, yMin: -10 },
  spawn: { x: 0, y: 1.0, z: 0, yaw: 0.0 },
};

// Optional challenge definitions (re-use existing challenges list for now)
export const CHALLENGES = [
  {
    id: "C1",
    name: "Checkpoint Run",
    timeLimitMs: 70_000,
    maxHits: 10,
    objective: "Reach checkpoints",
  },
  {
    id: "C2",
    name: "Parking Spot",
    timeLimitMs: 80_000,
    maxHits: 8,
    objective: "Park in the marked zone",
  },
  {
    id: "C3",
    name: "Traffic Weave",
    timeLimitMs: 75_000,
    maxHits: 7,
    objective: "Avoid traffic and park",
  },
  {
    id: "C4",
    name: "Time Trial",
    timeLimitMs: 65_000,
    maxHits: 8,
    objective: "Fast run, few hits",
  },
  {
    id: "C5",
    name: "Final Route",
    timeLimitMs: 85_000,
    maxHits: 6,
    objective: "Clear route + park",
  },
];

