// Only for type-checking the Edge Functions with tsc in Node (npm run lint:functions).
// At runtime Supabase provides the real Deno globals.
declare const Deno: {
  env: { get(name: string): string | undefined; toObject(): Record<string, string> };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
