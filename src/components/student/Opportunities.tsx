import { useEffect, useMemo, useState } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  applyToOpportunity,
  getAllCompanyProfiles,
  getStudentProfile,
  listApplicationsForStudent,
  listOpportunities,
  listResumes,
} from '../../lib/db';
import { computeMatchScore, computeSkillGaps } from '../../lib/skills';
import type { Opportunity, OpportunityType, StudentProfile, Application, ResumeData } from '../../lib/types';

const TYPE_LABEL: Record<OpportunityType, string> = {
  internship: 'Internship',
  job: 'Full-time',
  apprenticeship: 'Apprenticeship',
  project: 'Project',
};

function OpportunitiesInner() {
  const { user } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState(getAllCompanyProfiles());
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<OpportunityType | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<{ o: Opportunity; score: number } | null>(null);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setProfile(getStudentProfile(user.id));
      setOpportunities(listOpportunities());
      setApplications(listApplicationsForStudent(user.id));
      setCompanies(getAllCompanyProfiles());
    };
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
  }, [user]);

  function openApplyModal(o: Opportunity, score: number) {
    if (!user) return;
    const mine = listResumes(user.id);
    setResumes(mine);
    setSelectedResumeId(mine[0]?.id ?? null);
    setApplyTarget({ o, score });
  }

  function confirmApply() {
    if (!user || !applyTarget) return;
    applyToOpportunity(user.id, applyTarget.o.id, applyTarget.score, selectedResumeId ?? undefined);
    setApplyTarget(null);
  }

  const appliedIds = useMemo(
    () => new Set(applications.map((a) => a.opportunityId)),
    [applications]
  );

  const ranked = useMemo(() => {
    const skills = profile?.skills ?? [];
    return opportunities
      .filter((o) => typeFilter === 'all' || o.type === typeFilter)
      .filter(
        (o) =>
          !query ||
          o.title.toLowerCase().includes(query.toLowerCase()) ||
          companies[o.companyId]?.companyName.toLowerCase().includes(query.toLowerCase())
      )
      .map((o) => ({
        o,
        score: computeMatchScore(skills, o.requiredSkills),
        gaps: computeSkillGaps(skills, o.requiredSkills),
      }))
      .sort((a, b) => b.score - a.score);
  }, [opportunities, typeFilter, query, profile, companies]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in">
        <span className="pill">Opportunities</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Internships & jobs, ranked for you.
        </h1>
        <p className="mt-2 text-fg-muted">
          {profile?.assessmentCompletedAt
            ? 'Sorted by how well each opportunity matches your skill profile.'
            : 'Take the skill assessment to see personalized match scores.'}
        </p>
      </div>

      <div className="animate-fade-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title or company…"
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60 sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(['all', 'internship', 'job', 'apprenticeship', 'project'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`pill transition-colors ${
                typeFilter === t ? 'border-violet/60 bg-violet/10 text-fg' : ''
              }`}
            >
              {t === 'all' ? 'All types' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {ranked.map(({ o, score, gaps }, i) => {
          const applied = appliedIds.has(o.id);
          const isOpen = expanded === o.id;
          return (
            <div
              key={o.id}
              className="glass animate-fade-in rounded-2xl p-6"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-ink"
                      style={{ background: companies[o.companyId]?.logoColor || '#5eead4' }}
                    >
                      {companies[o.companyId]?.companyName?.[0] || 'C'}
                    </span>
                    <p className="font-display text-lg font-semibold">{o.title}</p>
                    <span className="pill">{TYPE_LABEL[o.type]}</span>
                    {o.remote && <span className="pill">Remote</span>}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    {companies[o.companyId]?.companyName} · {o.location} · {o.duration} ·{' '}
                    {o.stipendOrSalary}
                  </p>
                  <p className="mt-3 text-sm text-fg-muted">{o.description}</p>

                  <button
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="mt-3 text-xs font-semibold text-cyan hover:underline"
                  >
                    {isOpen ? 'Hide details' : 'View required skills'}
                  </button>

                  {isOpen && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {o.requiredSkills.map((s) => (
                        <span key={s.skill} className="pill">
                          {s.skill} · {s.score}
                        </span>
                      ))}
                    </div>
                  )}

                  {isOpen && gaps.length > 0 && (
                    <p className="mt-3 text-xs text-amber">
                      Gap to close: {gaps.map((g) => `${g.skill} (+${g.gap})`).join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  {profile?.assessmentCompletedAt && (
                    <div className="text-right">
                      <p className="font-display text-2xl font-bold gradient-text">{score}%</p>
                      <p className="text-[11px] text-fg-faint">match</p>
                    </div>
                  )}
                  <button
                    disabled={applied}
                    onClick={() => openApplyModal(o, score)}
                    className={applied ? 'btn-ghost !cursor-default' : 'btn-primary'}
                  >
                    {applied ? 'Applied ✓' : 'Apply now'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {ranked.length === 0 && (
          <p className="py-16 text-center text-fg-faint">No opportunities match your filters.</p>
        )}
      </div>

      {applyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm">
          <div className="glass w-full max-w-md rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold">
              Apply to {applyTarget.o.title}
            </h3>
            <p className="mt-1 text-sm text-fg-muted">Which resume do you want to submit?</p>

            {resumes.length === 0 ? (
              <div className="mt-5 rounded-xl border border-amber/40 bg-amber/5 p-4">
                <p className="text-sm text-fg-muted">
                  You don't have a resume yet. Build one first — it only takes a few minutes
                  and you can reuse it for every application.
                </p>
                <a href="/student/resume" className="btn-primary mt-3 inline-flex !py-2 !text-xs">
                  Build my resume →
                </a>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {resumes.map((r) => (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                      selectedResumeId === r.id ? 'border-violet/60 bg-violet/5' : 'border-line'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resume"
                      checked={selectedResumeId === r.id}
                      onChange={() => setSelectedResumeId(r.id)}
                    />
                    {r.title}
                  </label>
                ))}
                <a href="/student/resume" className="block text-xs font-semibold text-cyan hover:underline">
                  + Build a new tailored resume instead
                </a>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setApplyTarget(null)} className="btn-ghost">
                Cancel
              </button>
              {resumes.length > 0 && (
                <button onClick={confirmApply} disabled={!selectedResumeId} className="btn-primary">
                  Submit application
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Opportunities() {
  return (
    <RoleGate role="student">
      <OpportunitiesInner />
    </RoleGate>
  );
}
