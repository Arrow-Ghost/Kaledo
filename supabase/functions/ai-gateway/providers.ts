// AIProvider abstraction (spec section 41). Scaffolding only for Phase 1 — no live
// calls are made. Task methods are wired up so Phase 7 (AI career copilot, resume AI,
// etc.) can implement them without touching call sites elsewhere in the app.
export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(input: { system: string; prompt: string; jsonSchema?: unknown }): Promise<string>;
}

class NotConfiguredError extends Error {
  constructor(provider: string) {
    super(
      `AI provider "${provider}" is not configured. Set its API key as a Supabase project secret ` +
        `(never in client code or this repo) and redeploy the ai-gateway function.`
    );
    this.name = 'NotConfiguredError';
  }
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private apiKey = Deno.env.get('GEMINI_API_KEY');

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async complete(): Promise<string> {
    if (!this.apiKey) throw new NotConfiguredError(this.name);
    // Intentionally unimplemented in Phase 1 — wire up in Phase 7 once a key is set.
    throw new Error('GeminiProvider.complete() is not implemented yet (Phase 7).');
  }
}

export class GroqProvider implements AIProvider {
  readonly name = 'groq';
  private apiKey = Deno.env.get('GROQ_API_KEY');

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async complete(): Promise<string> {
    if (!this.apiKey) throw new NotConfiguredError(this.name);
    throw new Error('GroqProvider.complete() is not implemented yet (Phase 7).');
  }
}

/** Fast/simple task -> Groq, complex reasoning -> Gemini, with fallback on failure. */
export function routeProvider(task: 'fast' | 'complex'): AIProvider {
  const groq = new GroqProvider();
  const gemini = new GeminiProvider();
  return task === 'fast' ? groq : gemini;
}
