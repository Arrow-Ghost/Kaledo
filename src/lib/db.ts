import { buildSeedData } from './seed';
import type {
  AcademicOpportunity,
  AcademicRegistration,
  AcademicianProfile,
  Application,
  ApplicationStatus,
  Certificate,
  CompanyProfile,
  CourseProgress,
  DB,
  InstitutionProfile,
  LearningProgram,
  Opportunity,
  ResumeData,
  ResumeSnapshot,
  Role,
  StudentProfile,
  User,
} from './types';

const DB_KEY = 'aip_db_v1';
const SESSION_KEY = 'aip_session_v1';

function isBrowser() {
  return typeof window !== 'undefined';
}

/** Fields added after a user's DB was first seeded won't exist in their stored JSON —
 * default them in rather than letting every Object.values(db.newField) crash. */
function withDefaults(db: DB): DB {
  db.resumes ??= {};
  db.resumeSnapshots ??= {};
  db.courseProgress ??= {};
  db.certificates ??= {};
  return db;
}

function readDB(): DB {
  if (!isBrowser()) return buildSeedData();
  const raw = window.localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = buildSeedData();
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return withDefaults(JSON.parse(raw) as DB);
  } catch {
    const seeded = buildSeedData();
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function writeDB(db: DB) {
  if (!isBrowser()) return;
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent('aip:db-changed'));
}

export function resetDB() {
  if (!isBrowser()) return;
  const seeded = buildSeedData();
  window.localStorage.setItem(DB_KEY, JSON.stringify(seeded));
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('aip:db-changed'));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Session ----------

export function getSession(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function setSession(userId: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, userId);
  window.dispatchEvent(new CustomEvent('aip:db-changed'));
}

export function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent('aip:db-changed'));
}

export function getCurrentUser(): User | null {
  const id = getSession();
  if (!id) return null;
  const db = readDB();
  return db.users[id] ?? null;
}

// ---------- Onboarding ----------

export function createUserAndProfile(params: {
  name: string;
  email: string;
  role: Role;
  extra?: Record<string, string>;
}): User {
  const db = readDB();
  const existing = Object.values(db.users).find(
    (u) => u.email.toLowerCase() === params.email.toLowerCase()
  );
  if (existing) {
    setSession(existing.id);
    return existing;
  }

  const id = uid('user');
  const user: User = {
    id,
    name: params.name,
    email: params.email,
    role: params.role,
    createdAt: Date.now(),
  };
  db.users[id] = user;

  if (params.role === 'student') {
    const profile: StudentProfile = {
      userId: id,
      headline: params.extra?.headline || 'Aspiring professional',
      bio: params.extra?.bio || '',
      interests: [],
      skills: [],
      assessmentCompletedAt: null,
      projects: [],
      enrolledProgramIds: [],
      completedProgramIds: [],
    };
    db.studentProfiles[id] = profile;
  } else if (params.role === 'industry') {
    const profile: CompanyProfile = {
      userId: id,
      companyName: params.extra?.companyName || params.name,
      industry: params.extra?.industry || 'Technology',
      about: params.extra?.about || '',
      logoColor: ['#6ee7ff', '#a78bfa', '#fb7185', '#34d399', '#fbbf24'][
        Math.floor(Math.random() * 5)
      ],
    };
    db.companyProfiles[id] = profile;
  } else if (params.role === 'academician') {
    const profile: AcademicianProfile = {
      userId: id,
      institution: params.extra?.institution || '',
      department: params.extra?.department || '',
      about: params.extra?.about || '',
    };
    db.academicianProfiles[id] = profile;
  } else if (params.role === 'institution') {
    const profile: InstitutionProfile = {
      userId: id,
      institutionName: params.extra?.institutionName || params.name,
      about: params.extra?.about || '',
    };
    db.institutionProfiles[id] = profile;
  }

  writeDB(db);
  setSession(id);
  return user;
}

// ---------- Students ----------

export function getStudentProfile(userId: string): StudentProfile | null {
  const db = readDB();
  return db.studentProfiles[userId] ?? null;
}

export function saveAssessment(userId: string, skills: { skill: string; score: number }[]) {
  const db = readDB();
  const profile = db.studentProfiles[userId];
  if (!profile) return;
  profile.skills = skills;
  profile.assessmentCompletedAt = Date.now();
  writeDB(db);
}

export function addProject(userId: string, title: string, description: string, link?: string) {
  const db = readDB();
  const profile = db.studentProfiles[userId];
  if (!profile) return;
  profile.projects.unshift({
    id: uid('proj'),
    title,
    description,
    link,
    createdAt: Date.now(),
  });
  writeDB(db);
}

