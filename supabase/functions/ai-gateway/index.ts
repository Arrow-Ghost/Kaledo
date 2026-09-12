// Entry point for every AI task in the platform (spec sections 41-43). Phase 1 ships
// this as a disabled scaffold: it proves the routing/abstraction shape without making
// any live provider calls, since GEMINI_API_KEY/GROQ_API_KEY are not set yet. Wire up
// real tasks (extractSkills, matchCandidate, generateLearningPath, ...) in Phase 7.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { routeProvider } from './providers.ts';

const SUPPORTED_TASKS = [
  'extractSkills',
  'generateResume',
  'generateLearningPath',
  'generateInterviewQuestions',
  'scoreResource',
  'summarizeJob',
  'matchCandidate',
  'generateAssessment',
  'analyzeProject',
  'generateCareerPlan',
] as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Missing Authorization header.' }, 401);

  const { task } = await req.json().catch(() => ({ task: undefined }));

  if (!task || !SUPPORTED_TASKS.includes(task)) {
    return jsonResponse(
      { error: `Unknown task. Supported tasks: ${SUPPORTED_TASKS.join(', ')}` },
      400
    );
  }

  const provider = routeProvider('complex');
  if (!provider.isConfigured()) {
    return jsonResponse(
      {
        error: 'AI is not configured for this deployment yet.',
        detail:
          'This is Phase 1 scaffolding (spec section 41). Set GEMINI_API_KEY / GROQ_API_KEY as ' +
          'Supabase project secrets to enable AI tasks in a later phase.',
        task,
      },
      501
    );
  }

  // Real task dispatch lands in Phase 7.
  return jsonResponse({ error: 'Not implemented yet.', task }, 501);
});
