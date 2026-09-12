import { useEffect, useState } from 'react';
import { useSession } from '../../lib/useSession';
import { listVerificationRequestsForReview, reviewVerificationRequest } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface QueueRow {
  id: string;
  user_id: string;
  institution_id: string;
  method: string;
  submitted_at: string;
  institution_users: {
    department: string | null;
    degree: string | null;
    graduation_year: number | null;
    role_at_institution: string;
  } | null;
}

function VerificationQueueInner() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = (await listVerificationRequestsForReview()) as unknown as QueueRow[];
      setRows(data);

      const userIds = Array.from(new Set(data.map((r) => r.user_id)));
      const instIds = Array.from(new Set(data.map((r) => r.institution_id)));

      const [{ data: profiles }, { data: institutions }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', userIds),
        supabase.from('institutions').select('id, official_name').in('id', instIds),
      ]);

      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p: { id: string; full_name: string }) => (map[`user:${p.id}`] = p.full_name));
      (institutions ?? []).forEach(
        (i: { id: string; official_name: string }) => (map[`inst:${i.id}`] = i.official_name)
      );
      setNames(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id: string, approve: boolean) {
    setError('');
    setBusyId(id);
    try {
      await reviewVerificationRequest(id, approve, notes[id]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record this decision.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 pb-28 pt-32">
      <span className="pill">Admin</span>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
        Verification queue
      </h1>
      <p className="mt-2 text-fg-muted">
        Review pending institution verification requests. Approving or rejecting is
        logged to the audit trail.
      </p>

      {error && (
        <div className="mt-6 rounded-xl border border-pink/40 bg-pink/5 px-4 py-3 text-sm text-pink">
          {error}
        </div>
      )}

      <div className="mt-8 space-y-4">
        {rows.length === 0 && (
          <p className="py-12 text-center text-sm text-fg-faint">No pending requests.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{names[`user:${r.user_id}`] ?? 'Unknown user'}</p>
                <p className="text-xs text-fg-faint">
                  {names[`inst:${r.institution_id}`] ?? 'Institution'} ·{' '}
                  {r.institution_users?.role_at_institution ?? 'student'} ·{' '}
                  {r.institution_users?.department ?? '—'}
                  {r.institution_users?.graduation_year ? ` · Class of ${r.institution_users.graduation_year}` : ''}
                </p>
              </div>
              <span className="pill capitalize">{r.method.replace('_', ' ')}</span>
            </div>

            <textarea
              value={notes[r.id] ?? ''}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
              placeholder="Review note (optional)"
              rows={2}
              className="mt-4 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
            />

            <div className="mt-3 flex gap-3">
              <button
                disabled={busyId === r.id}
                onClick={() => decide(r.id, true)}
                className="btn-primary"
              >
                Approve
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => decide(r.id, false)}
                className="btn-ghost"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VerificationQueue() {
  const { roles, ready } = useSession();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const isAdmin = roles.includes('institution_admin') || roles.includes('super_admin');
    if (!isAdmin) {
      setRedirected(true);
      window.location.href = '/';
    }
  }, [ready, roles]);

  if (!ready || redirected) return null;
  return <VerificationQueueInner />;
}