export function enrollInProgram(userId: string, programId: string) {
  const db = readDB();
  const profile = db.studentProfiles[userId];
  if (!profile) return;
  if (!profile.enrolledProgramIds.includes(programId)) {
    profile.enrolledProgramIds.push(programId);
    writeDB(db);
  }
}

export function markProgramComplete(userId: string, programId: string) {
  const db = readDB();
  const profile = db.studentProfiles[userId];
  if (!profile) return;
  if (!profile.completedProgramIds.includes(programId)) {
    profile.completedProgramIds.push(programId);
    writeDB(db);
  }
}

// ---------- Opportunities & Applications ----------

export function listOpportunities(): Opportunity[] {
  const db = readDB();
  return Object.values(db.opportunities).sort((a, b) => b.postedAt - a.postedAt);
}

export function getOpportunity(id: string): Opportunity | null {
  const db = readDB();
  return db.opportunities[id] ?? null;
}

export function createOpportunity(op: Omit<Opportunity, 'id' | 'postedAt'>): Opportunity {
  const db = readDB();
  const full: Opportunity = { ...op, id: uid('opp'), postedAt: Date.now() };
  db.opportunities[full.id] = full;
  writeDB(db);
  return full;
}

export function listApplicationsForStudent(studentId: string): Application[] {
  const db = readDB();
  return Object.values(db.applications)
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.appliedAt - a.appliedAt);
}

export function listApplicationsForCompany(companyId: string): Application[] {
  const db = readDB();
  const myOppIds = new Set(
    Object.values(db.opportunities)
      .filter((o) => o.companyId === companyId)
      .map((o) => o.id)
  );
  return Object.values(db.applications)
    .filter((a) => myOppIds.has(a.opportunityId))
    .sort((a, b) => b.appliedAt - a.appliedAt);
}

export function applyToOpportunity(
  studentId: string,
  opportunityId: string,
  matchScore: number,
  resumeId?: string
): Application | null {
  const db = readDB();
  const already = Object.values(db.applications).find(
    (a) => a.studentId === studentId && a.opportunityId === opportunityId
  );
  if (already) return already;
  const app: Application = {
    id: uid('app'),
    studentId,
    opportunityId,
    status: 'applied',
    matchScoreAtApply: matchScore,
    appliedAt: Date.now(),
    updatedAt: Date.now(),
  };

  const resume = resumeId ? db.resumes[resumeId] : undefined;
  if (resume) {
    const snapshotId = uid('snap');
    db.resumeSnapshots[snapshotId] = {
      id: snapshotId,
      resumeId: resume.id,
      applicationId: app.id,
      data: { ...resume },
      takenAt: Date.now(),
    };
    app.resumeSnapshotId = snapshotId;
  }

  db.applications[app.id] = app;
  writeDB(db);
  return app;
}

export function updateApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const db = readDB();
  const app = db.applications[applicationId];
  if (!app) return;
  app.status = status;
  app.updatedAt = Date.now();
  writeDB(db);
}

// ---------- Learning programs ----------

export function listLearningPrograms(): LearningProgram[] {
  const db = readDB();
  return Object.values(db.learningPrograms).sort((a, b) => b.postedAt - a.postedAt);
}

export function createLearningProgram(
  p: Omit<LearningProgram, 'id' | 'postedAt'>
): LearningProgram {
  const db = readDB();
  const full: LearningProgram = { ...p, id: uid('lp'), postedAt: Date.now() };
  db.learningPrograms[full.id] = full;
  writeDB(db);
  return full;
}

// ---------- Academic opportunities ----------

export function listAcademicOpportunities(): AcademicOpportunity[] {
  const db = readDB();
  return Object.values(db.academicOpportunities).sort((a, b) => b.postedAt - a.postedAt);
}

export function createAcademicOpportunity(
  a: Omit<AcademicOpportunity, 'id' | 'postedAt'>
): AcademicOpportunity {
  const db = readDB();
  const full: AcademicOpportunity = { ...a, id: uid('ao'), postedAt: Date.now() };
  db.academicOpportunities[full.id] = full;
  writeDB(db);
  return full;
}

export function registerForAcademicOpportunity(
  academicianId: string,
  opportunityId: string
): AcademicRegistration | null {
  const db = readDB();
  const already = Object.values(db.academicRegistrations).find(
    (r) => r.academicianId === academicianId && r.opportunityId === opportunityId
  );
  if (already) return already;
  const reg: AcademicRegistration = {
    id: uid('reg'),
    academicianId,
    opportunityId,
    status: 'registered',
    registeredAt: Date.now(),
  };
  db.academicRegistrations[reg.id] = reg;
  writeDB(db);
  return reg;
}

