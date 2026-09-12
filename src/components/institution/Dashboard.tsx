import { useEffect, useMemo, useState } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  getAllApplications,
  getAllOpportunities,
  getAllStudentProfiles,
  getInstitutionProfile,
} from '../../lib/db';
import { ALL_SKILLS, computeMatchScore } from '../../lib/skills';
import type { Application, Opportunity, StudentProfile } from '../../lib/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PALETTE = ['#5eead4', '#a78bfa', '#fb7185', '#fbbf24', '#60a5fa', '#34d399'];
const STATUS_COLORS: Record<string, string> = {
  applied: '#626b8c',
  shortlisted: '#5eead4',
  interview: '#fbbf24',
  selected: '#a78bfa',
  rejected: '#fb7185',
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass animate-fade-in rounded-2xl p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-faint">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
    </div>
  );
}

function InstitutionDashboardInner() {
  const { user } = useSession();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setStudents(getAllStudentProfiles());
      setApplications(getAllApplications());
      setOpportunities(getAllOpportunities());
    };
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
  }, [user]);

  const assessedStudents = students.filter((s) => s.assessmentCompletedAt);

  const avgSkillData = useMemo(
    () =>
      ALL_SKILLS.map((skill) => {
        const scores = assessedStudents
          .map((s) => s.skills.find((sk) => sk.skill === skill)?.score)
          .filter((v): v is number => v !== undefined);
        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        return { skill: skill.split(' ')[0], full: skill, avg: Math.round(avg) };
      }),
    [assessedStudents]
  );

  const demandData = useMemo(() => {
    const totals = new Map<string, number>();
    opportunities.forEach((o) =>
      o.requiredSkills.forEach((s) => totals.set(s.skill, (totals.get(s.skill) || 0) + s.score))
    );
    return Array.from(totals.entries())
      .map(([skill, weight]) => ({ skill: skill.split(' ')[0], full: skill, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8);
  }, [opportunities]);

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    applications.forEach((a) => counts.set(a.status, (counts.get(a.status) || 0) + 1));
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [applications]);

  const placementReady = useMemo(() => {
    if (assessedStudents.length === 0) return 0;
    const ready = assessedStudents.filter((s) =>
      opportunities.some((o) => computeMatchScore(s.skills, o.requiredSkills) >= 70)
    );
    return Math.round((ready.length / assessedStudents.length) * 100);
  }, [assessedStudents, opportunities]);

  const studentsWithApplications = new Set(applications.map((a) => a.studentId)).size;

  if (!user) return null;
  const profile = getInstitutionProfile(user.id);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in">
        <span className="pill">Institution analytics</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          {profile?.institutionName || 'Your institution'}, at a glance.
        </h1>
        <p className="mt-2 text-fg-muted">
          Skill development, internship participation, and placement readiness across your
          student body.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered students" value={String(students.length)} />
        <StatCard
          label="Assessment completion"
          value={`${students.length ? Math.round((assessedStudents.length / students.length) * 100) : 0}%`}
          sub={`${assessedStudents.length} of ${students.length}`}
        />
        <StatCard
          label="Internship participation"
          value={String(studentsWithApplications)}
          sub="students with ≥1 application"
        />
        <StatCard label="Placement readiness" value={`${placementReady}%`} sub="score ≥70% on an opportunity" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="glass animate-fade-in rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold text-fg-muted">
            Average skill score across students
          </h3>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={avgSkillData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#22283f" vertical={false} />
                <XAxis dataKey="skill" tick={{ fill: '#96a0c2', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fill: '#626b8c', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#0d1220', border: '1px solid #22283f', borderRadius: 12 }}
                  formatter={(v) => [`${v}`, 'avg score']}
                />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                  {avgSkillData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass animate-fade-in rounded-2xl p-6" style={{ animationDelay: '60ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">
            Top in-demand skills (industry postings)
          </h3>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={demandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#22283f" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#626b8c', fontSize: 10 }} />
                <YAxis dataKey="skill" type="category" tick={{ fill: '#96a0c2', fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #22283f', borderRadius: 12 }} />
                <Bar dataKey="weight" radius={[0, 6, 6, 0]}>
                  {demandData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass animate-fade-in rounded-2xl p-6 lg:col-span-1">
          <h3 className="font-display text-sm font-semibold text-fg-muted">Applications by status</h3>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {statusData.map((d) => (
                    <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d1220', border: '1px solid #22283f', borderRadius: 12 }} />
                <Legend
                  formatter={(v) => <span style={{ color: '#96a0c2', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass animate-fade-in rounded-2xl p-6 lg:col-span-2" style={{ animationDelay: '60ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">Recruitment outcomes</h3>
          <div className="mt-4 space-y-3">
            {statusData.map((d) => (
              <div key={d.status} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs capitalize text-fg-muted">{d.status}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-soft">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${applications.length ? (d.count / applications.length) * 100 : 0}%`,
                      background: STATUS_COLORS[d.status],
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-medium">{d.count}</span>
              </div>
            ))}
            {applications.length === 0 && (
              <p className="text-sm text-fg-faint">No applications recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionDashboard() {
  return (
    <RoleGate role="institution">
      <InstitutionDashboardInner />
    </RoleGate>
  );
}
