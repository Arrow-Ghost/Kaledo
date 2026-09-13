import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/useSession';
import {
  claimInitialRole,
  getInstitutionDomains,
  requestNewInstitution,
  searchInstitutions,
  sendInstitutionOtp,
  submitVerificationRequest,
  upsertFacultyProfile,
  upsertIndustryProfile,
  upsertStudentProfile,
  uploadVerificationDocument,
  verifyInstitutionOtp,
} from '../lib/auth';
import type { AppRole, Institution, InstitutionDomain } from '../lib/auth-types';

const ROLE_OPTIONS: { role: AppRole; title: string; desc: string; badge: string }[] = [
  {
    role: 'student',
    title: 'Student',
    desc: 'Map your skills, discover roles, apply to internships & jobs, build your portfolio.',
    badge: 'bg-cyan/15 text-cyan',
  },
  {
    role: 'faculty',
    title: 'Academician / Faculty',
    desc: 'Explore FDPs, consultancy, industrial training, and research collaborations.',
    badge: 'bg-pink/15 text-pink',
  },
  {
    role: 'industry',
    title: 'Industry',
    desc: 'Post internships, jobs & learning programs. Find and shortlist matched candidates.',
    badge: 'bg-violet/15 text-violet',
  },
];

type Step = 'role' | 'profile' | 'institution' | 'otp' | 'upload' | 'submitted';