export function listRegistrationsForAcademician(academicianId: string): AcademicRegistration[] {
  const db = readDB();
  return Object.values(db.academicRegistrations)
    .filter((r) => r.academicianId === academicianId)
    .sort((a, b) => b.registeredAt - a.registeredAt);
}

// ---------- Company lookups ----------

export function getCompanyProfile(userId: string): CompanyProfile | null {
  const db = readDB();
  return db.companyProfiles[userId] ?? null;
}

export function getAllCompanyProfiles(): Record<string, CompanyProfile> {
  const db = readDB();
  return db.companyProfiles;
}

export function getUser(userId: string): User | null {
  const db = readDB();
  return db.users[userId] ?? null;
}

// ---------- Phase 1/2 seam ----------
// Identity now lives in Supabase (real auth + roles + verification, see lib/auth.ts).
// Opportunities/applications/skills/matching still live here in localStorage until
// Phase 2/4 migrate them. Both are keyed by the same real Supabase user id, but a
// brand-new Supabase user has no matching localStorage feature-profile yet — without
// this, every existing dashboard silently renders blank for a first-time real user.
// Called once by RoleGate right after auth+role+verification pass, before children
// render, so it stays a single deliberate seam rather than scattered null-checks.
/** The bit of real onboarding data ensureFeatureProfile needs to seed the bridge
 * correctly. Kept as a loose inline shape (rather than importing the Supabase-side
 * types) so db.ts stays independent of the auth layer per the Phase 1/2 seam design —
 * callers just pass whichever fields they have. */
interface RoleOnboardingSeed {
  headline?: string | null;
  bio?: string | null;
  department?: string | null;
  degree?: string | null;
  graduation_year?: number | null;
  company_name?: string | null;
  industry?: string | null;
  about?: string | null;
}

export function ensureFeatureProfile(
  user: { id: string; name: string; email: string; role: Role },
  roleProfile?: RoleOnboardingSeed | null
) {
  const db = readDB();
  let changed = false;

  if (!db.users[user.id]) {
    db.users[user.id] = { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: Date.now() };
    changed = true;
  }

  if (user.role === 'student' && !db.studentProfiles[user.id]) {
    db.studentProfiles[user.id] = {
      userId: user.id,
      headline: roleProfile?.headline || 'Aspiring professional',
      bio: roleProfile?.bio || '',
      interests: [],
      skills: [],
      assessmentCompletedAt: null,
      projects: [],
      enrolledProgramIds: [],
      completedProgramIds: [],
    };
    changed = true;
  } else if (user.role === 'industry' && !db.companyProfiles[user.id]) {
    db.companyProfiles[user.id] = {
      userId: user.id,
      companyName: roleProfile?.company_name || user.name,
      industry: roleProfile?.industry || 'Technology',
      about: roleProfile?.about || '',
      logoColor: ['#6ee7ff', '#a78bfa', '#fb7185', '#34d399', '#fbbf24'][Math.floor(Math.random() * 5)],
    };
    changed = true;
  } else if (user.role === 'academician' && !db.academicianProfiles[user.id]) {
    db.academicianProfiles[user.id] = {
      userId: user.id,
      institution: '',
      department: roleProfile?.department || '',
      about: roleProfile?.bio || '',
    };
    changed = true;
  } else if (user.role === 'institution' && !db.institutionProfiles[user.id]) {
    db.institutionProfiles[user.id] = { userId: user.id, institutionName: user.name, about: '' };
    changed = true;
  }

  // If the bridge already exists but is still holding the generic first-run defaults
  // (e.g. it was created before onboarding finished saving to Supabase, or before this
  // fix shipped), backfill it once real data becomes available rather than leaving
  // "Aspiring professional" stuck forever.
  if (!changed && roleProfile) {
    if (user.role === 'student') {
      const p = db.studentProfiles[user.id];
      if (p && p.headline === 'Aspiring professional' && roleProfile.headline) {
        p.headline = roleProfile.headline;
        if (!p.bio && roleProfile.bio) p.bio = roleProfile.bio;
        changed = true;
      }
    } else if (user.role === 'industry') {
      const p = db.companyProfiles[user.id];
      if (p && p.companyName === user.name && roleProfile.company_name) {
        p.companyName = roleProfile.company_name;
        if (roleProfile.industry) p.industry = roleProfile.industry;
        if (!p.about && roleProfile.about) p.about = roleProfile.about;
        changed = true;
      }
    } else if (user.role === 'academician') {
      const p = db.academicianProfiles[user.id];
      if (p && !p.department && roleProfile.department) {
        p.department = roleProfile.department;
        if (!p.about && roleProfile.bio) p.about = roleProfile.bio;
        changed = true;
      }
    }
  }

  if (changed) writeDB(db);
}

