import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import { ASSESSMENT_QUESTIONS, SKILL_LEVEL_LABELS, TECHNICAL_SKILLS } from '../../lib/skills';
import { saveAssessment } from '../../lib/db';

function AssessmentInner() {
  const { user } = useSession();
  const [answers, setAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(ASSESSMENT_QUESTIONS.map((q) => [q.skill, 2]))
  );
  // Sliders always have a value (can't be "empty"), so "answered" has to mean
  // "the student actually touched this one" — not "has a default value" (every
  // question does, from mount, which was making the bar read 100% immediately).
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [saved, setSaved] = useState(false);

  const progress = useMemo(
    () => Math.round((touched.size / ASSESSMENT_QUESTIONS.length) * 100),
    [touched]
  );

  function submit() {
    if (!user) return;
    const skills = ASSESSMENT_QUESTIONS.map((q) => ({
      skill: q.skill,
      score: Math.min(answers[q.skill] * 20, 100),
    }));
    saveAssessment(user.id, skills);
    setSaved(true);
    window.setTimeout(() => {
      window.location.href = '/student/dashboard';
    }, 900);
  }

  const technical = ASSESSMENT_QUESTIONS.filter((q) =>
    (TECHNICAL_SKILLS as readonly string[]).includes(q.skill)
  );
  const soft = ASSESSMENT_QUESTIONS.filter(
    (q) => !(TECHNICAL_SKILLS as readonly string[]).includes(q.skill)
  );

  return (
    <div className="mx-auto max-w-3xl px-6 pb-28 pt-32">
      <div className="animate-fade-in">
        <span className="pill">Skill assessment</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Tell us where you stand.
        </h1>
        <p className="mt-2 text-fg-muted">
          Rate yourself honestly on each skill — this builds your live profile and powers
          every recommendation on Kaledo.
        </p>
      </div>

      <div className="sticky top-20 z-20 mt-8 animate-fade-in">
        <div className="glass flex items-center gap-4 rounded-full px-5 py-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-violet transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="whitespace-nowrap font-display text-xs font-semibold text-fg-muted">
            {progress}% set
          </span>
        </div>
      </div>

      <Section
        title="Technical skills"
        questions={technical}
        answers={answers}
        setAnswers={setAnswers}
        touched={touched}
        setTouched={setTouched}
      />
      <Section
        title="Soft skills"
        questions={soft}
        answers={answers}
        setAnswers={setAnswers}
        touched={touched}
        setTouched={setTouched}
      />

      <div className="mt-10 flex items-center justify-end gap-4 animate-fade-in">
        <button onClick={submit} className="btn-primary">
          {saved ? 'Saved — redirecting…' : 'Generate my skill profile →'}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  questions,
  answers,
  setAnswers,
  touched,
  setTouched,
}: {
  title: string;
  questions: typeof ASSESSMENT_QUESTIONS;
  answers: Record<string, number>;
  setAnswers: Dispatch<SetStateAction<Record<string, number>>>;
  touched: Set<string>;
  setTouched: Dispatch<SetStateAction<Set<string>>>;
}) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-lg font-semibold text-fg-muted animate-fade-in">{title}</h2>
      <div className="mt-4 space-y-4">
        {questions.map((q, i) => (
          <div
            key={q.skill}
            className="glass animate-fade-in rounded-2xl p-5"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{q.prompt}</p>
                <p className="mt-1 text-xs text-fg-faint">{q.helper}</p>
              </div>
              <span className="pill shrink-0">{q.skill}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={5}
                step={1}
                value={answers[q.skill]}
                onChange={(e) => {
                  setAnswers((a) => ({ ...a, [q.skill]: Number(e.target.value) }));
                  setTouched((t) => (t.has(q.skill) ? t : new Set(t).add(q.skill)));
                }}
                className="flex-1"
              />
              <span className="w-40 shrink-0 text-right text-sm font-medium text-fg-muted">
                {touched.has(q.skill) ? SKILL_LEVEL_LABELS[answers[q.skill]] : 'Not set yet'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Assessment() {
  return (
    <RoleGate role="student">
      <AssessmentInner />
    </RoleGate>
  );
}
