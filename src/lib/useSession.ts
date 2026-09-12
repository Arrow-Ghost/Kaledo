import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  getMyFacultyProfile,
  getMyIndustryProfile,
  getMyInstitutionUserRows,
  getMyProfile,
  getMyRoles,
  getMyStudentProfile,
} from './auth';
import type {
  AppRole,
  FacultyOnboardingProfile,
  IndustryOnboardingProfile,
  StudentOnboardingProfile,
} from './auth-types';
import type { Role, User } from './types';

const ROLES_REQUIRING_INSTITUTION_VERIFICATION: AppRole[] = ['student', 'faculty'];

// The Phase-1 database uses the spec's role names (student/faculty/industry/
// recruiter/institution_admin/super_admin). The pre-existing localStorage-backed
// dashboards (Phase 2+ scope, untouched here) were built against a 4-value Role
// enum (student/industry/academician/institution). Rather than rename every already
// working dashboard/RoleGate call, adapt real roles onto that shape so they keep
// working unmodified; new Phase-1 surfaces (admin verification queue, Nav links)
// read the raw `roles` list instead.
const ROLE_ADAPTER: Record<AppRole, Role> = {
  student: 'student',
  industry: 'industry',
  recruiter: 'industry',
  faculty: 'academician',
  institution_admin: 'institution',
  super_admin: 'institution',
};

// A user can hold multiple roles (e.g. a student who is also granted super_admin for
// the verification queue). `get_my_roles()` has no defined ordering, so picking
// roles[0] as "primary" would be nondeterministic — someone could get randomly
// bounced between /student/dashboard and /institution/dashboard on every reload.
// Admin capability is additive, not someone's substantive identity, so it ranks
// lowest here: a student+super_admin lands on the student dashboard by default and
// reaches admin tools via the separate "Verification Queue" nav link (which checks
// the raw `roles` list, not this adapted one).
const ROLE_PRIORITY: AppRole[] = ['student', 'faculty', 'industry', 'recruiter', 'institution_admin', 'super_admin'];

function pickPrimaryRole(roles: AppRole[]): AppRole | null {
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate;
  }
  return roles[0] ?? null;
}

export type VerificationState = 'not_required' | 'none' | 'pending' | 'verified' | 'rejected';

interface SessionState {
  /** Adapted to the same shape src/lib/types.ts#User already used, so every
   * existing localStorage-backed dashboard (student/industry/academician/
   * institution) keeps working unmodified against the real Supabase identity. */
  user: User | null;
  roles: AppRole[];
  verification: VerificationState;
  /** True as soon as there is a real Supabase auth session, even before a role has
   * been claimed — lets RoleGate tell "not signed in" apart from "signed in, still
   * mid-onboarding" instead of redirecting both to the same place. */
  hasAuthSession: boolean;
  /** The actual data the user typed in onboarding (headline, company name, ...),
   * matching whichever role is primary. RoleGate feeds this into
   * ensureFeatureProfile() so the localStorage bridge is seeded with what the user
   * really entered instead of generic placeholders. */
  roleProfile: StudentOnboardingProfile | FacultyOnboardingProfile | IndustryOnboardingProfile | null;
  ready: boolean;
}

async function loadSession(): Promise<SessionState> {
  const { data: userRes } = await supabase.auth.getUser();
  const authUser = userRes.user;
  if (!authUser)
    return {
      user: null,
      roles: [],
      verification: 'not_required',
      hasAuthSession: false,
      roleProfile: null,
      ready: true,
    };

  const [roles, profile, institutionRows] = await Promise.all([
    getMyRoles(),
    getMyProfile(),
    getMyInstitutionUserRows(),
  ]);

  const primaryAppRole = pickPrimaryRole(roles as AppRole[]);
  const primaryRole = primaryAppRole ? ROLE_ADAPTER[primaryAppRole] : null;

  const roleProfile =
    primaryAppRole === 'student'
      ? await getMyStudentProfile()
      : primaryAppRole === 'faculty'
        ? await getMyFacultyProfile()
        : primaryAppRole === 'industry' || primaryAppRole === 'recruiter'
          ? await getMyIndustryProfile()
          : null;

  let verification: VerificationState = 'not_required';
  if (primaryAppRole && ROLES_REQUIRING_INSTITUTION_VERIFICATION.includes(primaryAppRole)) {
    if (institutionRows.some((r) => r.status === 'verified')) verification = 'verified';
    else if (institutionRows.some((r) => r.status === 'pending')) verification = 'pending';
    else if (institutionRows.some((r) => r.status === 'rejected')) verification = 'rejected';
    else verification = 'none';
  }

  const user: User | null = primaryRole
    ? {
        id: authUser.id,
        name: profile?.full_name || authUser.email || 'Member',
        email: authUser.email ?? '',
        role: primaryRole,
        createdAt: authUser.created_at ? Date.parse(authUser.created_at) : Date.now(),
      }
    : null; // signed in but hasn't completed onboarding (no role claimed yet)

  return { user, roles, verification, hasAuthSession: true, roleProfile, ready: true };
}

export function useSession() {
  const [state, setState] = useState<SessionState>({
    user: null,
    roles: [],
    verification: 'not_required',
    hasAuthSession: false,
    roleProfile: null,
    ready: false,
  });

  useEffect(() => {
    let mounted = true;

    loadSession().then((s) => mounted && setState(s));

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadSession().then((s) => mounted && setState(s));
    });

    const handler = () => loadSession().then((s) => mounted && setState(s));
    window.addEventListener('aip:db-changed', handler);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('aip:db-changed', handler);
    };
  }, []);

  return state;
}
