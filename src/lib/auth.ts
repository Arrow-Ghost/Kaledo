import { supabase } from './supabase';
import type {
  AppRole,
  FacultyOnboardingProfile,
  Institution,
  IndustryOnboardingProfile,
  InstitutionUser,
  Profile,
  RoleAtInstitution,
  StudentOnboardingProfile,
  VerificationMethod,
  VerificationRequest,
} from './auth-types';

// Google OAuth credentials are configured in Supabase Dashboard → Authentication →
// Providers → Google (callback URL: https://tcjxdimjckuuequrctdr.supabase.co/auth/v1/callback).
export const GOOGLE_OAUTH_ENABLED = true;

// ---------- Auth ----------

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** scope 'global' signs the user out of every device/session, not just this one. */
export async function signOut(scope: 'local' | 'global' = 'local') {
  const { error } = await supabase.auth.signOut({ scope });
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------- Roles (server-enforced: RLS + SECURITY DEFINER RPCs, never client-trusted) ----------

export async function getMyRoles(): Promise<AppRole[]> {
  const { data, error } = await supabase.rpc('get_my_roles');
  if (error) throw error;
  return (data ?? []) as AppRole[];
}

/** Can only grant student/faculty/industry — institution_admin/super_admin are rejected server-side. */
export async function claimInitialRole(role: AppRole) {
  const { error } = await supabase.rpc('claim_initial_role', { _role: role });
  if (error) throw error;
}

// ---------- Profile ----------

export async function getMyProfile(): Promise<Profile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userRes.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(patch: Partial<Omit<Profile, 'id'>>) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userRes.user.id);
  if (error) throw error;
}

