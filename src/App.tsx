import { useState, useEffect, useRef, useCallback } from "react";
import "./game.css";

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen = "home" | "tutorial" | "game" | "results";
type Level = 1 | 2 | 3;
type StepId =
  | "distribute"
  | "combine_left"
  | "combine_right"
  | "move_vars"
  | "move_consts"
  | "divide";

interface Equation {
  display: string;
  answer: number;
  steps: Step[];
  hint: string;
  level: Level;
  type: "one_side" | "both_sides" | "distribution";
}

interface Step {
  id: StepId;
  instruction: string;
  expression: string;
  explanation: string;
}

interface GameState {
  level: Level;
  score: number;
  streak: number;
  maxStreak: number;
  hearts: number;
  questionIndex: number;
  totalQuestions: number;
  answeredCorrect: number;
  answeredWrong: number;
  timeLeft: number;
  xp: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  life: number;
  shape: "circle" | "star" | "square";
}

// ─── Equation Bank ────────────────────────────────────────────────────────────
const EQUATIONS: Equation[] = [
  // Level 1 – Variables on one side
  {
    level: 1,
    type: "one_side",
    display: "2x + 5 = 13",
    answer: 4,
    hint: "Subtract 5 from both sides first, then divide by 2.",
    steps: [
      { id: "move_consts", instruction: "Subtract 5 from both sides", expression: "2x + 5 − 5 = 13 − 5", explanation: "We remove the constant from the variable side." },
      { id: "combine_right", instruction: "Simplify both sides", expression: "2x = 8", explanation: "5 − 5 = 0 and 13 − 5 = 8" },
      { id: "divide", instruction: "Divide both sides by 2", expression: "x = 4", explanation: "2x ÷ 2 = x and 8 ÷ 2 = 4" },
    ],
  },
  {
    level: 1,
    type: "one_side",
    display: "3x − 7 = 11",
    answer: 6,
    hint: "Add 7 to both sides first, then divide by 3.",
    steps: [
      { id: "move_consts", instruction: "Add 7 to both sides", expression: "3x − 7 + 7 = 11 + 7", explanation: "We remove the constant by doing the inverse operation." },
      { id: "combine_right", instruction: "Simplify", expression: "3x = 18", explanation: "−7 + 7 = 0 and 11 + 7 = 18" },
      { id: "divide", instruction: "Divide both sides by 3", expression: "x = 6", explanation: "18 ÷ 3 = 6" },
    ],
  },
  {
    level: 1,
    type: "one_side",
    display: "5x + 3 = 28",
    answer: 5,
    hint: "Subtract 3 first, then divide by 5.",
    steps: [
      { id: "move_consts", instruction: "Subtract 3 from both sides", expression: "5x = 25", explanation: "28 − 3 = 25" },
      { id: "divide", instruction: "Divide both sides by 5", expression: "x = 5", explanation: "25 ÷ 5 = 5" },
    ],
  },
  {
    level: 1,
    type: "one_side",
    display: "4x − 12 = 0",
    answer: 3,
    hint: "Add 12 to both sides first.",
    steps: [
      { id: "move_consts", instruction: "Add 12 to both sides", expression: "4x = 12", explanation: "0 + 12 = 12" },
      { id: "divide", instruction: "Divide both sides by 4", expression: "x = 3", explanation: "12 ÷ 4 = 3" },
    ],
  },
  // Level 2 – Variables on both sides
  {
    level: 2,
    type: "both_sides",
    display: "5x + 2 = 3x + 10",
    answer: 4,
    hint: "Move x terms to one side by subtracting 3x from both sides.",
    steps: [
      { id: "move_vars", instruction: "Subtract 3x from both sides", expression: "5x − 3x + 2 = 10", explanation: "Collect variable terms on the left." },
      { id: "combine_left", instruction: "Combine like terms", expression: "2x + 2 = 10", explanation: "5x − 3x = 2x" },
      { id: "move_consts", instruction: "Subtract 2 from both sides", expression: "2x = 8", explanation: "10 − 2 = 8" },
      { id: "divide", instruction: "Divide both sides by 2", expression: "x = 4", explanation: "8 ÷ 2 = 4" },
    ],
  },
  {
    level: 2,
    type: "both_sides",
    display: "7x − 3 = 4x + 9",
    answer: 4,
    hint: "Move 4x to the left side first.",
    steps: [
      { id: "move_vars", instruction: "Subtract 4x from both sides", expression: "3x − 3 = 9", explanation: "7x − 4x = 3x" },
      { id: "move_consts", instruction: "Add 3 to both sides", expression: "3x = 12", explanation: "9 + 3 = 12" },
      { id: "divide", instruction: "Divide both sides by 3", expression: "x = 4", explanation: "12 ÷ 3 = 4" },
    ],
  },
  {
    level: 2,
    type: "both_sides",
    display: "6x + 1 = 2x + 17",
    answer: 4,
    hint: "Subtract 2x from both sides to group variables.",
    steps: [
      { id: "move_vars", instruction: "Subtract 2x from both sides", expression: "4x + 1 = 17", explanation: "6x − 2x = 4x" },
      { id: "move_consts", instruction: "Subtract 1 from both sides", expression: "4x = 16", explanation: "17 − 1 = 16" },
      { id: "divide", instruction: "Divide both sides by 4", expression: "x = 4", explanation: "16 ÷ 4 = 4" },
    ],
  },
  {
    level: 2,
    type: "both_sides",
    display: "9x − 5 = 5x + 11",
    answer: 4,
    hint: "Move 5x to the left and constants to the right.",
    steps: [
      { id: "move_vars", instruction: "Subtract 5x from both sides", expression: "4x − 5 = 11", explanation: "9x − 5x = 4x" },
      { id: "move_consts", instruction: "Add 5 to both sides", expression: "4x = 16", explanation: "11 + 5 = 16" },
      { id: "divide", instruction: "Divide by 4", expression: "x = 4", explanation: "16 ÷ 4 = 4" },
    ],
  },
  {
    level: 2,
    type: "both_sides",
    display: "3x + 14 = 8x − 6",
    answer: 4,
    hint: "Move 3x to the right side by subtracting it from both sides.",
    steps: [
      { id: "move_vars", instruction: "Subtract 3x from both sides", expression: "14 = 5x − 6", explanation: "8x − 3x = 5x" },
      { id: "move_consts", instruction: "Add 6 to both sides", expression: "20 = 5x", explanation: "14 + 6 = 20" },
      { id: "divide", instruction: "Divide both sides by 5", expression: "x = 4", explanation: "20 ÷ 5 = 4" },
    ],
  },
  // Level 3 – Distribution & multi-step
  {
    level: 3,
    type: "distribution",
    display: "2(x + 3) = x + 10",
    answer: 4,
    hint: "Distribute first: 2(x+3) = 2x + 6",
    steps: [
      { id: "distribute", instruction: "Distribute 2 on the left", expression: "2x + 6 = x + 10", explanation: "2 × x = 2x and 2 × 3 = 6" },
      { id: "move_vars", instruction: "Subtract x from both sides", expression: "x + 6 = 10", explanation: "2x − x = x" },
      { id: "move_consts", instruction: "Subtract 6 from both sides", expression: "x = 4", explanation: "10 − 6 = 4" },
    ],
  },
  {
    level: 3,
    type: "distribution",
    display: "3(2x − 1) = 2x + 13",
    answer: 4,
    hint: "Distribute 3 on the left side first.",
    steps: [
      { id: "distribute", instruction: "Distribute 3 on the left", expression: "6x − 3 = 2x + 13", explanation: "3 × 2x = 6x and 3 × (−1) = −3" },
      { id: "move_vars", instruction: "Subtract 2x from both sides", expression: "4x − 3 = 13", explanation: "6x − 2x = 4x" },
      { id: "move_consts", instruction: "Add 3 to both sides", expression: "4x = 16", explanation: "13 + 3 = 16" },
      { id: "divide", instruction: "Divide both sides by 4", expression: "x = 4", explanation: "16 ÷ 4 = 4" },
    ],
  },
  {
    level: 3,
    type: "distribution",
    display: "4(x + 1) = 2(x + 6)",
    answer: 4,
    hint: "Distribute on both sides first.",
    steps: [
      { id: "distribute", instruction: "Distribute on both sides", expression: "4x + 4 = 2x + 12", explanation: "4×x=4x, 4×1=4, 2×x=2x, 2×6=12" },
      { id: "move_vars", instruction: "Subtract 2x from both sides", expression: "2x + 4 = 12", explanation: "4x − 2x = 2x" },
      { id: "move_consts", instruction: "Subtract 4 from both sides", expression: "2x = 8", explanation: "12 − 4 = 8" },
      { id: "divide", instruction: "Divide both sides by 2", expression: "x = 4", explanation: "8 ÷ 2 = 4" },
    ],
  },
  {
    level: 3,
    type: "distribution",
    display: "5(x − 2) = 3(x + 2)",
    answer: 8,
    hint: "Distribute on both sides first.",
    steps: [
      { id: "distribute", instruction: "Distribute on both sides", expression: "5x − 10 = 3x + 6", explanation: "5×x=5x, 5×2=10, 3×x=3x, 3×2=6" },
      { id: "move_vars", instruction: "Subtract 3x from both sides", expression: "2x − 10 = 6", explanation: "5x − 3x = 2x" },
      { id: "move_consts", instruction: "Add 10 to both sides", expression: "2x = 16", explanation: "6 + 10 = 16" },
      { id: "divide", instruction: "Divide both sides by 2", expression: "x = 8", explanation: "16 ÷ 2 = 8" },
    ],
  },
];

