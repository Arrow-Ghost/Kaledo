// Generates and (when an email provider is configured) delivers a one-time code to
// verify that the caller controls an institutional email address matching a known
// domain for their claimed institution. Never fabricates delivery: if no email
// provider secret is configured, the response says so explicitly (dev_mode) instead
// of pretending an email was sent.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const MAX_REQUESTS_PER_HOUR = 5;
const OTP_TTL_MINUTES = 10;

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

    const { verification_request_id, target_email } = await req.json();
    if (!verification_request_id || !target_email) {
      return jsonResponse({ error: 'verification_request_id and target_email are required.' }, 400);
    }

    // User-scoped client: RLS ensures the caller can only see their own request.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: request, error: reqError } = await userClient
      .from('verification_requests')
      .select('id, user_id, institution_id, method, status')
      .eq('id', verification_request_id)
      .single();

    if (reqError || !request) {
      return jsonResponse({ error: 'Verification request not found or not yours.' }, 404);
    }
    if (request.method !== 'domain_otp') {
      return jsonResponse({ error: 'This request is not using domain OTP verification.' }, 400);
    }
    if (request.status === 'verified') {
      return jsonResponse({ error: 'This request is already verified.' }, 400);
    }

    const domain = target_email.split('@')[1]?.toLowerCase();
    if (!domain) return jsonResponse({ error: 'Invalid email address.' }, 400);

    const { data: domainRow } = await userClient
      .from('institution_domains')
      .select('domain')
      .eq('institution_id', request.institution_id)
      .eq('domain', domain)
      .maybeSingle();

    if (!domainRow) {
      return jsonResponse(
        { error: `${domain} is not a recognized email domain for this institution.` },
        400
      );
    }

    // Service-role client for the actual write (otp_codes has no client-facing RLS
    // policies by design; only this function, running with the service role, may
    // write to it).
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await serviceClient
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('verification_request_id', verification_request_id)
      .gte('created_at', oneHourAgo);

    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return jsonResponse({ error: 'Too many code requests. Try again later.' }, 429);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await sha256(`${code}:${verification_request_id}`);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    await serviceClient.from('otp_codes').insert({
      verification_request_id,
      code_hash: codeHash,
      target_email,
      expires_at: expiresAt,
    });

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const emailFrom = Deno.env.get('VERIFICATION_EMAIL_FROM') ?? 'Kaledo <verify@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: target_email,
          subject: 'Your Kaledo verification code',
          html: `<p>Your verification code is <strong>${code}</strong>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
        }),
      });
      if (!res.ok) {
        console.error('Resend delivery failed', await res.text());
        return jsonResponse({ error: 'Could not send verification email. Please try again.' }, 502);
      }
      return jsonResponse({ sent: true, dev_mode: false, expires_in_minutes: OTP_TTL_MINUTES });
    }

    // No email provider configured: do not pretend delivery happened.
    console.log(`[dev_mode] OTP for verification_request ${verification_request_id}: ${code}`);
    return jsonResponse({
      sent: false,
      dev_mode: true,
      message: 'No email provider configured (RESEND_API_KEY unset). Code was generated and logged server-side for local testing only — this must not run like this in production.',
      expires_in_minutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: 'Unexpected error sending verification code.' }, 500);
  }
});
