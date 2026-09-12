import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
const allowedOrigins = [
  'http://localhost:4321',
  'http://localhost:3000',
  'http://127.0.0.1:4321',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive CORS for hackathon/preview environments
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());

// Supabase Clients
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function getUserClient(authHeader) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ----------------------------------------------------
// Health Check Routes (Required for Render Keep-Alive)
// ----------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'kaledo-backend',
    message: 'Kaledo Academia x Industry Collaboration API is running on Render',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    supabaseConfigured: Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    supabaseConfigured: Boolean(supabaseUrl && (supabaseServiceRoleKey || supabaseAnonKey)),
  });
});

// ----------------------------------------------------
// OTP Authentication & Verification Endpoints
// ----------------------------------------------------
app.post('/api/otp/send', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header.' });
    }

    const { verification_request_id, target_email } = req.body;
    if (!verification_request_id || !target_email) {
      return res.status(400).json({
        error: 'verification_request_id and target_email are required.',
      });
    }

    const userClient = getUserClient(authHeader);
    if (!userClient) {
      return res.status(500).json({ error: 'Supabase configuration is missing on server.' });
    }

    const { data: request, error: reqError } = await userClient
      .from('verification_requests')
      .select('id, user_id, institution_id, method, status')
      .eq('id', verification_request_id)
      .single();

    if (reqError || !request) {
      return res.status(404).json({ error: 'Verification request not found or not yours.' });
    }
    if (request.method !== 'domain_otp') {
      return res.status(400).json({ error: 'This request is not using domain OTP verification.' });
    }
    if (request.status === 'verified') {
      return res.status(400).json({ error: 'This request is already verified.' });
    }

    const domain = target_email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const { data: domainRow } = await userClient
      .from('institution_domains')
      .select('domain')
      .eq('institution_id', request.institution_id)
      .eq('domain', domain)
      .maybeSingle();

    if (!domainRow) {
      return res.status(400).json({
        error: `${domain} is not a recognized email domain for this institution.`,
      });
    }

    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing on backend server.' });
    }

    const MAX_REQUESTS_PER_HOUR = 5;
    const OTP_TTL_MINUTES = 10;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { count } = await serviceClient
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('verification_request_id', verification_request_id)
      .gte('created_at', oneHourAgo);

    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return res.status(429).json({ error: 'Too many code requests. Try again later.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = sha256(`${code}:${verification_request_id}`);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    await serviceClient.from('otp_codes').insert({
      verification_request_id,
      code_hash: codeHash,
      target_email,
      expires_at: expiresAt,
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const emailFrom = process.env.VERIFICATION_EMAIL_FROM || 'Kaledo <verify@resend.dev>';
      const emailRes = await fetch('https://api.resend.com/emails', {
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

      if (!emailRes.ok) {
        console.error('Resend delivery failed', await emailRes.text());
        return res.status(502).json({ error: 'Could not send verification email. Please try again.' });
      }

      return res.json({ sent: true, dev_mode: false, expires_in_minutes: OTP_TTL_MINUTES });
    }

    // Dev mode fallback
    console.log(`[DEV MODE] Generated OTP for verification_request ${verification_request_id}: ${code}`);
    return res.json({
      sent: false,
      dev_mode: true,
      code: process.env.NODE_ENV !== 'production' ? code : undefined,
      message: 'Email provider not configured. OTP generated in dev mode.',
      expires_in_minutes: OTP_TTL_MINUTES,
    });
  } catch (err) {
    console.error('Error in /api/otp/send:', err);
    return res.status(500).json({ error: 'Internal server error while sending verification code.' });
  }
});