const LEVEL_QUESTIONS = { 1: 4, 2: 5, 3: 4 };
const TIME_PER_QUESTION = { 1: 45, 2: 60, 3: 75 };

const COLORS = [
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF",
  "#C77DFF", "#FF9F1C", "#2EC4B6", "#E71D36",
];

// ─── Utility ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getEquationsForLevel(level: Level): Equation[] {
  const pool = EQUATIONS.filter((e) => e.level === level);
  return shuffle(pool).slice(0, LEVEL_QUESTIONS[level]);
}

function generateWrongAnswers(correct: number): number[] {
  const wrongs = new Set<number>();
  const offsets = [1, 2, 3, -1, -2, 5, -3, 4, -4, 6];
  shuffle(offsets).forEach((o) => {
    if (wrongs.size < 3 && correct + o !== correct) wrongs.add(correct + o);
  });
  return Array.from(wrongs);
}

// ─── Particle System ──────────────────────────────────────────────────────────
let particleIdCounter = 0;
function spawnParticles(count = 40): Particle[] {
  return Array.from({ length: count }, () => ({
    id: particleIdCounter++,
    x: 50 + (Math.random() - 0.5) * 30,
    y: 50 + (Math.random() - 0.5) * 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 14,
    speedX: (Math.random() - 0.5) * 6,
    speedY: -4 - Math.random() * 6,
    life: 1,
    shape: (["circle", "star", "square"] as const)[Math.floor(Math.random() * 3)],
  }));
}