export async function upsertStudentProfile(fields: {
  headline?: string;
  bio?: string;
  department?: string;
  degree?: string;
  graduation_year?: number;
  student_id?: string;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('student_profiles')
    .upsert({ user_id: userRes.user.id, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function upsertFacultyProfile(fields: {
  headline?: string;
  bio?: string;
  department?: string;
  designation?: string;
  faculty_id?: string;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('faculty_profiles')
    .upsert({ user_id: userRes.user.id, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function upsertIndustryProfile(fields: {
  company_name?: string;
  industry?: string;
  about?: string;
  designation?: string;
}) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('Not signed in.');
  const { error } = await supabase
    .from('industry_profiles')
    .upsert({ user_id: userRes.user.id, ...fields, updated_at: new Date().toISOString() });
  if (error) throw error;
}

// Read-side counterparts to the upserts above. Without these, onboarding data (the
// headline/company-name/etc a user actually typed in) was captured in Supabase but
// never read back anywhere — every dashboard just showed the localStorage bridge's
// hardcoded defaults ("Aspiring professional", company name = the user's own name).

export async function getMyStudentProfile(): Promise<StudentOnboardingProfile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userRes.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as StudentOnboardingProfile | null;
}

export async function getMyFacultyProfile(): Promise<FacultyOnboardingProfile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from('faculty_profiles')
    .select('*')
    .eq('user_id', userRes.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as FacultyOnboardingProfile | null;
}

export async function getMyIndustryProfile(): Promise<IndustryOnboardingProfile | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from('industry_profiles')
    .select('*')
    .eq('user_id', userRes.user.id)
    .maybeSingle();
  if (error) throw error;
  return data as IndustryOnboardingProfile | null;
}

// ---------- Institutions ----------

export async function searchInstitutions(query: string): Promise<Institution[]> {
  let request = supabase.from('institutions').select('*').order('official_name').limit(20);
  if (query.trim()) {
    request = request.or(`official_name.ilike.%${query}%,aliases.cs.{${query}}`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function getInstitutionDomains(institutionId: string) {
  const { data, error } = await supabase
    .from('institution_domains')
    .select('*')
    .eq('institution_id', institutionId);
  if (error) throw error;
  return data ?? [];
}

export async function requestNewInstitution(fields: {
  official_name: string;
  country: string;
  state?: string;
  city?: string;
  website?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('request_new_institution', {
    _official_name: fields.official_name,
    _country: fields.country,
    _state: fields.state ?? null,
    _city: fields.city ?? null,
    _website: fields.website ?? null,
  });
  if (error) throw error;
  return data as string;
}

// ---------- Verification ----------

export async function submitVerificationRequest(params: {
  institution_id: string;
  method: VerificationMethod;
  role_at_institution: RoleAtInstitution;
  department?: string;
  degree?: string;
  graduation_year?: number;
  id_number?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_verification_request', {
    _institution_id: params.institution_id,
    _method: params.method,
    _role_at_institution: params.role_at_institution,
    _department: params.department ?? null,
    _degree: params.degree ?? null,
    _graduation_year: params.graduation_year ?? null,
    _id_number: params.id_number ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function getMyVerificationRequests(): Promise<VerificationRequest[]> {
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// supabase-js's functions.invoke() throws a FunctionsHttpError whose .message is the
// generic "Edge Function returned a non-2xx status code" — the actual `{ error }` body
// our functions send back (e.g. "xyz.edu is not a recognized email domain...") is only
// reachable via error.context, a raw Response. Unwrap it so the UI can show the real
// reason instead of a useless generic string.
async function unwrapFunctionError(error: unknown): Promise<Error> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return new Error(body.error);
    } catch {
      // response wasn't JSON — fall through to the generic message below
    }
  }
  return error instanceof Error ? error : new Error('Something went wrong. Please try again.');
}

export async function sendInstitutionOtp(verificationRequestId: string, targetEmail: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not signed in.');

  const backendUrl = (import.meta.env.PUBLIC_BACKEND_URL as string | undefined)?.replace(/\/$/, '');
  if (backendUrl) {
    try {
      const res = await fetch(`${backendUrl}/api/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verification_request_id: verificationRequestId,
          target_email: targetEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code.');
      return data as { sent: boolean; dev_mode: boolean; message?: string; expires_in_minutes: number };
    } catch (err) {
      console.warn('Backend API call failed, attempting Supabase fallback:', err);
      // Fall through to Edge Function if custom backend errored
    }
  }

  const { data, error } = await supabase.functions.invoke('send-institution-otp', {
    body: { verification_request_id: verificationRequestId, target_email: targetEmail },
  });
  if (error) throw await unwrapFunctionError(error);
  return data as { sent: boolean; dev_mode: boolean; message?: string; expires_in_minutes: number };
}

export async function verifyInstitutionOtp(verificationRequestId: string, code: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const backendUrl = (import.meta.env.PUBLIC_BACKEND_URL as string | undefined)?.replace(/\/$/, '');
  if (backendUrl && token) {
    try {
      const res = await fetch(`${backendUrl}/api/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          verification_request_id: verificationRequestId,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify code.');
      return data as { verified: boolean };
    } catch (err) {
      console.warn('Backend API call failed, attempting Supabase fallback:', err);
      // Fall through to Edge Function
    }
  }

  const { error, data } = await supabase.functions.invoke('verify-institution-otp', {
    body: { verification_request_id: verificationRequestId, code },
  });
  if (error) throw await unwrapFunctionError(error);
  return data as { verified: boolean };
}

export async function uploadVerificationDocument(
  verificationRequestId: string,
  file: File,
  docType: string
) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) throw new Error('Not signed in.');

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(file.type)) {
    throw new Error('Only JPG, PNG, WEBP, or PDF files are accepted.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('File must be smaller than 8MB.');
  }

  const path = `${userRes.user.id}/${verificationRequestId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('verification-documents')
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('verification_documents').insert({
    verification_request_id: verificationRequestId,
    storage_path: path,
    doc_type: docType,
  });
  if (error) throw error;
}

// ---------- Admin: verification review queue ----------

export async function listVerificationRequestsForReview(institutionId?: string) {
  let request = supabase
    .from('verification_requests')
    .select('*, institution_users(department, degree, graduation_year, role_at_institution)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });
  if (institutionId) request = request.eq('institution_id', institutionId);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function reviewVerificationRequest(
  requestId: string,
  approve: boolean,
  notes?: string
) {
  const { error } = await supabase.rpc('review_verification_request', {
    _request_id: requestId,
    _approve: approve,
    _notes: notes ?? null,
  });
  if (error) throw error;
}

export async function getMyInstitutionUserRows(): Promise<InstitutionUser[]> {
  const { data, error } = await supabase.from('institution_users').select('*');
  if (error) throw error;
  return data ?? [];
}
