// Hand-picked, well-known gym exercises from the dataset. The generator only
// builds plans from these so you get familiar movements, not obscure variants.
//
// tier 1 = most stable / easiest to learn (machines, cables, supported moves)
// tier 2 = free weights that need some balance and technique
// tier 3 = technical barbell lifts and advanced bodyweight moves
// mode "time" = logged by duration instead of reps
export type Staple = { id: string; tier: 1 | 2 | 3; mode?: "time" };

export const STRENGTH_STAPLES: Staple[] = [
  // Chest
  { id: "Machine_Bench_Press", tier: 1 },
  { id: "Leverage_Chest_Press", tier: 1 },
  { id: "Leverage_Incline_Chest_Press", tier: 1 },
  { id: "Butterfly", tier: 1 },
  { id: "Cable_Crossover", tier: 1 },
  { id: "Incline_Push-Up", tier: 1 },
  { id: "Dumbbell_Bench_Press", tier: 2 },
  { id: "Hammer_Grip_Incline_DB_Bench_Press", tier: 2 },
  { id: "Dumbbell_Flyes", tier: 2 },
  { id: "Pushups", tier: 2 },
  { id: "Barbell_Bench_Press_-_Medium_Grip", tier: 3 },
  { id: "Barbell_Incline_Bench_Press_-_Medium_Grip", tier: 3 },
  { id: "Dips_-_Chest_Version", tier: 3 },
  // Back
  { id: "Wide-Grip_Lat_Pulldown", tier: 1 },
  { id: "Close-Grip_Front_Lat_Pulldown", tier: 1 },
  { id: "Seated_Cable_Rows", tier: 1 },
  { id: "Leverage_High_Row", tier: 1 },
  { id: "Leverage_Iso_Row", tier: 1 },
  { id: "One_Arm_Lat_Pulldown", tier: 1 },
  { id: "One-Arm_Dumbbell_Row", tier: 2 },
  { id: "Dumbbell_Incline_Row", tier: 2 },
  { id: "Bent_Over_Barbell_Row", tier: 3 },
  { id: "T-Bar_Row_with_Handle", tier: 3 },
  { id: "Pullups", tier: 3 },
  { id: "Chin-Up", tier: 3 },
  { id: "Hyperextensions_Back_Extensions", tier: 1 },
  { id: "Superman", tier: 1 },
  { id: "Barbell_Deadlift", tier: 3 },
  // Traps
  { id: "Dumbbell_Shrug", tier: 1 },
  { id: "Cable_Shrugs", tier: 1 },
  { id: "Barbell_Shrug", tier: 2 },
  // Shoulders
  { id: "Machine_Shoulder_Military_Press", tier: 1 },
  { id: "Leverage_Shoulder_Press", tier: 1 },
  { id: "Cable_Seated_Lateral_Raise", tier: 1 },
  { id: "Reverse_Machine_Flyes", tier: 1 },
  { id: "Cable_Rear_Delt_Fly", tier: 1 },
  { id: "Seated_Side_Lateral_Raise", tier: 1 },
  { id: "Side_Lateral_Raise", tier: 2 },
  { id: "Dumbbell_Shoulder_Press", tier: 2 },
  { id: "Face_Pull", tier: 2 },
  { id: "Reverse_Flyes", tier: 2 },
  { id: "Front_Incline_Dumbbell_Raise", tier: 2 },
  { id: "Arnold_Dumbbell_Press", tier: 3 },
  { id: "Barbell_Shoulder_Press", tier: 3 },
  // Biceps
  { id: "Machine_Bicep_Curl", tier: 1 },
  { id: "Machine_Preacher_Curls", tier: 1 },
  { id: "Cable_Hammer_Curls_-_Rope_Attachment", tier: 1 },
  { id: "Dumbbell_Bicep_Curl", tier: 1 },
  { id: "Hammer_Curls", tier: 1 },
  { id: "Dumbbell_Alternate_Bicep_Curl", tier: 2 },
  { id: "Preacher_Curl", tier: 2 },
  { id: "Flexor_Incline_Dumbbell_Curls", tier: 2 },
  // Triceps
  { id: "Triceps_Pushdown", tier: 1 },
  { id: "Triceps_Pushdown_-_Rope_Attachment", tier: 1 },
  { id: "Machine_Triceps_Extension", tier: 1 },
  { id: "Dip_Machine", tier: 1 },
  { id: "Cable_Rope_Overhead_Triceps_Extension", tier: 2 },
  { id: "Tricep_Dumbbell_Kickback", tier: 2 },
  { id: "Bench_Dips", tier: 2 },
  { id: "EZ-Bar_Skullcrusher", tier: 3 },
  { id: "Close-Grip_Barbell_Bench_Press", tier: 3 },
  // Forearms
  { id: "Seated_Dumbbell_Palms-Up_Wrist_Curl", tier: 1 },
  { id: "Seated_Dumbbell_Palms-Down_Wrist_Curl", tier: 1 },
  { id: "Farmers_Walk", tier: 2 },
  // Quads
  { id: "Leg_Press", tier: 1 },
  { id: "Leg_Extensions", tier: 1 },
  { id: "Hack_Squat", tier: 1 },
  { id: "Bodyweight_Squat", tier: 1 },
  { id: "Goblet_Squat", tier: 2 },
  { id: "Dumbbell_Lunges", tier: 2 },
  { id: "Split_Squat_with_Dumbbells", tier: 2 },
  { id: "Smith_Single-Leg_Split_Squat", tier: 2 },
  { id: "Barbell_Squat", tier: 3 },
  { id: "Barbell_Walking_Lunge", tier: 3 },
  // Hamstrings
  { id: "Seated_Leg_Curl", tier: 1 },
  { id: "Lying_Leg_Curls", tier: 1 },
  { id: "Standing_Leg_Curl", tier: 1 },
  { id: "Romanian_Deadlift", tier: 3 },
  { id: "Kettlebell_One-Legged_Deadlift", tier: 3 },
  // Glutes
  { id: "Butt_Lift_Bridge", tier: 1 },
  { id: "Single_Leg_Glute_Bridge", tier: 1 },
  { id: "Glute_Kickback", tier: 1 },
  { id: "Step-up_with_Knee_Raise", tier: 2 },
  { id: "One-Legged_Cable_Kickback", tier: 2 },
  { id: "Barbell_Glute_Bridge", tier: 2 },
  { id: "Barbell_Hip_Thrust", tier: 3 },
  // Hips
  { id: "Thigh_Adductor", tier: 1 },
  { id: "Thigh_Abductor", tier: 1 },
  // Calves
  { id: "Seated_Calf_Raise", tier: 1 },
  { id: "Standing_Calf_Raises", tier: 1 },
  { id: "Calf_Press_On_The_Leg_Press_Machine", tier: 1 },
  { id: "Smith_Machine_Calf_Raise", tier: 2 },
  // Core (stability work: great for feeling less shaky)
  { id: "Plank", tier: 1, mode: "time" },
  { id: "Dead_Bug", tier: 1 },
  { id: "Pallof_Press", tier: 1 },
  { id: "Cable_Crunch", tier: 1 },
  { id: "Side_Bridge", tier: 1, mode: "time" },
  { id: "Flat_Bench_Lying_Leg_Raise", tier: 1 },
  { id: "Crunches", tier: 1 },
  { id: "Knee_Hip_Raise_On_Parallel_Bars", tier: 2 },
  { id: "Cable_Russian_Twists", tier: 2 },
  { id: "Russian_Twist", tier: 2 },
  { id: "Ab_Roller", tier: 3 },
  { id: "Hanging_Leg_Raise", tier: 3 },
];