// ─── Character Moods ──────────────────────────────────────────────────────────
type Mood = "idle" | "thinking" | "happy" | "sad" | "excited";
const MOOD_MESSAGES: Record<Mood, string[]> = {
  idle: ["Ready to solve equations! 🎯", "Let's do math! ✨", "Choose a level to begin! 🚀"],
  thinking: ["Hmm, think carefully… 🤔", "Remember the steps! 💡", "Take your time! ⏳"],
  happy: ["Fantastic! You're amazing! 🌟", "Correct! Math genius! 🏆", "Excellent work! Keep it up! 🎉"],
  sad: ["Oops! Let's try again! 💪", "Almost there! Don't give up! 😊", "Mistakes help us learn! 📚"],
  excited: ["🎊 LEVEL UP! 🎊", "You're on fire! 🔥", "Incredible streak! ⚡"],
};

function getMoodMessage(mood: Mood): string {
  const msgs = MOOD_MESSAGES[mood];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedLevel, setSelectedLevel] = useState<Level>(1);
  const [gameState, setGameState] = useState<GameState>({
    level: 1, score: 0, streak: 0, maxStreak: 0,
    hearts: 3, questionIndex: 0, totalQuestions: 4,
    answeredCorrect: 0, answeredWrong: 0, timeLeft: 45, xp: 0,
  });
  const [questions, setQuestions] = useState<Equation[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Equation | null>(null);
  const [choices, setChoices] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<"correct" | "wrong" | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mood, setMood] = useState<Mood>("idle");
  const [moodMessage, setMoodMessage] = useState(getMoodMessage("idle"));
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animatingScore, setAnimatingScore] = useState(false);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [characterBounce, setCharacterBounce] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const particleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Particle animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (particles.length === 0) return;
    particleRef.current = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.speedX * 0.5,
            y: p.y + p.speedY * 0.5,
            speedY: p.speedY + 0.2,
            life: p.life - 0.025,
          }))
          .filter((p) => p.life > 0)
      );
    }, 30);
    return () => { if (particleRef.current) clearInterval(particleRef.current); };
  }, [particles.length]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "game" || answerResult !== null) return;
    timerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeLeft <= 1) {
          handleTimeout();
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, answerResult, gameState.questionIndex]);

  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswerResult("wrong");
    setShakeWrong(true);
    setMood("sad");
    setMoodMessage(getMoodMessage("sad"));
    setGameState((prev) => ({
      ...prev,
      hearts: prev.hearts - 1,
      streak: 0,
      answeredWrong: prev.answeredWrong + 1,
    }));
    setTimeout(() => setShakeWrong(false), 600);
    setTimeout(() => advanceQuestion(), 2000);
  }, []);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = (level: Level) => {
    const qs = getEquationsForLevel(level);
    const q = qs[0];
    const wrong = generateWrongAnswers(q.answer);
    const allChoices = shuffle([q.answer, ...wrong]);
    setQuestions(qs);
    setCurrentQuestion(q);
    setChoices(allChoices);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setShowSteps(false);
    setShowHint(false);
    setMood("thinking");
    setMoodMessage(getMoodMessage("thinking"));
    setGameState({
      level,
      score: 0,
      streak: 0,
      maxStreak: 0,
      hearts: 3,
      questionIndex: 0,
      totalQuestions: qs.length,
      answeredCorrect: 0,
      answeredWrong: 0,
      timeLeft: TIME_PER_QUESTION[level],
      xp: 0,
    });
    setScreen("game");
  };

  // ── Answer handling ───────────────────────────────────────────────────────
  const handleAnswer = (choice: number) => {
    if (answerResult !== null || selectedAnswer !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(choice);

    if (choice === currentQuestion!.answer) {
      const timeBonus = Math.floor(gameState.timeLeft * 2);
      const streakBonus = gameState.streak >= 2 ? 50 * gameState.streak : 0;
      const points = 100 + timeBonus + streakBonus;
      const xp = 10 + Math.floor(timeBonus / 10);
      setAnswerResult("correct");
      setMood(gameState.streak >= 2 ? "excited" : "happy");
      setMoodMessage(getMoodMessage(gameState.streak >= 2 ? "excited" : "happy"));
      setParticles(spawnParticles(50));
      setAnimatingScore(true);
      setXpGained(xp);
      setCharacterBounce(true);
      setTimeout(() => setCharacterBounce(false), 800);
      setTimeout(() => setAnimatingScore(false), 1000);
      setTimeout(() => setXpGained(null), 1500);
      setGameState((prev) => ({
        ...prev,
        score: prev.score + points,
        streak: prev.streak + 1,
        maxStreak: Math.max(prev.maxStreak, prev.streak + 1),
        answeredCorrect: prev.answeredCorrect + 1,
        xp: prev.xp + xp,
      }));
      setTimeout(() => advanceQuestion(), 2000);
    } else {
      setAnswerResult("wrong");
      setShakeWrong(true);
      setMood("sad");
      setMoodMessage(getMoodMessage("sad"));
      setTimeout(() => setShakeWrong(false), 600);
      setGameState((prev) => ({
        ...prev,
        hearts: prev.hearts - 1,
        streak: 0,
        answeredWrong: prev.answeredWrong + 1,
      }));
      setTimeout(() => advanceQuestion(), 2200);
    }
  };

  const advanceQuestion = () => {
    setGameState((prev) => {
      const nextIndex = prev.questionIndex + 1;
      if (nextIndex >= prev.totalQuestions || prev.hearts <= 0) {
        setTimeout(() => setScreen("results"), 300);
        return prev;
      }
      const nextQ = questions[nextIndex];
      const wrong = generateWrongAnswers(nextQ.answer);
      const allChoices = shuffle([nextQ.answer, ...wrong]);
      setCurrentQuestion(nextQ);
      setChoices(allChoices);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setShowSteps(false);
      setShowHint(false);
      setMood("thinking");
      setMoodMessage(getMoodMessage("thinking"));
      return {
        ...prev,
        questionIndex: nextIndex,
        timeLeft: TIME_PER_QUESTION[prev.level],
      };
    });
  };

  // ── Tutorial steps ────────────────────────────────────────────────────────
  const TUTORIAL_SLIDES = [
    {
      title: "What is a Linear Equation?",
      icon: "📐",
      content: "A linear equation is an equation where the variable (like x) has no exponents. It forms a straight line when graphed.",
      example: "2x + 3 = 11",
      tip: "Goal: Find the value of x that makes both sides equal!",
    },
    {
      title: "The Balance Rule",
      icon: "⚖️",
      content: "Think of an equation as a balance scale. Whatever you do to one side, you MUST do to the other side to keep it balanced.",
      example: "2x + 5 = 13  →  2x = 8  →  x = 4",
      tip: "Inverse operations undo each other: + undone by −, × undone by ÷",
    },
    {
      title: "Variables on Both Sides",
      icon: "🔄",
      content: "When x appears on both sides, move ALL variable terms to one side and ALL constants to the other side.",
      example: "5x + 2 = 3x + 10\n5x − 3x = 10 − 2\n2x = 8 → x = 4",
      tip: "Move the smaller x-coefficient to avoid negative coefficients!",
    },
    {
      title: "Distribution First!",
      icon: "📦",
      content: "If you see parentheses with a multiplier, distribute (expand) FIRST before solving.",
      example: "2(x + 3) = x + 10\n2x + 6 = x + 10\nx = 4",
      tip: "Multiply EVERY term inside the parentheses by the number outside!",
    },
    {
      title: "How to Play AlgebraQuest",
      icon: "🎮",
      content: "Solve the equation shown, pick the correct value of x from 4 choices. Use hints and steps if you need help. Earn bonus points for speed and streaks!",
      example: "⭐ Speed Bonus + 🔥 Streak Bonus = Higher Score!",
      tip: "3 hearts per round – don't use them all!",
    },
  ];

  const timerPercent = currentQuestion
    ? (gameState.timeLeft / TIME_PER_QUESTION[gameState.level]) * 100
    : 100;
  const timerColor =
    timerPercent > 60 ? "#6BCB77" : timerPercent > 30 ? "#FFD93D" : "#FF6B6B";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="game-root">
      {/* Floating background math symbols */}
      <div className="bg-symbols" aria-hidden>
        {["2x+3=11", "÷", "x²", "=", "∑", "∞", "π", "√x", "ax+b", "≠"].map((s, i) => (
          <span key={i} className={`bg-sym bg-sym-${i}`}>{s}</span>
        ))}
      </div>

      {/* Particle layer */}
      <div className="particle-layer" aria-hidden>
        {particles.map((p) => (
          <div
            key={p.id}
            className={`particle particle-${p.shape}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.life,
              transform: `rotate(${p.life * 720}deg)`,
            }}
          />
        ))}
      </div>

      {/* ── HOME SCREEN ── */}
      {screen === "home" && (
        <div className="screen screen-home">
          <div className="home-header">
            <div className="title-block">
              <h1 className="game-title">
                <span className="title-algebra">Algebra</span>
                <span className="title-quest">Quest</span>
              </h1>
              <p className="game-subtitle">Linear Equations Adventure · Grade 8</p>
            </div>
            <div className={`character-wrap ${mood === "idle" ? "character-float" : ""}`}>
              <img src="/images/wizard-character.png" alt="Math Wizard" className="character-img" />
              <div className="speech-bubble">
                <span>{moodMessage}</span>
              </div>
            </div>
          </div>

          <div className="level-select">
            <h2 className="level-select-title">Choose Your Level</h2>
            <div className="level-cards">
              {([1, 2, 3] as Level[]).map((lvl) => (
                <button
                  key={lvl}
                  className={`level-card level-card-${lvl} ${selectedLevel === lvl ? "selected" : ""}`}
                  onClick={() => setSelectedLevel(lvl)}
                >
                  <div className="level-badge">Level {lvl}</div>
                  <div className="level-icon">
                    {lvl === 1 ? "⚡" : lvl === 2 ? "🔄" : "🚀"}
                  </div>
                  <div className="level-name">
                    {lvl === 1 ? "Explorer" : lvl === 2 ? "Challenger" : "Master"}
                  </div>
                  <div className="level-desc">
                    {lvl === 1
                      ? "One-side equations\nSimple steps"
                      : lvl === 2
                      ? "Variables on both sides\nMore steps"
                      : "Distribution & multi-step\nFull algebra!"}
                  </div>
                  <div className="level-stars">
                    {"★".repeat(lvl)}{"☆".repeat(3 - lvl)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="home-buttons">
            <button className="btn-play" onClick={() => startGame(selectedLevel)}>
              ▶ PLAY NOW
            </button>
            <button className="btn-tutorial" onClick={() => { setTutorialStep(0); setScreen("tutorial"); }}>
              📚 HOW TO SOLVE
            </button>
          </div>

          <div className="home-stats-row">
            <div className="stat-pill">🧠 Grade 8 Curriculum</div>
            <div className="stat-pill">⚡ Real-time Scoring</div>
            <div className="stat-pill">🎯 Step-by-Step Help</div>
          </div>
        </div>
      )}

      {/* ── TUTORIAL SCREEN ── */}
      {screen === "tutorial" && (
        <div className="screen screen-tutorial">
          <button className="back-btn" onClick={() => setScreen("home")}>← Back</button>
          <h2 className="tut-header">📚 Solving Linear Equations</h2>
          <div className="tut-progress">
            {TUTORIAL_SLIDES.map((_, i) => (
              <div
                key={i}
                className={`tut-dot ${i === tutorialStep ? "active" : i < tutorialStep ? "done" : ""}`}
                onClick={() => setTutorialStep(i)}
              />
            ))}
          </div>
          <div className="tut-slide">
            <div className="tut-icon">{TUTORIAL_SLIDES[tutorialStep].icon}</div>
            <h3 className="tut-title">{TUTORIAL_SLIDES[tutorialStep].title}</h3>
            <p className="tut-content">{TUTORIAL_SLIDES[tutorialStep].content}</p>
            <div className="tut-example">
              <span className="tut-example-label">Example:</span>
              <pre className="tut-example-text">{TUTORIAL_SLIDES[tutorialStep].example}</pre>
            </div>
            <div className="tut-tip">
              <span>💡 Tip: </span>{TUTORIAL_SLIDES[tutorialStep].tip}
            </div>
          </div>
          <div className="tut-nav">
            <button
              className="tut-btn"
              disabled={tutorialStep === 0}
              onClick={() => setTutorialStep((s) => Math.max(0, s - 1))}
            >← Prev</button>
            {tutorialStep < TUTORIAL_SLIDES.length - 1 ? (
              <button className="tut-btn tut-btn-next" onClick={() => setTutorialStep((s) => s + 1)}>
                Next →
              </button>
            ) : (
              <button className="tut-btn tut-btn-play" onClick={() => { startGame(selectedLevel); }}>
                🎮 Start Playing!
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── GAME SCREEN ── */}
      {screen === "game" && currentQuestion && (
        <div className="screen screen-game">
          {/* Top HUD */}
          <div className="hud">
            <div className="hud-left">
              <button className="hud-back" onClick={() => setScreen("home")}>✕</button>
              <div className="hud-level">Lv.{gameState.level}</div>
            </div>
            <div className="hud-center">
              <div className="timer-bar-wrap">
                <div
                  className="timer-bar"
                  style={{ width: `${timerPercent}%`, background: timerColor }}
                />
              </div>
              <span className="timer-num" style={{ color: timerColor }}>
                {gameState.timeLeft}s
              </span>
            </div>
            <div className="hud-right">
              <div className={`score-display ${animatingScore ? "score-pop" : ""}`}>
                ⭐ {gameState.score.toLocaleString()}
              </div>
              <div className="hearts">
                {Array.from({ length: 3 }, (_, i) => (
                  <span key={i} className={`heart ${i < gameState.hearts ? "heart-on" : "heart-off"}`}>♥</span>
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-wrap">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${((gameState.questionIndex) / gameState.totalQuestions) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              Question {gameState.questionIndex + 1} / {gameState.totalQuestions}
            </span>
          </div>

          <div className="game-main">
            {/* Character sidebar */}
            <div className="char-sidebar">
              <div className={`char-container ${characterBounce ? "char-bounce" : "char-float"}`}>
                <img
                  src={mood === "happy" || mood === "excited" ? "/images/wizard-character.png" : "/images/hero-character.png"}
                  alt="Character"
                  className="sidebar-char-img"
                />
                {gameState.streak >= 2 && (
                  <div className="streak-badge">🔥 {gameState.streak}x</div>
                )}
              </div>
              <div className="sidebar-bubble">
                <p>{moodMessage}</p>
              </div>
              {xpGained && (
                <div className="xp-popup">+{xpGained} XP!</div>
              )}
            </div>

            {/* Question area */}
            <div className="question-area">
              {/* Equation type badge */}
              <div className={`eq-type-badge eq-type-${currentQuestion.type}`}>
                {currentQuestion.type === "one_side"
                  ? "⚡ One-Side Equation"
                  : currentQuestion.type === "both_sides"
                  ? "🔄 Variables on Both Sides"
                  : "📦 Distribution"}
              </div>

              {/* Equation display */}
              <div className={`equation-box ${shakeWrong ? "shake" : ""} ${answerResult === "correct" ? "glow-green" : ""}`}>
                <div className="eq-label">Solve for x:</div>
                <div className="eq-display">{currentQuestion.display}</div>
              </div>

              {/* Answer choices */}
              <div className="choices-grid">
                {choices.map((choice) => {
                  const isSelected = selectedAnswer === choice;
                  const isCorrect = choice === currentQuestion.answer;
                  let cls = "choice-btn";
                  if (answerResult !== null) {
                    if (isCorrect) cls += " choice-correct";
                    else if (isSelected && !isCorrect) cls += " choice-wrong";
                    else cls += " choice-dim";
                  }
                  return (
                    <button
                      key={choice}
                      className={cls}
                      onClick={() => handleAnswer(choice)}
                      disabled={answerResult !== null}
                    >
                      <span className="choice-label">x = </span>
                      <span className="choice-value">{choice}</span>
                      {answerResult !== null && isCorrect && <span className="choice-icon">✓</span>}
                      {answerResult !== null && isSelected && !isCorrect && <span className="choice-icon">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Hint & Steps buttons */}
              {answerResult === null && (
                <div className="helper-btns">
                  <button className="hint-btn" onClick={() => setShowHint((v) => !v)}>
                    {showHint ? "🙈 Hide Hint" : "💡 Hint"}
                  </button>
                  <button className="steps-btn" onClick={() => setShowSteps((v) => !v)}>
                    {showSteps ? "🙈 Hide Steps" : "📋 Show Steps"}
                  </button>
                </div>
              )}

              {/* Hint box */}
              {showHint && (
                <div className="hint-box">
                  <span className="hint-icon">💡</span>
                  <p>{currentQuestion.hint}</p>
                </div>
              )}

              {/* Step-by-step solution */}
              {(showSteps || answerResult !== null) && (
                <div className="steps-box">
                  <h4 className="steps-title">📋 Step-by-Step Solution</h4>
                  <div className="steps-list">
                    {currentQuestion.steps.map((step, i) => (
                      <div key={step.id} className="step-item" style={{ animationDelay: `${i * 0.15}s` }}>
                        <div className="step-num">{i + 1}</div>
                        <div className="step-body">
                          <div className="step-instruction">{step.instruction}</div>
                          <div className="step-expression">{step.expression}</div>
                          <div className="step-explanation">{step.explanation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer feedback */}
              {answerResult === "correct" && (
                <div className="feedback feedback-correct">
                  🎉 Correct! <span className="feedback-sub">+100 pts + time bonus!</span>
                </div>
              )}
              {answerResult === "wrong" && (
                <div className="feedback feedback-wrong">
                  😅 Not quite! <span className="feedback-sub">The answer was x = {currentQuestion.answer}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS SCREEN ── */}
      {screen === "results" && (
        <div className="screen screen-results">
          <div className="results-particles" aria-hidden>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className={`res-particle rp-${i}`} />
            ))}
          </div>
          <div className="results-card">
            <div className="results-trophy">
              {gameState.answeredCorrect === gameState.totalQuestions
                ? "🏆"
                : gameState.answeredCorrect >= Math.ceil(gameState.totalQuestions / 2)
                ? "🥈"
                : "📚"}
            </div>
            <h2 className="results-title">
              {gameState.answeredCorrect === gameState.totalQuestions
                ? "Perfect Score!"
                : gameState.answeredCorrect >= Math.ceil(gameState.totalQuestions / 2)
                ? "Great Job!"
                : "Keep Practicing!"}
            </h2>
            <div className="results-score">{gameState.score.toLocaleString()} pts</div>
            <div className="results-grid">
              <div className="res-stat">
                <div className="res-stat-val res-correct">{gameState.answeredCorrect}</div>
                <div className="res-stat-label">Correct ✓</div>
              </div>
              <div className="res-stat">
                <div className="res-stat-val res-wrong">{gameState.answeredWrong}</div>
                <div className="res-stat-label">Wrong ✗</div>
              </div>
              <div className="res-stat">
                <div className="res-stat-val res-streak">🔥{gameState.maxStreak}</div>
                <div className="res-stat-label">Best Streak</div>
              </div>
              <div className="res-stat">
                <div className="res-stat-val res-xp">+{gameState.xp}</div>
                <div className="res-stat-label">XP Earned</div>
              </div>
            </div>
            {/* Accuracy bar */}
            <div className="accuracy-wrap">
              <div className="accuracy-label">
                Accuracy: {Math.round((gameState.answeredCorrect / gameState.totalQuestions) * 100)}%
              </div>
              <div className="accuracy-bar">
                <div
                  className="accuracy-fill"
                  style={{ width: `${(gameState.answeredCorrect / gameState.totalQuestions) * 100}%` }}
                />
              </div>
            </div>
            {/* Encouragement message */}
            <div className="results-message">
              {gameState.answeredCorrect === gameState.totalQuestions
                ? "🌟 Outstanding! You're a true Algebra Master!"
                : gameState.answeredCorrect >= Math.ceil(gameState.totalQuestions / 2)
                ? "💪 Solid work! Try a harder level next!"
                : "📖 Review the steps and try again – you've got this!"}
            </div>
            <div className="results-btns">
              <button className="btn-retry" onClick={() => startGame(gameState.level)}>
                🔄 Play Again
              </button>
              <button
                className="btn-next-level"
                disabled={gameState.level === 3}
                onClick={() => {
                  const next = Math.min(3, gameState.level + 1) as Level;
                  setSelectedLevel(next);
                  startGame(next);
                }}
              >
                ⬆ Next Level
              </button>
              <button className="btn-home" onClick={() => setScreen("home")}>
                🏠 Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
