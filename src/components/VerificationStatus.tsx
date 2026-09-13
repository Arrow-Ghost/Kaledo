import { useEffect, useState } from 'react';
import { useSession } from '../lib/useSession';
import { getMyVerificationRequests, sendInstitutionOtp, verifyInstitutionOtp } from '../lib/auth';
import type { VerificationRequest } from '../lib/auth-types';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber/15 text-amber',
  verified: 'bg-cyan/15 text-cyan',
  rejected: 'bg-pink/15 text-pink',
};

const METHOD_LABEL: Record<string, string> = {
  domain_otp: 'Institutional email (OTP)',
  id_upload: 'ID card upload',
  manual: 'Manual review',
};

function VerificationStatusInner() {
  const { user, ready, hasAuthSession } = useSession();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [institutionNames, setInstitutionNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [resendId, setResendId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!hasAuthSession) {
      window.location.href = '/auth/sign-in';
      return;
    }
    load();
  }, [ready, hasAuthSession]);

  async function load() {
    setLoading(true);
    try {
      const reqs = await getMyVerificationRequests();
      setRequests(reqs);
      const ids = Array.from(new Set(reqs.map((r) => r.institution_id)));
      const names: Record<string, string> = {};
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.from('institutions').select('id, official_name').in('id', ids);
      (data ?? []).forEach((i: { id: string; official_name: string }) => {
        names[i.id] = i.official_name;
      });
      setInstitutionNames(names);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend(req: VerificationRequest) {
    setError('');
    setBusy(true);
    try {
      await sendInstitutionOtp(req.id, otpEmail);
      setOtpInfo(`Code sent to ${otpEmail}.`);
      setResendId(req.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(req: VerificationRequest) {
    setError('');
    setBusy(true);
    try {
      await verifyInstitutionOtp(req.id, otp);
      await load();
      setResendId(null);
      setOtp('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect or expired code.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || loading) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 pb-28 pt-32">
      <span className="pill">Verification status</span>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
        Hi {user?.name?.split(' ')[0] ?? 'there'}, here's where things stand.
      </h1>

      <div className="mt-8 space-y-4">
        {requests.length === 0 && (
          <div className="glass rounded-2xl p-6 text-sm text-fg-muted">
            No verification requests yet.{' '}
            <a href="/onboarding" className="font-semibold text-cyan hover:underline">
              Start verification →
            </a>
          </div>
        )}
        {requests.map((req) => (
          <div key={req.id} className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{institutionNames[req.institution_id] ?? 'Institution'}</p>
                <p className="text-xs text-fg-faint">{METHOD_LABEL[req.method]}</p>
              </div>
              <span className={`pill capitalize ${STATUS_STYLES[req.status]}`}>{req.status}</span>
            </div>
            {req.notes && <p className="mt-3 text-sm text-fg-muted">Admin note: {req.notes}</p>}

            {req.status === 'pending' && req.method === 'domain_otp' && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {error && <p className="text-sm text-pink">{error}</p>}
                {otpInfo && resendId === req.id && <p className="text-sm text-fg-muted">{otpInfo}</p>}
                <div className="flex flex-wrap gap-2">
                  <input
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="Institutional email"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
                  />
                  <button disabled={busy || !otpEmail} onClick={() => handleResend(req)} className="btn-ghost">
                    Send code
                  </button>
                </div>
                {resendId === req.id && (
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="w-40 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
                    />
                    <button disabled={busy || otp.length < 6} onClick={() => handleVerify(req)} className="btn-primary">
                      Verify
                    </button>
                  </div>
                )}
              </div>
            )}

            {req.status === 'rejected' && (
              <a href="/onboarding" className="btn-primary mt-4 inline-flex">
                Submit a new request →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VerificationStatus() {
  return <VerificationStatusInner />;
}
