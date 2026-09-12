import type { ResumeData } from '../lib/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="font-display text-xs font-bold uppercase tracking-wider text-neutral-500">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Read-only, print-styled resume rendering — shared by the builder's live preview and
 * the recruiter's "view submitted resume" modal, so both always render identically. */
export default function ResumePreview({ data: form, id = 'resume-preview' }: { data: ResumeData; id?: string }) {
  return (
    <div id={id} className="rounded-2xl bg-white p-8 text-neutral-900 shadow-2xl print:rounded-none print:p-0 print:shadow-none">
      <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
        {form.photoDataUrl && <img src={form.photoDataUrl} alt="" className="h-20 w-20 rounded-full object-cover" />}
        <div>
          <h2 className="font-display text-2xl font-bold">{form.fullName || 'Your Name'}</h2>
          <p className="text-sm text-neutral-600">
            {[form.email, form.phone, form.location].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-neutral-500">
            {[form.linkedin, form.github, form.portfolioUrl].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {form.summary && (
        <Section title="Summary">
          <p className="text-sm text-neutral-700">{form.summary}</p>
        </Section>
      )}

      {form.education.length > 0 && (
        <Section title="Education">
          {form.education.map((ed) => (
            <div key={ed.id} className="mb-2 text-sm">
              <p className="font-semibold">
                {ed.institution} {ed.degree && `— ${ed.degree}`}
                {ed.fieldOfStudy && `, ${ed.fieldOfStudy}`}
              </p>
              <p className="text-xs text-neutral-500">
                {[ed.startYear && ed.endYear ? `${ed.startYear}–${ed.endYear}` : '', ed.gpa && `GPA/%: ${ed.gpa}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          ))}
        </Section>
      )}

      {form.schoolName && (
        <Section title="Schooling">
          <p className="text-sm text-neutral-700">
            {form.schoolName}
            {form.schoolPassoutYear && ` · Class of ${form.schoolPassoutYear}`}
            {form.schoolPercentage && ` · ${form.schoolPercentage}`}
          </p>
        </Section>
      )}

      {form.skills.length > 0 && (
        <Section title="Skills">
          <p className="text-sm text-neutral-700">{form.skills.join(' · ')}</p>
        </Section>
      )}

      {form.projects.length > 0 && (
        <Section title="Projects">
          {form.projects.map((p) => (
            <div key={p.id} className="mb-2 text-sm">
              <p className="font-semibold">
                {p.title} {p.duration && <span className="font-normal text-neutral-500">({p.duration})</span>}
              </p>
              <p className="text-neutral-700">{p.description}</p>
              {p.link && <p className="text-xs text-blue-600">{p.link}</p>}
            </div>
          ))}
        </Section>
      )}

      {form.experience.length > 0 && (
        <Section title="Experience">
          {form.experience.map((ex) => (
            <div key={ex.id} className="mb-2 text-sm">
              <p className="font-semibold">
                {ex.role} · {ex.organization} <span className="font-normal text-neutral-500">({ex.duration})</span>
              </p>
              <p className="text-neutral-700">{ex.description}</p>
            </div>
          ))}
        </Section>
      )}

      {form.certifications.length > 0 && (
        <Section title="Certifications">
          <p className="text-sm text-neutral-700">{form.certifications.join(' · ')}</p>
        </Section>
      )}
    </div>
  );
}