app.post('/api/otp/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header.' });
    }

    const { verification_request_id, code } = req.body;
    if (!verification_request_id || !code) {
      return res.status(400).json({ error: 'verification_request_id and code are required.' });
    }

    const userClient = getUserClient(authHeader);
    if (!userClient) {
      return res.status(500).json({ error: 'Supabase configuration is missing on server.' });
    }

    const { data: userResult } = await userClient.auth.getUser();
    const callerId = userResult?.user?.id;
    if (!callerId) {
      return res.status(401).json({ error: 'Invalid session token.' });
    }

    const { data: request, error: reqError } = await userClient
      .from('verification_requests')
      .select('id, user_id, institution_id, institution_user_id, status')
      .eq('id', verification_request_id)
      .single();

    if (reqError || !request || request.user_id !== callerId) {
      return res.status(404).json({ error: 'Verification request not found or not yours.' });
    }
    if (request.status === 'verified') {
      return res.status(400).json({ error: 'This request is already verified.' });
    }

    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing on backend server.' });
    }

    const MAX_ATTEMPTS = 5;
    const { data: otpRow } = await serviceClient
      .from('otp_codes')
      .select('id, code_hash, expires_at, attempts, consumed_at')
      .eq('verification_request_id', verification_request_id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return res.status(400).json({ error: 'No active code found. Request a new one.' });
    }
    if (new Date(otpRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }
    if (otpRow.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    }

    const candidateHash = sha256(`${code}:${verification_request_id}`);
    if (candidateHash !== otpRow.code_hash) {
      await serviceClient
        .from('otp_codes')
        .update({ attempts: otpRow.attempts + 1 })
        .eq('id', otpRow.id);
      return res.status(400).json({
        error: 'Incorrect code.',
        attempts_remaining: MAX_ATTEMPTS - (otpRow.attempts + 1),
      });
    }

    // Mark code consumed
    await serviceClient
      .from('otp_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    // Update verification request
    await serviceClient
      .from('verification_requests')
      .update({
        status: 'verified',
        reviewed_at: new Date().toISOString(),
        notes: 'Auto-verified via institutional email OTP.',
      })
      .eq('id', verification_request_id);

    // Update institution user status
    if (request.institution_user_id) {
      await serviceClient
        .from('institution_users')
        .update({ status: 'verified', updated_at: new Date().toISOString() })
        .eq('id', request.institution_user_id);
    }

    // Audit logs & verification events
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

    return res.json({ verified: true });
  } catch (err) {
    console.error('Error in /api/otp/verify:', err);
    return res.status(500).json({ error: 'Internal server error while verifying OTP.' });
  }
});

// ----------------------------------------------------
// AI Recommendation Gateway (Gemini / Groq integration)
// ----------------------------------------------------
app.post('/api/ai/recommend', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return res.json({
        success: true,
        source: 'mock',
        recommendation:
          'Consider prioritizing Full-Stack Web Development, Cloud Deployments, and System Design based on current industry trends.',
      });
    }

    // Live Gemini 1.5/2.0 API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are an AI career and skill advisor for students on the Kaledo platform. ${
                    context ? 'Context: ' + JSON.stringify(context) : ''
                  }\nPrompt: ${prompt || 'Suggest top 3 high-impact skills to learn next.'}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return res.json({
      success: true,
      source: 'gemini',
      recommendation: candidateText,
    });
  } catch (err) {
    console.error('AI gateway error:', err);
    return res.json({
      success: true,
      source: 'fallback',
      recommendation:
        'Focus on building projects, honing core data structures, and practicing domain-specific frameworks.',
    });
  }
});

// ----------------------------------------------------
// Platform Stats Endpoint
// ----------------------------------------------------
app.get('/api/stats', async (req, res) => {
  try {
    const serviceClient = getServiceClient();
    if (!serviceClient) {
      return res.json({
        institutions: 24,
        opportunities: 142,
        activeStudents: 1250,
        status: 'demo_data',
      });
    }

    const [institutionsCount, requestsCount] = await Promise.all([
      serviceClient.from('institutions').select('id', { count: 'exact', head: true }),
      serviceClient.from('verification_requests').select('id', { count: 'exact', head: true }),
    ]);

    return res.json({
      institutions: institutionsCount.count ?? 0,
      verificationRequests: requestsCount.count ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.json({
      institutions: 24,
      opportunities: 142,
      activeStudents: 1250,
      status: 'demo_data',
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on Kaledo backend service.' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Kaledo backend server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