export const CARDIO = {
  warmup: ["Bicycling_Stationary", "Walking_Treadmill", "Elliptical_Trainer", "Rowing_Stationary"],
  finisher: ["Walking_Treadmill", "Bicycling_Stationary", "Rowing_Stationary", "Stairmaster", "Elliptical_Trainer"],
};

// Dynamic warm-up moves, picked by body region
export const WARMUP_MOVES = {
  upper: ["Arm_Circles", "Round_The_World_Shoulder_Stretch", "Cat_Stretch"],
  lower: ["Standing_Hip_Circles", "Bodyweight_Squat", "Inchworm", "Knee_Circles"],
  full: ["Arm_Circles", "Standing_Hip_Circles", "Inchworm", "Cat_Stretch"],
};

// Static cool-down stretches mapped to the muscle they target
export const STRETCHES: { id: string; muscle: string }[] = [
  { id: "Chest_And_Front_Of_Shoulder_Stretch", muscle: "chest" },
  { id: "Dynamic_Chest_Stretch", muscle: "chest" },
  { id: "Shoulder_Stretch", muscle: "shoulders" },
  { id: "Triceps_Stretch", muscle: "triceps" },
  { id: "One_Arm_Against_Wall", muscle: "lats" },
  { id: "Spinal_Stretch", muscle: "middle back" },
  { id: "Childs_Pose", muscle: "lower back" },
  { id: "Hug_Knees_To_Chest", muscle: "lower back" },
  { id: "Kneeling_Hip_Flexor", muscle: "quadriceps" },
  { id: "On_Your_Side_Quad_Stretch", muscle: "quadriceps" },
  { id: "Hamstring_Stretch", muscle: "hamstrings" },
  { id: "Seated_Floor_Hamstring_Stretch", muscle: "hamstrings" },
  { id: "Knee_Across_The_Body", muscle: "glutes" },
  { id: "Ankle_On_The_Knee", muscle: "glutes" },
  { id: "Side_Lying_Groin_Stretch", muscle: "adductors" },
  { id: "Calf_Stretch_Hands_Against_Wall", muscle: "calves" },
  { id: "Kneeling_Forearm_Stretch", muscle: "forearms" },
  { id: "Side_Neck_Stretch", muscle: "neck" },
  { id: "Side_Neck_Stretch", muscle: "traps" },
  { id: "Cat_Stretch", muscle: "abdominals" },
];

export const TIME_BASED = new Set<string>([
  ...STRENGTH_STAPLES.filter((s) => s.mode === "time").map((s) => s.id),
  ...CARDIO.warmup,
  ...CARDIO.finisher,
  ...STRETCHES.map((s) => s.id),
  ...WARMUP_MOVES.upper,
  ...WARMUP_MOVES.lower,
  ...WARMUP_MOVES.full,
]);
// Reps make more sense than time for these warm-up moves
TIME_BASED.delete("Bodyweight_Squat");
TIME_BASED.delete("Inchworm");