export function getAcademicianProfileSafe(userId: string): AcademicianProfile | null {
  const db = readDB();
  return db.academicianProfiles[userId] ?? null;
}

export function getInstitutionProfile(userId: string): InstitutionProfile | null {
  const db = readDB();
  return db.institutionProfiles[userId] ?? null;
}

// ---------- Institution analytics ----------

export function getAllStudentProfiles(): StudentProfile[] {
  const db = readDB();
  return Object.values(db.studentProfiles);
}

export function getAllApplications(): Application[] {
  const db = readDB();
  return Object.values(db.applications);
}

export function getAllOpportunities(): Opportunity[] {
  const db = readDB();
  return Object.values(db.opportunities);
}

// ---------- Resumes ----------

export function listResumes(userId: string): ResumeData[] {
  const db = readDB();
  return Object.values(db.resumes)
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getResume(id: string): ResumeData | null {
  const db = readDB();
  return db.resumes[id] ?? null;
}

export function createResume(userId: string, title: string, seed?: Partial<ResumeData>): ResumeData {
  const db = readDB();
  const now = Date.now();
  const resume: ResumeData = {
    id: uid('resume'),
    userId,
    title,
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolioUrl: '',
    summary: '',
    education: [],
    schoolName: '',
    schoolPassoutYear: '',
    schoolPercentage: '',
    skills: [],
    projects: [],
    experience: [],
    certifications: [],
    createdAt: now,
    updatedAt: now,
    ...seed,
  };
  db.resumes[resume.id] = resume;
  writeDB(db);
  return resume;
}

export function updateResume(id: string, patch: Partial<ResumeData>) {
  const db = readDB();
  const resume = db.resumes[id];
  if (!resume) return;
  Object.assign(resume, patch, { updatedAt: Date.now() });
  writeDB(db);
}

export function deleteResume(id: string) {
  const db = readDB();
  delete db.resumes[id];
  writeDB(db);
}

export function getResumeSnapshot(id: string): ResumeSnapshot | null {
  const db = readDB();
  return db.resumeSnapshots[id] ?? null;
}

// ---------- Courses, progress & certificates ----------

export function getCourseProgress(userId: string, courseId: string): CourseProgress | null {
  const db = readDB();
  return db.courseProgress[`${userId}:${courseId}`] ?? null;
}

export function listCourseProgressForUser(userId: string): CourseProgress[] {
  const db = readDB();
  return Object.values(db.courseProgress).filter((p) => p.userId === userId);
}

export function enrollInCourse(userId: string, courseId: string) {
  const db = readDB();
  const key = `${userId}:${courseId}`;
  if (db.courseProgress[key]) return;
  db.courseProgress[key] = {
    userId,
    courseId,
    status: 'enrolled',
    enrolledAt: Date.now(),
    completedAt: null,
    bestScore: null,
  };
  writeDB(db);
}

/**
 * Records a quiz attempt. Passing (score >= 70) marks the course completed and, the
 * first time only, mints a certificate — a real, self-contained record students can
 * view/download, not a claim of third-party accreditation.
 */
export function recordQuizAttempt(
  userId: string,
  courseId: string,
  courseTitle: string,
  recipientName: string,
  score: number
): { passed: boolean; certificate: Certificate | null } {
  const db = readDB();
  const key = `${userId}:${courseId}`;
  const progress = db.courseProgress[key] ?? {
    userId,
    courseId,
    status: 'enrolled' as const,
    enrolledAt: Date.now(),
    completedAt: null,
    bestScore: null,
  };
  progress.bestScore = Math.max(progress.bestScore ?? 0, score);

  const passed = score >= 70;
  let certificate: Certificate | null = null;

  if (passed) {
    progress.status = 'completed';
    progress.completedAt = progress.completedAt ?? Date.now();

    const existing = Object.values(db.certificates).find(
      (c) => c.userId === userId && c.courseId === courseId
    );
    if (existing) {
      certificate = existing;
    } else {
      certificate = {
        id: uid('cert'),
        userId,
        courseId,
        courseTitle,
        recipientName,
        score,
        issuedAt: Date.now(),
      };
      db.certificates[certificate.id] = certificate;
    }
  }

  db.courseProgress[key] = progress;
  writeDB(db);
  return { passed, certificate };
}

export function listCertificates(userId: string): Certificate[] {
  const db = readDB();
  return Object.values(db.certificates)
    .filter((c) => c.userId === userId)
    .sort((a, b) => b.issuedAt - a.issuedAt);
}

export { readDB };
