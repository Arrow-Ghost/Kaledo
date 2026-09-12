export type Role = 'student' | 'industry' | 'academician' | 'institution';

export interface SkillScore {
  skill: string;
  score: number; // 0-100
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  link?: string;
  createdAt: number;
}

export interface StudentProfile {
  userId: string;
  headline: string;
  bio: string;
  interests: string[];
  skills: SkillScore[];
  assessmentCompletedAt: number | null;
  projects: PortfolioProject[];
  enrolledProgramIds: string[];
  completedProgramIds: string[];
}

export interface CompanyProfile {
  userId: string;
  companyName: string;
  industry: string;
  about: string;
  logoColor: string;
}

export interface AcademicianProfile {
  userId: string;
  institution: string;
  department: string;
  about: string;
}

export interface InstitutionProfile {
  userId: string;
  institutionName: string;
  about: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: number;
}

export type OpportunityType = 'internship' | 'job' | 'apprenticeship' | 'project';

export interface Opportunity {
  id: string;
  companyId: string;
  title: string;
  type: OpportunityType;
  location: string;
  remote: boolean;
  stipendOrSalary: string;
  duration: string;
  description: string;
  requiredSkills: SkillScore[]; // importance weighting 0-100
  postedAt: number;
  openings: number;
}

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interview'
  | 'selected'
  | 'rejected';

export interface Application {
  id: string;
  studentId: string;
  opportunityId: string;
  status: ApplicationStatus;
  matchScoreAtApply: number;
  appliedAt: number;
  updatedAt: number;
  note?: string;
  /** Which resume version was actually submitted, preserved permanently even if the
   * student edits or deletes that resume afterward — see ResumeSnapshot. */
  resumeSnapshotId?: string;
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  gpa: string;
}

export interface ResumeProject {
  id: string;
  title: string;
  description: string;
  duration?: string;
  link?: string;
}

export interface ResumeExperience {
  id: string;
  role: string;
  organization: string;
  duration: string;
  description: string;
}

export interface ResumeData {
  id: string;
  userId: string;
  title: string;
  photoDataUrl?: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolioUrl: string;
  summary: string;
  education: ResumeEducation[];
  schoolName: string;
  schoolPassoutYear: string;
  schoolPercentage: string;
  skills: string[];
  projects: ResumeProject[];
  experience: ResumeExperience[];
  certifications: string[];
  createdAt: number;
  updatedAt: number;
}

/** An immutable copy of a ResumeData at the moment it was submitted with an
 * application — so "what did I actually submit?" has a real answer even after the
 * student later edits or deletes that resume (spec: data versioning). */
export interface ResumeSnapshot {
  id: string;
  resumeId: string;
  applicationId: string;
  data: ResumeData;
  takenAt: number;
}

export type ProgramType = 'certification' | 'workshop' | 'mentorship' | 'training';

export interface LearningProgram {
  id: string;
  companyId: string;
  title: string;
  type: ProgramType;
  description: string;
  skillsCovered: string[];
  durationHours: number;
  postedAt: number;
}

export type AcademicOpportunityType =
  | 'fdp'
  | 'consultancy'
  | 'research'
  | 'industrial-training'
  | 'guest-lecture';

export interface AcademicOpportunity {
  id: string;
  companyId: string;
  title: string;
  type: AcademicOpportunityType;
  description: string;
  domain: string;
  postedAt: number;
}

export interface AcademicRegistration {
  id: string;
  academicianId: string;
  opportunityId: string;
  status: 'registered' | 'confirmed' | 'completed';
  registeredAt: number;
}

export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseResourceType = 'YouTube Playlist' | 'YouTube Channel' | 'Free Course' | 'Documentation';

export interface Course {
  id: string;
  title: string;
  category: string;
  skillTags: string[];
  level: CourseLevel;
  provider: string;
  resourceUrl: string;
  resourceType: CourseResourceType;
  description: string;
  curriculum: string[];
  estimatedHours: number;
  quizCategory: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CourseProgress {
  userId: string;
  courseId: string;
  status: 'enrolled' | 'completed';
  enrolledAt: number;
  completedAt: number | null;
  bestScore: number | null;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  recipientName: string;
  score: number;
  issuedAt: number;
}

export interface JobRole {
  id: string;
  title: string;
  category: string;
  description: string;
  idealSkills: SkillScore[];
}

export interface DB {
  users: Record<string, User>;
  studentProfiles: Record<string, StudentProfile>;
  companyProfiles: Record<string, CompanyProfile>;
  academicianProfiles: Record<string, AcademicianProfile>;
  institutionProfiles: Record<string, InstitutionProfile>;
  opportunities: Record<string, Opportunity>;
  applications: Record<string, Application>;
  learningPrograms: Record<string, LearningProgram>;
  academicOpportunities: Record<string, AcademicOpportunity>;
  academicRegistrations: Record<string, AcademicRegistration>;
  resumes: Record<string, ResumeData>;
  resumeSnapshots: Record<string, ResumeSnapshot>;
  courseProgress: Record<string, CourseProgress>;
  certificates: Record<string, Certificate>;
}
