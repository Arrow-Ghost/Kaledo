import { useEffect, useRef, useState } from 'react';
import RoleGate from '../RoleGate';
import { useSession } from '../../lib/useSession';
import {
  createResume,
  deleteResume,
  getStudentProfile,
  listCertificates,
  listResumes,
  updateResume,
} from '../../lib/db';
import type { ResumeData, ResumeEducation, ResumeExperience, ResumeProject } from '../../lib/types';
import ResumePreview from '../ResumePreview';

const TEMPLATES = [
  'Software Engineering',
  'Data Science',
  'Cybersecurity',
  'Product / Business',
  'Design',
  'Fresher / General',
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function ResumeListView({
  userId,
  resumes,
  onEdit,
  onRefresh,
}: {
  userId: string;
  resumes: ResumeData[];
  onEdit: (id: string) => void;
  onRefresh: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const profile = getStudentProfile(userId);

  function handleCreate(template?: string) {
    const title = template ? `${template} Resume` : newTitle.trim() || 'Untitled Resume';
    const resume = createResume(userId, title, {
      fullName: profile?.headline ? '' : '',
      summary: profile?.bio || '',
      skills: (profile?.skills ?? [])
        .slice()
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((s) => s.skill),
    });
    onRefresh();
    onEdit(resume.id);
  }

  return (
    <div>
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display text-sm font-semibold text-fg-muted">Start a new resume</h3>
        <p className="mt-1 text-xs text-fg-faint">
          Pick a focus area to pre-fill a title, or start blank. Your top assessed skills and
          bio are pulled in automatically.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t} onClick={() => handleCreate(t)} className="pill transition-colors hover:border-fg-faint">
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {creating ? (
            <>
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Resume title"
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
              />
              <button onClick={() => handleCreate()} className="btn-primary !py-2 !text-xs">
                Create
              </button>
            </>
          ) : (
            <button onClick={() => setCreating(true)} className="btn-ghost !py-2 !text-xs">
              + Custom title
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {resumes.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-faint">
            No resumes yet — create one above to apply with a tailored resume.
          </p>
        )}
        {resumes.map((r) => (
          <div key={r.id} className="glass flex items-center justify-between rounded-2xl p-5">
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-fg-faint">
                Updated {new Date(r.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => onEdit(r.id)} className="btn-ghost !py-2 !text-xs">
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${r.title}"? This can't be undone.`)) {
                    deleteResume(r.id);
                    onRefresh();
                  }
                }}
                className="btn-ghost !py-2 !text-xs !text-pink"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListEditor<T extends { id: string }>({
  label,
  items,
  onChange,
  newItem,
  renderFields,
  emptyHint,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  newItem: () => T;
  renderFields: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  emptyHint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-fg-muted">{label}</h4>
        <button
          onClick={() => onChange([...items, newItem()])}
          className="text-xs font-semibold text-cyan hover:underline"
        >
          + Add
        </button>
      </div>
      {items.length === 0 && <p className="mt-2 text-xs text-fg-faint">{emptyHint}</p>}
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="relative rounded-xl border border-line p-4">
            <button
              onClick={() => onChange(items.filter((i) => i.id !== item.id))}
              className="absolute right-3 top-3 text-xs text-fg-faint hover:text-pink"
            >
              remove
            </button>
            <div className="grid gap-3 sm:grid-cols-2">
              {renderFields(item, (patch) =>
                onChange(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label className={`block text-xs ${full ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block font-medium text-fg-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
      />
    </label>
  );
}

function ResumeEditor({
  resume,
  onBack,
  onSaved,
}: {
  resume: ResumeData;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ResumeData>(resume);
  const [skillInput, setSkillInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const certificates = listCertificates(resume.userId);

  function patch<K extends keyof ResumeData>(key: K, value: ResumeData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    updateResume(form.id, form);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 1800);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Please choose an image under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => patch('photoDataUrl', reader.result as string);
    reader.readAsDataURL(file);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) patch('skills', [...form.skills, s]);
    setSkillInput('');
  }

  function addCert(name: string) {
    if (name && !form.certifications.includes(name)) {
      patch('certifications', [...form.certifications, name]);
    }
  }

  function handlePrint() {
    handleSave();
    setTimeout(() => window.print(), 150);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs font-semibold text-fg-muted hover:text-fg">
          ← All resumes
        </button>
        <div className="flex gap-2 print:hidden">
          <button onClick={handleSave} className="btn-ghost !py-2 !text-xs">
            {saved ? 'Saved ✓' : 'Save'}
          </button>
          <button onClick={handlePrint} className="btn-primary !py-2 !text-xs">
            Save as PDF / Print
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 print:block">
        {/* ---------- Form ---------- */}
        <div className="space-y-6 print:hidden">
          <Input label="Resume title" value={form.title} onChange={(v) => patch('title', v)} full />

          <div className="glass space-y-4 rounded-2xl p-5">
            <h4 className="font-display text-sm font-semibold text-fg-muted">Basic info</h4>
            <div className="flex items-center gap-4">
              {form.photoDataUrl ? (
                <img src={form.photoDataUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-soft text-xs text-fg-faint">
                  Photo
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="text-xs" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Full name" value={form.fullName} onChange={(v) => patch('fullName', v)} />
              <Input label="Email" value={form.email} onChange={(v) => patch('email', v)} />
              <Input label="Phone" value={form.phone} onChange={(v) => patch('phone', v)} />
              <Input label="Location" value={form.location} onChange={(v) => patch('location', v)} />
              <Input label="LinkedIn" value={form.linkedin} onChange={(v) => patch('linkedin', v)} />
              <Input label="GitHub" value={form.github} onChange={(v) => patch('github', v)} />
              <Input label="Portfolio URL" value={form.portfolioUrl} onChange={(v) => patch('portfolioUrl', v)} full />
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium text-fg-muted">Summary</span>
              <textarea
                value={form.summary}
                onChange={(e) => patch('summary', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
              />
            </label>
          </div>

          <div className="glass rounded-2xl p-5">
            <ListEditor<ResumeEducation>
              label="Education"
              items={form.education}
              onChange={(items) => patch('education', items)}
              newItem={() => ({ id: uid(), institution: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '', gpa: '' })}
              emptyHint="Add your college / university."
              renderFields={(item, update) => (
                <>
                  <Input label="Institution" value={item.institution} onChange={(v) => update({ institution: v })} full />
                  <Input label="Degree" value={item.degree} onChange={(v) => update({ degree: v })} />
                  <Input label="Field of study" value={item.fieldOfStudy} onChange={(v) => update({ fieldOfStudy: v })} />
                  <Input label="Start year" value={item.startYear} onChange={(v) => update({ startYear: v })} />
                  <Input label="End year" value={item.endYear} onChange={(v) => update({ endYear: v })} />
                  <Input label="GPA / %" value={item.gpa} onChange={(v) => update({ gpa: v })} />
                </>
              )}
            />
          </div>

          <div className="glass space-y-3 rounded-2xl p-5">
            <h4 className="font-display text-sm font-semibold text-fg-muted">School info (10th / 12th)</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="School name" value={form.schoolName} onChange={(v) => patch('schoolName', v)} />
              <Input label="Passout year" value={form.schoolPassoutYear} onChange={(v) => patch('schoolPassoutYear', v)} />
              <Input label="Percentage / GPA" value={form.schoolPercentage} onChange={(v) => patch('schoolPercentage', v)} />
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h4 className="font-display text-sm font-semibold text-fg-muted">Skills</h4>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {form.skills.map((s) => (
                <span key={s} className="pill">
                  {s}
                  <button onClick={() => patch('skills', form.skills.filter((x) => x !== s))} className="ml-1 text-fg-faint hover:text-pink">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
              />
              <button onClick={addSkill} className="btn-ghost !py-2 !text-xs">
                Add
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <ListEditor<ResumeProject>
              label="Projects"
              items={form.projects}
              onChange={(items) => patch('projects', items)}
              newItem={() => ({ id: uid(), title: '', description: '', duration: '', link: '' })}
              emptyHint="Optional, but strongly recommended."
              renderFields={(item, update) => (
                <>
                  <Input label="Title" value={item.title} onChange={(v) => update({ title: v })} full />
                  <label className="block text-xs sm:col-span-2">
                    <span className="mb-1 block font-medium text-fg-muted">Description</span>
                    <textarea
                      value={item.description}
                      onChange={(e) => update({ description: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
                    />
                  </label>
                  <Input label="Duration (optional)" value={item.duration ?? ''} onChange={(v) => update({ duration: v })} />
                  <Input label="Link (optional)" value={item.link ?? ''} onChange={(v) => update({ link: v })} />
                </>
              )}
            />
          </div>

          <div className="glass rounded-2xl p-5">
            <ListEditor<ResumeExperience>
              label="Experience / internships"
              items={form.experience}
              onChange={(items) => patch('experience', items)}
              newItem={() => ({ id: uid(), role: '', organization: '', duration: '', description: '' })}
              emptyHint="Prior internships or jobs, if any."
              renderFields={(item, update) => (
                <>
                  <Input label="Role" value={item.role} onChange={(v) => update({ role: v })} />
                  <Input label="Organization" value={item.organization} onChange={(v) => update({ organization: v })} />
                  <Input label="Duration" value={item.duration} onChange={(v) => update({ duration: v })} full />
                  <label className="block text-xs sm:col-span-2">
                    <span className="mb-1 block font-medium text-fg-muted">Description</span>
                    <textarea
                      value={item.description}
                      onChange={(e) => update({ description: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
                    />
                  </label>
                </>
              )}
            />
          </div>

          <div className="glass rounded-2xl p-5">
            <h4 className="font-display text-sm font-semibold text-fg-muted">Certifications</h4>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {form.certifications.map((c) => (
                <span key={c} className="pill">
                  {c}
                  <button onClick={() => patch('certifications', form.certifications.filter((x) => x !== c))} className="ml-1 text-fg-faint hover:text-pink">
                    ×
                  </button>
                </span>
              ))}
            </div>
            {certificates.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-fg-faint">From your earned certificates:</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {certificates
                    .filter((c) => !form.certifications.includes(c.courseTitle))
                    .map((c) => (
                      <button key={c.id} onClick={() => addCert(c.courseTitle)} className="pill hover:border-cyan/60">
                        + {c.courseTitle}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input
                value={certInput}
                onChange={(e) => setCertInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCert(certInput.trim()), setCertInput(''))}
                placeholder="Add a certification and press Enter"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-violet/60"
              />
            </div>
          </div>
        </div>

        {/* ---------- Preview ---------- */}
        <div className="lg:sticky lg:top-24 lg:self-start print:static">
          <ResumePreview data={form} />
        </div>
      </div>
    </div>
  );
}

function ResumeBuilderInner() {
  const { user } = useSession();
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    if (user) setResumes(listResumes(user.id));
  }

  useEffect(refresh, [user]);

  if (!user) return null;
  const editing = editingId ? resumes.find((r) => r.id === editingId) ?? null : null;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-28 pt-32 print:pt-0">
      <div className="print:hidden">
        <span className="pill">Resume builder</span>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Build a resume that fits the role.
        </h1>
        <p className="mt-2 text-fg-muted">
          Keep several tailored resumes — pick the right one when you apply.
        </p>
      </div>

      <div className="mt-8">
        {editing ? (
          <ResumeEditor
            resume={editing}
            onBack={() => {
              setEditingId(null);
              refresh();
            }}
            onSaved={refresh}
          />
        ) : (
          <ResumeListView userId={user.id} resumes={resumes} onEdit={setEditingId} onRefresh={refresh} />
        )}
      </div>
    </div>
  );
}

export default function ResumeBuilder() {
  return (
    <RoleGate role="student">
      <ResumeBuilderInner />
    </RoleGate>
  );
}
