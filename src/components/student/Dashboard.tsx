import { useEffect, useState } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import SkillRadar from '../SkillRadar';
import {
  getStudentProfile,
  listApplicationsForStudent,
  listOpportunities,
  getAllCompanyProfiles,
} from '../../lib/db';
import { computeMatchScore, recommendRoles } from '../../lib/skills';
import type { StudentProfile, Application, Opportunity } from '../../lib/types';

const STATUS_STYLES: Record<string, string> = {
  applied: 'bg-fg-faint/15 text-fg-muted',
  shortlisted: 'bg-cyan/15 text-cyan',
  interview: 'bg-amber/15 text-amber',
  selected: 'bg-violet/15 text-violet',
  rejected: 'bg-pink/15 text-pink',
};

function DashboardInner() {
  const { user } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState(getAllCompanyProfiles());

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setProfile(getStudentProfile(user.id));
      setApplications(listApplicationsForStudent(user.id));
      setOpportunities(listOpportunities());
      setCompanies(getAllCompanyProfiles());
    };
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
  }, [user]);

  if (!user || !profile) return null;

  const hasAssessment = profile.assessmentCompletedAt !== null;
  const topRoles = hasAssessment ? recommendRoles(profile.skills, 3) : [];
  const topOpportunities = hasAssessment
    ? [...opportunities]
        .map((o) => ({ o, score: computeMatchScore(profile.skills, o.requiredSkills) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : [];

  const statusCounts = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="pill">Welcome back</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
            Hey {user.name.split(' ')[0]}, here's your standing.
          </h1>
          <p className="mt-2 text-fg-muted">{profile.headline}</p>
        </div>
        <a href="/student/opportunities" className="btn-primary shrink-0">
          Browse opportunities →
        </a>
      </div>

      {!hasAssessment && (
        <div className="glass animate-fade-in mt-8 flex flex-col items-start gap-4 rounded-2xl border-violet/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold">
              Take your skill assessment to unlock recommendations
            </h3>
            <p className="mt-1 text-sm text-fg-muted">
              It takes about 3 minutes and powers every match on your dashboard.
            </p>
          </div>
          <a href="/student/assessment" className="btn-primary shrink-0">
            Start assessment
          </a>
        </div>
      )}

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass animate-fade-in rounded-2xl p-6 lg:col-span-1">
          <h3 className="font-display text-sm font-semibold text-fg-muted">Skill profile</h3>
          {hasAssessment ? (
            <SkillRadar data={profile.skills} height={280} />
          ) : (
            <p className="mt-16 text-center text-sm text-fg-faint">
              Complete the assessment to see your radar.
            </p>
          )}
        </div>

        <div className="glass animate-fade-in rounded-2xl p-6 lg:col-span-2" style={{ animationDelay: '80ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">Best-fit roles</h3>
          {hasAssessment ? (
            <div className="mt-4 space-y-3">
              {topRoles.map(({ role, matchScore, gaps }) => (
                <div key={role.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{role.title}</p>
                      <p className="text-xs text-fg-faint">{role.category}</p>
                    </div>
                    <span className="font-display text-lg font-bold gradient-text">
                      {matchScore}%
                    </span>
                  </div>
                  {gaps.length > 0 && (
                    <p className="mt-2 text-xs text-fg-muted">
                      Grow: {gaps.slice(0, 2).map((g) => g.skill).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-fg-faint">
              Role recommendations appear after your assessment.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass animate-fade-in rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-fg-muted">
              Recommended opportunities
            </h3>
            <a href="/student/opportunities" className="text-xs font-semibold text-cyan hover:underline">
              View all
            </a>
          </div>
          {hasAssessment && topOpportunities.length > 0 ? (
            <div className="mt-4 space-y-3">
              {topOpportunities.map(({ o, score }) => (
                <a
                  key={o.id}
                  href="/student/opportunities"
                  className="flex items-center justify-between rounded-xl border border-line p-4 transition-colors hover:border-fg-faint"
                >
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-xs text-fg-faint">
                      {companies[o.companyId]?.companyName} · {o.location}
                    </p>
                  </div>
                  <span className="font-display font-bold gradient-text">{score}%</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-fg-faint">
              Recommendations appear after your assessment.
            </p>
          )}
        </div>

        <div className="glass animate-fade-in rounded-2xl p-6" style={{ animationDelay: '80ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">Application tracker</h3>
          <p className="mt-4 font-display text-3xl font-bold">{applications.length}</p>
          <p className="text-xs text-fg-faint">Total applications</p>
          <div className="mt-4 space-y-2">
            {Object.entries(statusCounts).length === 0 && (
              <p className="text-sm text-fg-faint">No applications yet.</p>
            )}
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className={`pill capitalize ${STATUS_STYLES[status]}`}>{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <RoleGate role="student">
      <DashboardInner />
    </RoleGate>
  );
}
