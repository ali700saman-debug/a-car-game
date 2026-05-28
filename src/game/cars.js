export const CARS = [
  {
    id: "coupe",
    name: "Sport Coupe",
    desc: "Fast, sharp handling",
    stats: { maxFwd: 80, maxRev: 22, accel: 19.0, brake: 26.0, drag: 3.05, turnRateDeg: 146 },
    visuals: { defaultColorId: "blue", accent: 0x0f1422, glass: 0x0b1426, kind: "coupe" },
  },
  {
    id: "sedan",
    name: "Luxury Sedan",
    desc: "Balanced, stable at speed",
    stats: { maxFwd: 74, maxRev: 20, accel: 16.8, brake: 25.0, drag: 3.25, turnRateDeg: 134 },
    visuals: { defaultColorId: "silver", accent: 0x0f1422, glass: 0x0b1426, kind: "sedan" },
  },
  {
    id: "muscle",
    name: "Muscle Car",
    desc: "Powerful accel, heavier handling",
    stats: { maxFwd: 76, maxRev: 21, accel: 20.0, brake: 26.0, drag: 3.55, turnRateDeg: 124 },
    visuals: { defaultColorId: "red", accent: 0x0f1422, glass: 0x0b1426, kind: "muscle" },
  },
  {
    id: "suv",
    name: "SUV",
    desc: "Strong, stable, heavier feel",
    stats: { maxFwd: 66, maxRev: 18, accel: 15.8, brake: 25.0, drag: 3.9, turnRateDeg: 118 },
    visuals: { defaultColorId: "green", accent: 0x101622, glass: 0x0b1426, kind: "suv" },
  },
  {
    id: "supercar",
    name: "Supercar",
    desc: "Fastest top speed, sensitive handling",
    stats: { maxFwd: 86, maxRev: 22, accel: 21.0, brake: 28.0, drag: 3.15, turnRateDeg: 152 },
    visuals: { defaultColorId: "yellow", accent: 0x0f1422, glass: 0x0b1426, kind: "supercar" },
  },
  {
    id: "bike",
    name: "Sport Motorcycle",
    desc: "Very agile, light and quick",
    stats: { maxFwd: 78, maxRev: 18, accel: 22.0, brake: 29.0, drag: 2.85, turnRateDeg: 176 },
    visuals: { defaultColorId: "purple", accent: 0x0f1422, glass: 0x0b1426, kind: "bike" },
  },
  {
    id: "tank",
    name: "Heavy Vehicle",
    desc: "Slow, heavy, unstoppable vibes",
    stats: { maxFwd: 44, maxRev: 14, accel: 10.5, brake: 18.0, drag: 4.8, turnRateDeg: 86 },
    visuals: { defaultColorId: "green", accent: 0x111827, glass: 0x0b1426, kind: "tank" },
  },
];

export function getCarById(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

