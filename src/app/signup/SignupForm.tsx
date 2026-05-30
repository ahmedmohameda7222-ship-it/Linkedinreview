"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/browser";
import { LINKEDIN_URL_PREFIX } from "@/lib/supabase/config";
import { normalizeText, validateEmail, validateLinkedInUrl, validatePassword } from "@/lib/validation";

export function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState(LINKEDIN_URL_PREFIX);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanName = normalizeText(fullName);
    const emailCheck = validateEmail(email);
    const passwordCheck = validatePassword(password);
    const linkedinCheck = validateLinkedInUrl(linkedinUrl);

    if (!cleanName) {
      setError("Full name is required.");
      return;
    }
    if (!emailCheck.valid || !emailCheck.value) {
      setError(emailCheck.message);
      return;
    }
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }
    if (!linkedinCheck.valid || !linkedinCheck.value) {
      setError(linkedinCheck.message);
      return;
    }

    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: emailCheck.value,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          full_name: cleanName,
          linkedin_url: linkedinCheck.value,
        },
      },
    });
    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setMessage("Account created. Check your email if confirmation is enabled in Supabase Auth.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Full name" name="fullName" autoComplete="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
      <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input label="Password" name="password" type="password" autoComplete="new-password" required hint="Minimum 8 characters." value={password} onChange={(event) => setPassword(event.target.value)} />
      <Input
        label="LinkedIn profile URL"
        name="linkedinUrl"
        type="url"
        required
        value={linkedinUrl}
        onChange={(event) => setLinkedinUrl(event.target.value)}
        hint={`Start with ${LINKEDIN_URL_PREFIX} and complete it with your own profile name.`}
      />
      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      {message ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating account" : "Create account"}
      </Button>
    </form>
  );
}