export default function Onboarding() {
  const { user, roles, verification, hasAuthSession, ready } = useSession();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<AppRole | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // profile fields
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [degree, setDegree] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [designation, setDesignation] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');

  // institution search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [domains, setDomains] = useState<InstitutionDomain[]>([]);
  const [notListed, setNotListed] = useState(false);
  const [newInstName, setNewInstName] = useState('');

  // verification
  const [targetEmail, setTargetEmail] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!hasAuthSession) {
      window.location.href = '/auth/sign-in';
      return;
    }
    if (user) {
      // role already claimed
      if (verification === 'none' && (user.role === 'student' || user.role === 'academician')) {
        setRole(roles[0]);
        setStep('institution');
      } else {
        window.location.href = `/${user.role}/dashboard`;
      }
    }
  }, [ready, hasAuthSession, user, verification, roles]);

  useEffect(() => {
    if (step !== 'institution' || notListed) return;
    const t = setTimeout(() => {
      searchInstitutions(query).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, step, notListed]);

  async function handleClaimRole(r: AppRole) {
    setError('');
    setBusy(true);
    try {
      await claimInitialRole(r);
      setRole(r);
      setStep('profile');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not set your role.');
    } finally {
      setBusy(false);
    }
  }

  async function handleProfileSubmit() {
    if (!role) return;
    setError('');
    setBusy(true);
    try {
      if (role === 'student') {
        await upsertStudentProfile({
          headline,
          bio,
          department,
          degree,
          graduation_year: gradYear ? Number(gradYear) : undefined,
        });
        setStep('institution');
      } else if (role === 'faculty') {
        await upsertFacultyProfile({ headline, bio, department, designation });
        setStep('institution');
      } else {
        await upsertIndustryProfile({ company_name: companyName, industry, about: bio, designation });
        window.location.href = '/industry/dashboard';
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  async function selectInstitution(inst: Institution) {
    setSelectedInstitution(inst);
    setError('');
    try {
      setDomains(await getInstitutionDomains(inst.id));
    } catch {
      setDomains([]);
    }
  }

  async function handleRequestNewInstitution() {
    if (!newInstName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const id = await requestNewInstitution({ official_name: newInstName.trim(), country: 'India' });
      await selectInstitution({
        id,
        official_name: newInstName.trim(),
        aliases: [],
        country: 'India',
        state: null,
        city: null,
        website: null,
        type: 'other',
        verification_status: 'pending',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add this institution.');
    } finally {
      setBusy(false);
    }
  }

  async function startDomainVerification() {
    if (!selectedInstitution || !role) return;
    setError('');
    setBusy(true);
    try {
      const id = await submitVerificationRequest({
        institution_id: selectedInstitution.id,
        method: 'domain_otp',
        role_at_institution: role === 'faculty' ? 'faculty' : 'student',
        department,
        degree,
        graduation_year: gradYear ? Number(gradYear) : undefined,
      });
      setRequestId(id);
      await sendInstitutionOtp(id, targetEmail);
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start verification.');
    } finally {
      setBusy(false);
    }
  }

  async function startFallbackVerification(method: 'id_upload' | 'manual') {
    if (!selectedInstitution || !role) return;
    setError('');
    setBusy(true);
    try {
      const id = await submitVerificationRequest({
        institution_id: selectedInstitution.id,
        method,
        role_at_institution: role === 'faculty' ? 'faculty' : 'student',
        department,
        degree,
        graduation_year: gradYear ? Number(gradYear) : undefined,
      });
      setRequestId(id);
      if (method === 'id_upload') {
        setStep('upload');
      } else {
        setStep('submitted');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit verification request.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!requestId) return;
    setOtpError('');
    setBusy(true);
    try {
      await verifyInstitutionOtp(requestId, otp);
      window.location.href = `/${role === 'faculty' ? 'academician' : 'student'}/dashboard`;
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'Incorrect or expired code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadSubmit() {
    if (!requestId || !file) return;
    setError('');
    setBusy(true);
    try {
      await uploadVerificationDocument(requestId, file, 'id_card');
      setStep('submitted');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !hasAuthSession) return <span data-app-loading="true" className="hidden" />;

  return (
    <div className="mx-auto max-w-3xl px-6 py-28">
      <div className="text-center">
        <span className="pill">Get started</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Let's set up your <span className="gradient-text">Kaledo</span> workspace
        </h1>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-pink/40 bg-pink/5 px-4 py-3 text-sm text-pink">
          {error}
        </div>
      )}

      {step === 'role' && (
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.role}
              disabled={busy}
              onClick={() => handleClaimRole(r.role)}
              className="glass glass-hover rounded-2xl p-5 text-left transition-all disabled:opacity-50"
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg font-display font-bold ${r.badge}`}>
                {r.title[0]}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">{r.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{r.desc}</p>
            </button>
          ))}
        </div>
      )}

      {step === 'profile' && role && (
        <div className="glass mt-10 space-y-4 rounded-2xl p-6 sm:p-8">
          {role === 'student' && (
            <>
              <Field label="Headline" value={headline} onChange={setHeadline} placeholder="e.g. 3rd year CS student" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department" value={department} onChange={setDepartment} placeholder="Computer Science" />
                <Field label="Degree" value={degree} onChange={setDegree} placeholder="B.Tech" />
              </div>
              <Field label="Graduation year" value={gradYear} onChange={setGradYear} placeholder="2027" type="number" />
              <TextArea label="Short bio" value={bio} onChange={setBio} />
            </>
          )}
          {role === 'faculty' && (
            <>
              <Field label="Headline" value={headline} onChange={setHeadline} placeholder="e.g. Assistant Professor, CSE" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department" value={department} onChange={setDepartment} placeholder="Computer Science" />
                <Field label="Designation" value={designation} onChange={setDesignation} placeholder="Assistant Professor" />
              </div>
              <TextArea label="Short bio" value={bio} onChange={setBio} />
            </>
          )}
          {role === 'industry' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Company name" value={companyName} onChange={setCompanyName} placeholder="Acme Corp" />
                <Field label="Industry" value={industry} onChange={setIndustry} placeholder="Fintech" />
              </div>
              <Field label="Your designation" value={designation} onChange={setDesignation} placeholder="Talent Acquisition Lead" />
              <TextArea label="About the company" value={bio} onChange={setBio} />
            </>
          )}
          <button disabled={busy} onClick={handleProfileSubmit} className="btn-primary w-full sm:w-auto">
            {busy ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      )}

      {step === 'institution' && (
        <div className="glass mt-10 space-y-5 rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold">Verify your institution</h3>
          <p className="text-sm text-fg-muted">
            We use this to confirm you're really affiliated with your college before
            unlocking your dashboard.
          </p>

          {!selectedInstitution && !notListed && (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for your institution…"
                className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-violet/60"
              />
              <div className="space-y-2">
                {results.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => selectInstitution(inst)}
                    className="block w-full rounded-xl border border-line px-4 py-3 text-left text-sm transition-colors hover:border-fg-faint"
                  >
                    <span className="font-medium">{inst.official_name}</span>
                    {inst.city && <span className="text-fg-faint"> · {inst.city}, {inst.state}</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setNotListed(true)}
                className="text-xs font-semibold text-cyan hover:underline"
              >
                My institution isn't listed
              </button>
            </>
          )}

          {notListed && !selectedInstitution && (
            <div className="space-y-3">
              <Field label="Institution name" value={newInstName} onChange={setNewInstName} placeholder="Your college / university" />
              <div className="flex gap-3">
                <button disabled={busy} onClick={handleRequestNewInstitution} className="btn-primary">
                  Add & continue
                </button>
                <button onClick={() => setNotListed(false)} className="btn-ghost">
                  Back to search
                </button>
              </div>
            </div>
          )}

          {selectedInstitution && (
            <div className="space-y-4">
              <div className="rounded-xl border border-violet/40 bg-violet/5 px-4 py-3 text-sm">
                Selected: <strong>{selectedInstitution.official_name}</strong>
                <button
                  onClick={() => {
                    setSelectedInstitution(null);
                    setDomains([]);
                  }}
                  className="ml-3 text-xs text-fg-faint hover:underline"
                >
                  change
                </button>
              </div>

              {domains.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-fg-muted">
                    We recognize{' '}
                    {domains.length === 1 ? (
                      <>
                        the email domain <strong>@{domains[0].domain}</strong>
                      </>
                    ) : (
                      <>
                        these email domains:{' '}
                        <strong>{domains.map((d) => `@${d.domain}`).join(', ')}</strong>
                      </>
                    )}{' '}
                    for this institution.
                  </p>
                  <Field
                    label="Your institutional email"
                    value={targetEmail}
                    onChange={setTargetEmail}
                    placeholder={`you@${domains[0].domain}`}
                    type="email"
                  />
                  <button disabled={busy || !targetEmail} onClick={startDomainVerification} className="btn-primary">
                    {busy ? 'Sending code…' : 'Send verification code'}
                  </button>
                  <p className="text-xs text-fg-faint">
                    None of these match your real institutional email?{' '}
                    <button
                      onClick={() => startFallbackVerification('id_upload')}
                      className="font-semibold text-cyan hover:underline"
                    >
                      Upload an ID card instead
                    </button>{' '}
                    or{' '}
                    <button
                      onClick={() => startFallbackVerification('manual')}
                      className="font-semibold text-cyan hover:underline"
                    >
                      request manual review
                    </button>
                    .
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-fg-muted">
                    No known email domain on file for this institution yet. Upload an ID
                    card, or request manual review by a platform admin.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button disabled={busy} onClick={() => startFallbackVerification('id_upload')} className="btn-primary">
                      Upload ID card
                    </button>
                    <button disabled={busy} onClick={() => startFallbackVerification('manual')} className="btn-ghost">
                      Request manual review
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'otp' && (
        <div className="glass mt-10 space-y-4 rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold">Enter your verification code</h3>
          <p className="text-sm text-fg-muted">
            We sent a 6-digit code to {targetEmail}. It expires in 10 minutes.
          </p>
          {otpError && <p className="text-sm text-pink">{otpError}</p>}
          <Field label="6-digit code" value={otp} onChange={setOtp} placeholder="123456" />
          <button disabled={busy || otp.length < 6} onClick={handleVerifyOtp} className="btn-primary">
            {busy ? 'Verifying…' : 'Verify & finish'}
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div className="glass mt-10 space-y-4 rounded-2xl p-6 sm:p-8">
          <h3 className="font-display text-lg font-semibold">Upload your ID card</h3>
          <p className="text-sm text-fg-muted">JPG, PNG, WEBP, or PDF, up to 8MB.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-fg-muted file:mr-4 file:rounded-full file:border-0 file:bg-surface-soft file:px-4 file:py-2 file:text-sm file:font-medium"
          />
          <button disabled={busy || !file} onClick={handleUploadSubmit} className="btn-primary">
            {busy ? 'Uploading…' : 'Submit for review'}
          </button>
        </div>
      )}

      {step === 'submitted' && (
        <div className="glass mt-10 space-y-3 rounded-2xl p-8 text-center">
          <span className="pill">Submitted</span>
          <h3 className="font-display text-xl font-semibold">Your verification is under review</h3>
          <p className="text-sm text-fg-muted">
            An institution or platform admin will review your request. You'll be able to
            check the status any time.
          </p>
          <a href="/verification/status" className="btn-primary mt-4 inline-flex">
            View status →
          </a>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-fg-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-fg outline-none transition-colors focus:border-violet/60"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-fg-muted">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-fg outline-none transition-colors focus:border-violet/60"
      />
    </label>
  );
}
