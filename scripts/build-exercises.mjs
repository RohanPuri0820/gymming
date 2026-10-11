// Downloads free-exercise-db (public domain, github.com/yuhonas/free-exercise-db)
// and writes a trimmed copy to public/exercises.json.
// Run: node scripts/build-exercises.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const SRC =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

const res = await fetch(SRC);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const raw = await res.json();

const out = raw.map((e) => ({
  id: e.id,
  name: e.name,
  level: e.level,
  mechanic: e.mechanic ?? null,
  equipment: e.equipment ?? "body only",
  category: e.category,
  force: e.force ?? null,
  primary: e.primaryMuscles,
  secondary: e.secondaryMuscles,
  instructions: e.instructions,
  images: e.images,
}));

mkdirSync("public", { recursive: true });
writeFileSync("public/exercises.json", JSON.stringify(out));
console.log(`Wrote ${out.length} exercises to public/exercises.json`);
