import { useEffect, useMemo, useState } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  enrollInCourse,
  enrollInProgram,
  getAllCompanyProfiles,
  getCourseProgress,
  getStudentProfile,
  listCertificates,
  listCourseProgressForUser,
  listLearningPrograms,
  markProgramComplete,
  recordQuizAttempt,
} from '../../lib/db';
import { CATEGORIES, COURSES, getQuizForCategory } from '../../lib/courses';
import type { Certificate, Course, LearningProgram, StudentProfile } from '../../lib/types';
import CertificateView from '../CertificateView';

const TYPE_LABEL: Record<string, string> = {
  certification: 'Certification',
  workshop: 'Workshop',
  mentorship: 'Mentorship',
  training: 'Training',
};

function CourseCard({
  course,
  progress,
  onOpen,
}: {
  course: Course;
  progress: ReturnType<typeof getCourseProgress>;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="glass glass-hover flex flex-col rounded-2xl p-5 text-left"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="pill">{course.level}</span>
        {progress?.status === 'completed' && <span className="pill bg-cyan/10 text-cyan">Completed ✓</span>}
        {progress?.status === 'enrolled' && <span className="pill bg-amber/10 text-amber">In progress</span>}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold">{course.title}</h3>
      <p className="text-xs text-fg-faint">
        {course.provider} · {course.estimatedHours}h · {course.resourceType}
      </p>
      <p className="mt-2 flex-1 text-sm text-fg-muted">{course.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {course.skillTags.slice(0, 2).map((s) => (
          <span key={s} className="pill">
            {s}
          </span>
        ))}
      </div>
    </button>
  );
}

function CourseDetail({
  course,
  userId,
  studentName,
  onBack,
  onChanged,
}: {
  course: Course;
  userId: string;
  studentName: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [progress, setProgress] = useState(getCourseProgress(userId, course.id));
  const [taking, setTaking] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ passed: boolean; score: number; certificate: Certificate | null } | null>(null);
  const quiz = getQuizForCategory(course.quizCategory);

  function refresh() {
    setProgress(getCourseProgress(userId, course.id));
    onChanged();
  }

  function handleEnroll() {
    enrollInCourse(userId, course.id);
    refresh();
  }

  function submitQuiz() {
    const correct = quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    const score = Math.round((correct / quiz.length) * 100);
    const { passed, certificate } = recordQuizAttempt(userId, course.id, course.title, studentName, score);
    setResult({ passed, score, certificate });
    setTaking(false);
    refresh();
  }

  if (result) {
    return (
      <div>
        <button onClick={onBack} className="text-xs font-semibold text-fg-muted hover:text-fg">
          ← Back to catalog
        </button>
        <div className="glass mt-6 rounded-2xl p-8 text-center">
          {result.passed ? (
            <>
              <span className="pill bg-cyan/10 text-cyan">Passed · {result.score}%</span>
              <h2 className="mt-4 font-display text-2xl font-bold">
                Congratulations, {studentName.split(' ')[0]}! 🎉
              </h2>
              <p className="mt-2 text-sm text-fg-muted">
                You've completed <strong>{course.title}</strong>. Your certificate has been
                added to your portfolio and is available to attach to your resume.
              </p>
              {result.certificate && (
                <div className="mx-auto mt-6 max-w-xl">
                  <CertificateView certificate={result.certificate} />
                </div>
              )}
            </>
          ) : (
            <>
              <span className="pill bg-pink/10 text-pink">Not quite · {result.score}%</span>
              <h2 className="mt-4 font-display text-2xl font-bold">Almost there</h2>
              <p className="mt-2 text-sm text-fg-muted">
                You need 70% to pass. Review the curriculum below and try again.
              </p>
              <button
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                  setTaking(false);
                }}
                className="btn-primary mt-4"
              >
                Back to course
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (taking) {
    const allAnswered = quiz.every((q) => answers[q.id] !== undefined);
    return (
      <div>
        <button onClick={() => setTaking(false)} className="text-xs font-semibold text-fg-muted hover:text-fg">
          ← Back to course
        </button>
        <div className="mt-6">
          <span className="pill">Assessment</span>
          <h2 className="mt-3 font-display text-2xl font-bold">{course.title}</h2>
          <p className="mt-1 text-sm text-fg-muted">Score 70% or higher to earn your certificate.</p>
        </div>
        <div className="mt-6 space-y-4">
          {quiz.map((q, i) => (
            <div key={q.id} className="glass rounded-2xl p-5">
              <p className="font-medium">
                {i + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                      answers[q.id] === oi ? 'border-violet/60 bg-violet/5' : 'border-line'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === oi}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button disabled={!allAnswered} onClick={submitQuiz} className="btn-primary mt-6">
          Submit assessment
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="text-xs font-semibold text-fg-muted hover:text-fg">
        ← Back to catalog
      </button>
      <div className="glass mt-6 rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill">{course.level}</span>
          <span className="pill">{course.category}</span>
          <span className="pill">{course.estimatedHours}h</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold">{course.title}</h2>
        <p className="mt-1 text-sm text-fg-faint">
          {course.provider} · {course.resourceType}
        </p>
        <p className="mt-3 text-sm text-fg-muted">{course.description}</p>

        <h4 className="mt-5 font-display text-sm font-semibold text-fg-muted">Curriculum</h4>
        <ul className="mt-2 space-y-1.5">
          {course.curriculum.map((topic, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-fg-muted">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
              {topic}
            </li>
          ))}
        </ul>

        <a
          href={course.resourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-semibold text-cyan hover:underline"
        >
          Open learning resource ({course.provider}) →
        </a>

        <div className="mt-6 flex flex-wrap gap-3">
          {!progress && (
            <button onClick={handleEnroll} className="btn-primary">
              Enroll
            </button>
          )}
          {progress && progress.status !== 'completed' && (
            <button onClick={() => setTaking(true)} className="btn-primary">
              Take assessment ({quiz.length} questions)
            </button>
          )}
          {progress?.status === 'completed' && (
            <button onClick={() => setTaking(true)} className="btn-ghost">
              Retake assessment (best score: {progress.bestScore}%)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningInner() {
  const { user } = useSession();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [progressList, setProgressList] = useState(listCourseProgressForUser(user?.id ?? ''));
  const [programs, setPrograms] = useState<LearningProgram[]>([]);
  const [companies, setCompanies] = useState(getAllCompanyProfiles());
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  function refreshAll() {
    if (!user) return;
    setProgressList(listCourseProgressForUser(user.id));
    setPrograms(listLearningPrograms());
    setCompanies(getAllCompanyProfiles());
    setStudentProfile(getStudentProfile(user.id));
  }

  useEffect(() => {
    if (!user) return;
    refreshAll();
    window.addEventListener('aip:db-changed', refreshAll);
    return () => window.removeEventListener('aip:db-changed', refreshAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const progressByCourse = useMemo(() => {
    const map = new Map<string, (typeof progressList)[number]>();
    progressList.forEach((p) => map.set(p.courseId, p));
    return map;
  }, [progressList]);

  const filtered = COURSES.filter(
    (c) =>
      (category === 'all' || c.category === category) &&
      (!query ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.provider.toLowerCase().includes(query.toLowerCase()))
  );

  if (!user) return null;

  const certificates = listCertificates(user.id);

  if (selectedCourse) {
    return (
      <div className="mx-auto max-w-4xl px-6 pb-28 pt-32">
        <CourseDetail
          course={selectedCourse}
          userId={user.id}
          studentName={user.name}
          onBack={() => setSelectedCourse(null)}
          onChanged={refreshAll}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in">
        <span className="pill">Learning catalog</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          {COURSES.length} free courses, curated and quizzed.
        </h1>
        <p className="mt-2 text-fg-muted">
          Real courses from official docs and well-known educators — enroll, work through
          the curriculum, pass the assessment, and earn a certificate for your portfolio.
        </p>
      </div>

      {certificates.length > 0 && (
        <div className="animate-fade-in mt-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-faint">Your certificates:</span>
          {certificates.map((c) => (
            <span key={c.id} className="pill bg-cyan/10 text-cyan">
              {c.courseTitle}
            </span>
          ))}
        </div>
      )}

      <div className="animate-fade-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60 sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('all')}
            className={`pill transition-colors ${category === 'all' ? 'border-violet/60 bg-violet/10 text-fg' : ''}`}
          >
            All ({COURSES.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`pill transition-colors ${category === cat ? 'border-violet/60 bg-violet/10 text-fg' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <CourseCard key={c.id} course={c} progress={progressByCourse.get(c.id) ?? null} onOpen={() => setSelectedCourse(c)} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-fg-faint">No courses match your search.</p>
        )}
      </div>

      {/* ---------- Industry-posted programs (unchanged) ---------- */}
      <div className="mt-16">
        <span className="pill">Industry learning programs</span>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
          Published directly by our industry partners.
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              companyName={companies[p.companyId]?.companyName}
              logoColor={companies[p.companyId]?.logoColor}
              userId={user.id}
              enrolled={studentProfile?.enrolledProgramIds.includes(p.id) ?? false}
              completed={studentProfile?.completedProgramIds.includes(p.id) ?? false}
              onChanged={refreshAll}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgramCard({
  program,
  companyName,
  logoColor,
  userId,
  enrolled,
  completed,
  onChanged,
}: {
  program: LearningProgram;
  companyName?: string;
  logoColor?: string;
  userId: string;
  enrolled: boolean;
  completed: boolean;
  onChanged: () => void;
}) {
  return (
    <div className="glass flex flex-col rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-ink"
          style={{ background: logoColor || '#5eead4' }}
        >
          {companyName?.[0] || 'C'}
        </span>
        <span className="pill">{TYPE_LABEL[program.type]}</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold">{program.title}</h3>
      <p className="text-xs text-fg-faint">
        {companyName} · {program.durationHours}h
      </p>
      <p className="mt-2 flex-1 text-sm text-fg-muted">{program.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {program.skillsCovered.map((s) => (
          <span key={s} className="pill">
            {s}
          </span>
        ))}
      </div>
      <div className="mt-4">
        {!enrolled && (
          <button
            onClick={() => {
              enrollInProgram(userId, program.id);
              onChanged();
            }}
            className="btn-primary w-full"
          >
            Enroll
          </button>
        )}
        {enrolled && !completed && (
          <button
            onClick={() => {
              markProgramComplete(userId, program.id);
              onChanged();
            }}
            className="btn-ghost w-full"
          >
            Mark as completed
          </button>
        )}
        {completed && (
          <div className="pill w-full justify-center bg-cyan/10 text-cyan">
            Completed ✓ · added to portfolio
          </div>
        )}
      </div>
    </div>
  );
}

export default function Learning() {
  return (
    <RoleGate role="student">
      <LearningInner />
    </RoleGate>
  );
}
