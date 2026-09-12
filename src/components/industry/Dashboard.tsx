import { useEffect, useMemo, useState, type FormEvent } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  createLearningProgram,
  createOpportunity,
  getCompanyProfile,
  getResumeSnapshot,
  getStudentProfile,
  getUser,
  listApplicationsForCompany,
  listLearningPrograms,
  listOpportunities,
  updateApplicationStatus,
} from '../../lib/db';
import { ALL_SKILLS } from '../../lib/skills';
import type {
  Application,
  ApplicationStatus,
  LearningProgram,
  Opportunity,
  OpportunityType,
  ProgramType,
  ResumeData,
  SkillScore,
} from '../../lib/types';
import ResumePreview from '../ResumePreview';

const TABS = ['Postings', 'Applicants', 'Learning Programs'] as const;
type Tab = (typeof TABS)[number];

const STATUS_OPTIONS: ApplicationStatus[] = [
  'applied',
  'shortlisted',
  'interview',
  'selected',
  'rejected',
];

function SkillPicker({
  skills,
  setSkills,
}: {
  skills: SkillScore[];
  setSkills: (s: SkillScore[]) => void;
}) {
  const [skill, setSkill] = useState(ALL_SKILLS[0]);
  const [score, setScore] = useState(60);
  const available = ALL_SKILLS.filter((s) => !skills.some((x) => x.skill === s));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span key={s.skill} className="pill">
            {s.skill} · {s.score}
            <button
              type="button"
              onClick={() => setSkills(skills.filter((x) => x.skill !== s.skill))}
              className="ml-1 text-fg-faint hover:text-pink"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {available.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value as (typeof ALL_SKILLS)[number])}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none"
          >
            {available.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={10}
            max={100}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-16 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setSkills([...skills, { skill, score }]);
            }}
            className="btn-ghost !px-3 !py-1.5 !text-xs"
          >
            + Add requirement
          </button>
        </div>
      )}
    </div>
  );
}

