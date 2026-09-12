import { useEffect, useState, type FormEvent } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  addProject,
  getAllCompanyProfiles,
  getStudentProfile,
  listApplicationsForStudent,
  listCertificates,
  listLearningPrograms,
  listOpportunities,
} from '../../lib/db';
import type { Application, Certificate, LearningProgram, Opportunity, StudentProfile } from '../../lib/types';
import SkillRadar from '../SkillRadar';
import CertificateView from '../CertificateView';

function PortfolioInner() {
  const { user } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [programs, setPrograms] = useState<LearningProgram[]>([]);
  const [companies, setCompanies] = useState(getAllCompanyProfiles());
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', link: '' });

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setProfile(getStudentProfile(user.id));
      setApplications(listApplicationsForStudent(user.id));
      setOpportunities(listOpportunities());
      setPrograms(listLearningPrograms());
      setCompanies(getAllCompanyProfiles());
      setCertificates(listCertificates(user.id));
    };
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
  }, [user]);

  if (!user || !profile) return null;

  const opportunityMap = new Map(opportunities.map((o) => [o.id, o]));
  const selected = applications.filter((a) => a.status === 'selected');
  const completedPrograms = programs.filter((p) => profile.completedProgramIds.includes(p.id));

  function submitProject(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    addProject(user!.id, form.title.trim(), form.description.trim(), form.link.trim() || undefined);
    setForm({ title: '', description: '', link: '' });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="pill">Digital portfolio</span>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">{user.name}</h1>
          <p className="mt-2 text-fg-muted">{profile.headline}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass animate-fade-in rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold text-fg-muted">Verified skills</h3>
          {profile.assessmentCompletedAt ? (
            <SkillRadar data={profile.skills} height={260} />
          ) : (
            <p className="mt-6 text-sm text-fg-faint">Take the assessment to populate this.</p>
          )}
        </div>

        <div className="glass animate-fade-in rounded-2xl p-6" style={{ animationDelay: '60ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">Certifications</h3>
          <div className="mt-4 space-y-3">
            {completedPrograms.length === 0 && certificates.length === 0 && (
              <p className="text-sm text-fg-faint">
                Complete a learning program or course assessment to earn your first
                certificate.
              </p>
            )}
            {completedPrograms.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-3">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-fg-faint">{companies[p.companyId]?.companyName}</p>
              </div>
            ))}
            {certificates.map((c) => (
              <div key={c.id} className="rounded-xl border border-cyan/30 bg-cyan/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{c.courseTitle}</p>
                    <p className="text-xs text-fg-faint">
                      Score {c.score}% · {new Date(c.issuedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setExpandedCertId(expandedCertId === c.id ? null : c.id)}
                    className="shrink-0 text-xs font-semibold text-cyan hover:underline"
                  >
                    {expandedCertId === c.id ? 'Hide' : 'View'}
                  </button>
                </div>
                {expandedCertId === c.id && (
                  <div className="mt-3">
                    <CertificateView certificate={c} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass animate-fade-in rounded-2xl p-6" style={{ animationDelay: '120ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">
            Internship & placement record
          </h3>
          <div className="mt-4 space-y-3">
            {selected.length === 0 && (
              <p className="text-sm text-fg-faint">
                Selected offers will appear here automatically.
              </p>
            )}
            {selected.map((a) => {
              const o = opportunityMap.get(a.opportunityId);
              if (!o) return null;
              return (
                <div key={a.id} className="rounded-xl border border-cyan/30 bg-cyan/5 p-3">
                  <p className="text-sm font-medium">{o.title}</p>
                  <p className="text-xs text-fg-faint">{companies[o.companyId]?.companyName}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="glass animate-fade-in rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-sm font-semibold text-fg-muted">Projects</h3>
          <div className="mt-4 space-y-3">
            {profile.projects.length === 0 && (
              <p className="text-sm text-fg-faint">Add a project to showcase your work.</p>
            )}
            {profile.projects.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.title}</p>
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-cyan hover:underline">
                      View →
                    </a>
                  )}
                </div>
                <p className="mt-1 text-sm text-fg-muted">{p.description}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submitProject} className="glass animate-fade-in rounded-2xl p-6" style={{ animationDelay: '60ms' }}>
          <h3 className="font-display text-sm font-semibold text-fg-muted">Add a project</h3>
          <div className="mt-4 space-y-3">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Project title"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description"
              rows={3}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
            />
            <input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="Link (optional)"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
            />
            <button type="submit" className="btn-primary w-full">
              Add to portfolio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Portfolio() {
  return (
    <RoleGate role="student">
      <PortfolioInner />
    </RoleGate>
  );
}
