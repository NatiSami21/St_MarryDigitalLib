// Local ambient declarations to help the editor/TypeScript understand
// Deno globals and the remote import URLs used by Supabase edge functions.
// This file intentionally provides minimal types to silence IDE errors.

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}

declare module "https://deno.land/x/bcrypt@v0.4.1/mod.ts" {
  export function compare(data: string, hash: string): Promise<boolean>;
  export function hash(data: string, saltOrRounds?: string | number): Promise<string>;
}

declare module "https://deno.land/std@0.177.0/http/server.ts" {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

// Minimal Deno env typing
declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
}