function PostingsTab({ companyId }: { companyId: string }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<OpportunityType>('internship');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(true);
  const [stipend, setStipend] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [openings, setOpenings] = useState(1);
  const [reqSkills, setReqSkills] = useState<SkillScore[]>([]);

  const refresh = () => setOpportunities(listOpportunities().filter((o) => o.companyId === companyId));

  useEffect(() => {
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || reqSkills.length === 0) return;
    createOpportunity({
      companyId,
      title: title.trim(),
      type,
      location: location.trim() || 'Remote',
      remote,
      stipendOrSalary: stipend.trim() || 'Competitive',
      duration: duration.trim() || 'Flexible',
      description: description.trim(),
      requiredSkills: reqSkills,
      openings,
    });
    setTitle('');
    setLocation('');
    setStipend('');
    setDuration('');
    setDescription('');
    setReqSkills([]);
    setOpenings(1);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-6 lg:col-span-1">
        <h3 className="font-display text-sm font-semibold text-fg-muted">Post a new opportunity</h3>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as OpportunityType)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
          >
            <option value="internship">Internship</option>
            <option value="job">Full-time job</option>
            <option value="apprenticeship">Apprenticeship</option>
            <option value="project">Project</option>
          </select>
          <input
            type="number"
            min={1}
            value={openings}
            onChange={(e) => setOpenings(Number(e.target.value))}
            placeholder="Openings"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
          />
        </div>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
        />
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
          Remote friendly
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={stipend}
            onChange={(e) => setStipend(e.target.value)}
            placeholder="Stipend / salary"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
          />
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Duration"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
        />
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-muted">Required skills (importance)</p>
          <SkillPicker skills={reqSkills} setSkills={setReqSkills} />
        </div>
        <button type="submit" className="btn-primary w-full">
          Publish opportunity
        </button>
      </form>

      <div className="space-y-4 lg:col-span-2">
        {opportunities.length === 0 && (
          <p className="py-8 text-center text-sm text-fg-faint">No opportunities posted yet.</p>
        )}
        {opportunities.map((o) => (
          <div key={o.id} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">{o.title}</p>
              <span className="pill capitalize">{o.type}</span>
            </div>
            <p className="mt-1 text-xs text-fg-faint">
              {o.location} · {o.duration} · {o.stipendOrSalary} · {o.openings} openings
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {o.requiredSkills.map((s) => (
                <span key={s.skill} className="pill">
                  {s.skill} · {s.score}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicantsTab({ companyId }: { companyId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [viewingResume, setViewingResume] = useState<ResumeData | null>(null);

  const refresh = () => {
    setApplications(listApplicationsForCompany(companyId));
    setOpportunities(listOpportunities().filter((o) => o.companyId === companyId));
  };

  useEffect(() => {
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opportunityMap = useMemo(() => new Map(opportunities.map((o) => [o.id, o])), [opportunities]);

  const sorted = [...applications].sort((a, b) => b.matchScoreAtApply - a.matchScoreAtApply);

  return (
    <div className="space-y-4">
      {sorted.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-faint">No applicants yet.</p>
      )}
      {sorted.map((a) => {
        const student = getUser(a.studentId);
        const profile = getStudentProfile(a.studentId);
        const opp = opportunityMap.get(a.opportunityId);
        if (!student || !opp) return null;
        return (
          <div key={a.id} className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {student.name} <span className="text-fg-faint">→ {opp.title}</span>
              </p>
              <p className="text-xs text-fg-faint">{profile?.headline}</p>
              {profile && profile.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.skills
                    .slice()
                    .sort((x, y) => y.score - x.score)
                    .slice(0, 4)
                    .map((s) => (
                      <span key={s.skill} className="pill">
                        {s.skill} · {s.score}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="font-display text-xl font-bold gradient-text">
                  {a.matchScoreAtApply}%
                </p>
                <p className="text-[11px] text-fg-faint">match</p>
              </div>
              {a.resumeSnapshotId ? (
                <button
                  onClick={() => {
                    const snap = getResumeSnapshot(a.resumeSnapshotId!);
                    if (snap) setViewingResume(snap.data);
                  }}
                  className="btn-ghost !py-2 !text-xs"
                >
                  View resume
                </button>
              ) : (
                <span className="pill">No resume attached</span>
              )}
              <select
                value={a.status}
                onChange={(e) => updateApplicationStatus(a.id, e.target.value as ApplicationStatus)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm capitalize outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}

      {viewingResume && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/80 p-6 backdrop-blur-sm print:hidden">
          <div className="my-8 w-full max-w-2xl">
            <div className="mb-4 flex gap-2 print:hidden">
              <button onClick={() => setViewingResume(null)} className="btn-ghost !py-2 !text-xs">
                ✕ Close
              </button>
              <button onClick={() => window.print()} className="btn-ghost !py-2 !text-xs">
                Print / Save as PDF
              </button>
            </div>
            <ResumePreview data={viewingResume} />
          </div>
        </div>
      )}
    </div>
  );
}

function LearningTab({ companyId }: { companyId: string }) {
  const [programs, setPrograms] = useState<LearningProgram[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ProgramType>('certification');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState(10);
  const [skillsCovered, setSkillsCovered] = useState<string[]>([]);

  const refresh = () => setPrograms(listLearningPrograms().filter((p) => p.companyId === companyId));

  useEffect(() => {
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || skillsCovered.length === 0) return;
    createLearningProgram({
      companyId,
      title: title.trim(),
      type,
      description: description.trim(),
      skillsCovered,
      durationHours: hours,
    });
    setTitle('');
    setDescription('');
    setHours(10);
    setSkillsCovered([]);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form onSubmit={submit} className="glass space-y-3 rounded-2xl p-6 lg:col-span-1">
        <h3 className="font-display text-sm font-semibold text-fg-muted">Publish a learning program</h3>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Program title"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProgramType)}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
          >
            <option value="certification">Certification</option>
            <option value="workshop">Workshop</option>
            <option value="mentorship">Mentorship</option>
            <option value="training">Training</option>
          </select>
          <input
            type="number"
            min={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            placeholder="Hours"
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
        />
        <div>
          <p className="mb-1.5 text-xs font-medium text-fg-muted">Skills covered</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_SKILLS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() =>
                  setSkillsCovered((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )
                }
                className={`pill transition-colors ${
                  skillsCovered.includes(s) ? 'border-violet/60 bg-violet/10 text-fg' : ''
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">
          Publish program
        </button>
      </form>

      <div className="space-y-4 lg:col-span-2">
        {programs.length === 0 && (
          <p className="py-8 text-center text-sm text-fg-faint">No programs published yet.</p>
        )}
        {programs.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold">{p.title}</p>
              <span className="pill capitalize">{p.type}</span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skillsCovered.map((s) => (
                <span key={s} className="pill">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IndustryDashboardInner() {
  const { user } = useSession();
  const [tab, setTab] = useState<Tab>('Postings');
  const profile = user ? getCompanyProfile(user.id) : null;

  if (!user || !profile) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="pill">Industry portal</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
            {profile.companyName}
          </h1>
          <p className="mt-2 text-fg-muted">{profile.industry} · {profile.about}</p>
        </div>
      </div>

      <div className="animate-fade-in mt-8 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'glass text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'Postings' && <PostingsTab companyId={user.id} />}
        {tab === 'Applicants' && <ApplicantsTab companyId={user.id} />}
        {tab === 'Learning Programs' && <LearningTab companyId={user.id} />}
      </div>
    </div>
  );
}

export default function IndustryDashboard() {
  return (
    <RoleGate role="industry">
      <IndustryDashboardInner />
    </RoleGate>
  );
}
