"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { createClient } from "@/lib/supabase/browser";
import { validateEmail } from "@/lib/validation";

export function ResetPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid || !emailCheck.value) {
      setError(emailCheck.message);
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailCheck.value, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset email sent if this account exists.");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Sending" : "Send reset link"}
      </Button>
    </form>
  );
}
