// Types for the real Supabase-backed identity layer (Phase 1). Deliberately separate
// from src/lib/types.ts, which still describes the localStorage-backed feature data
// (skills/opportunities/applications) that Phase 2/4 will migrate — see README.

export type AppRole =
  | 'student'
  | 'faculty'
  | 'industry'
  | 'recruiter'
  | 'institution_admin'
  | 'super_admin';

export const SELF_ASSIGNABLE_ROLES: AppRole[] = ['student', 'faculty', 'industry'];

export interface StudentOnboardingProfile {
  user_id: string;
  headline: string;
  bio: string;
  department: string | null;
  degree: string | null;
  graduation_year: number | null;
}

export interface FacultyOnboardingProfile {
  user_id: string;
  headline: string;
  bio: string;
  department: string | null;
  designation: string | null;
}

export interface IndustryOnboardingProfile {
  user_id: string;
  company_name: string;
  industry: string | null;
  about: string;
  designation: string | null;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  avatar_url: string | null;
}

export interface Institution {
  id: string;
  official_name: string;
  aliases: string[];
  country: string;
  state: string | null;
  city: string | null;
  website: string | null;
  type: string;
  verification_status: 'pending' | 'verified' | 'rejected';
}

export interface InstitutionDomain {
  id: string;
  institution_id: string;
  domain: string;
  is_primary: boolean;
}

export type VerificationMethod = 'domain_otp' | 'id_upload' | 'manual';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type RoleAtInstitution = 'student' | 'faculty' | 'staff' | 'admin';

export interface VerificationRequest {
  id: string;
  user_id: string;
  institution_id: string;
  institution_user_id: string | null;
  method: VerificationMethod;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
}

export interface InstitutionUser {
  id: string;
  user_id: string;
  institution_id: string;
  role_at_institution: RoleAtInstitution;
  department: string | null;
  degree: string | null;
  graduation_year: number | null;
  id_number: string | null;
  status: VerificationStatus;
}
