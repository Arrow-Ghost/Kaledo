// Validates a one-time code against the hash stored by send-institution-otp. On
// success, marks the institution_users/verification_requests rows verified and writes
// an audit trail entry — this is the one place domain-based verification actually
// flips to "verified", so it runs with the service role after independently checking
// the request belongs to the caller.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const MAX_ATTEMPTS = 5;

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header.' }, 401);

    const { verification_request_id, code } = await req.json();
    if (!verification_request_id || !code) {
      return jsonResponse({ error: 'verification_request_id and code are required.' }, 400);
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userResult } = await userClient.auth.getUser();
    const callerId = userResult?.user?.id;
    if (!callerId) return jsonResponse({ error: 'Invalid session.' }, 401);

    const { data: request, error: reqError } = await userClient
      .from('verification_requests')
      .select('id, user_id, institution_id, institution_user_id, status')
      .eq('id', verification_request_id)
      .single();

    if (reqError || !request || request.user_id !== callerId) {
      return jsonResponse({ error: 'Verification request not found or not yours.' }, 404);
    }
    if (request.status === 'verified') {
      return jsonResponse({ error: 'This request is already verified.' }, 400);
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: otpRow } = await serviceClient
      .from('otp_codes')
      .select('id, code_hash, expires_at, attempts, consumed_at')
      .eq('verification_request_id', verification_request_id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return jsonResponse({ error: 'No active code found. Request a new one.' }, 400);
    }
    if (new Date(otpRow.expires_at) < new Date()) {
      return jsonResponse({ error: 'Code expired. Request a new one.' }, 400);
    }
    if (otpRow.attempts >= MAX_ATTEMPTS) {
      return jsonResponse({ error: 'Too many incorrect attempts. Request a new code.' }, 429);
    }

    const candidateHash = await sha256(`${code}:${verification_request_id}`);
    if (candidateHash !== otpRow.code_hash) {
      await serviceClient
        .from('otp_codes')
        .update({ attempts: otpRow.attempts + 1 })
        .eq('id', otpRow.id);
      return jsonResponse(
        { error: 'Incorrect code.', attempts_remaining: MAX_ATTEMPTS - (otpRow.attempts + 1) },
        400
      );
    }

    await serviceClient.from('otp_codes').update({ consumed_at: new Date().toISOString() }).eq('id', otpRow.id);

    await serviceClient
      .from('verification_requests')
      .update({ status: 'verified', reviewed_at: new Date().toISOString(), notes: 'Auto-verified via institutional email OTP.' })
      .eq('id', verification_request_id);

    if (request.institution_user_id) {
      await serviceClient
        .from('institution_users')
        .update({ status: 'verified', updated_at: new Date().toISOString() })
        .eq('id', request.institution_user_id);
    }

    await serviceClient.from('verification_events').insert({
      verification_request_id,
      event_type: 'verified_via_otp',
      actor_id: callerId,
      metadata: {},
    });

    await serviceClient.from('audit_logs').insert({
      actor_id: callerId,
      action: 'verification_approved',
      target_table: 'verification_requests',
      target_id: verification_request_id,
      metadata: { method: 'domain_otp' },
    });

    return jsonResponse({ verified: true });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: 'Unexpected error verifying code.' }, 500);
  }
});
