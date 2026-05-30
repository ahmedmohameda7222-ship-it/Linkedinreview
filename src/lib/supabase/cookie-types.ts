import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: Partial<ResponseCookie>;
};
