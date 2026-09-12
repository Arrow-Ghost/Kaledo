import { useEffect, useMemo, useState } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  getAcademicianProfileSafe,
  getAllCompanyProfiles,
  listAcademicOpportunities,
  listRegistrationsForAcademician,
  registerForAcademicOpportunity,
} from '../../lib/db';
import type { AcademicOpportunity, AcademicOpportunityType, AcademicRegistration } from '../../lib/types';

const TYPE_LABEL: Record<AcademicOpportunityType, string> = {
  fdp: 'Faculty Development Program',
  consultancy: 'Consultancy',
  research: 'Research Collaboration',
  'industrial-training': 'Industrial Training',
  'guest-lecture': 'Guest Lecture',
};

function AcademicianDashboardInner() {
  const { user } = useSession();
  const [opportunities, setOpportunities] = useState<AcademicOpportunity[]>([]);
  const [registrations, setRegistrations] = useState<AcademicRegistration[]>([]);
  const [companies, setCompanies] = useState(getAllCompanyProfiles());
  const [typeFilter, setTypeFilter] = useState<AcademicOpportunityType | 'all'>('all');

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      setOpportunities(listAcademicOpportunities());
      setRegistrations(listRegistrationsForAcademician(user.id));
      setCompanies(getAllCompanyProfiles());
    };
    refresh();
    window.addEventListener('aip:db-changed', refresh);
    return () => window.removeEventListener('aip:db-changed', refresh);
  }, [user]);

  const registeredIds = useMemo(
    () => new Set(registrations.map((r) => r.opportunityId)),
    [registrations]
  );

  const filtered = opportunities.filter((o) => typeFilter === 'all' || o.type === typeFilter);

  if (!user) return null;
  const profile = getAcademicianProfileSafe(user.id);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-32">
      <div className="animate-fade-in">
        <span className="pill">Academician portal</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          {profile?.institution || 'Your'} collaboration opportunities.
        </h1>
        <p className="mt-2 text-fg-muted">
          FDPs, consultancy, industrial training, and research collaborations from industry
          partners.
        </p>
      </div>

      <div className="animate-fade-in mt-8 flex flex-wrap gap-2">
        {(['all', 'fdp', 'consultancy', 'research', 'industrial-training', 'guest-lecture'] as const).map(
          (t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`pill transition-colors ${
                typeFilter === t ? 'border-violet/60 bg-violet/10 text-fg' : ''
              }`}
            >
              {t === 'all' ? 'All types' : TYPE_LABEL[t]}
            </button>
          )
        )}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {filtered.map((o, i) => {
          const registered = registeredIds.has(o.id);
          const reg = registrations.find((r) => r.opportunityId === o.id);
          return (
            <div
              key={o.id}
              className="glass animate-fade-in flex flex-col rounded-2xl p-6"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-ink"
                  style={{ background: companies[o.companyId]?.logoColor || '#a78bfa' }}
                >
                  {companies[o.companyId]?.companyName?.[0] || 'C'}
                </span>
                <span className="pill">{TYPE_LABEL[o.type]}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold">{o.title}</h3>
              <p className="text-xs text-fg-faint">
                {companies[o.companyId]?.companyName} · {o.domain}
              </p>
              <p className="mt-2 flex-1 text-sm text-fg-muted">{o.description}</p>
              <div className="mt-4">
                {registered ? (
                  <div className="pill w-full justify-center bg-cyan/10 text-cyan capitalize">
                    {reg?.status} ✓
                  </div>
                ) : (
                  <button
                    onClick={() => registerForAcademicOpportunity(user.id, o.id)}
                    className="btn-primary w-full"
                  >
                    Register interest
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AcademicianDashboard() {
  return (
    <RoleGate role="academician">
      <AcademicianDashboardInner />
    </RoleGate>
  );
}
