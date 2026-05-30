import { UpdatePasswordForm } from "./UpdatePasswordForm";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-sm text-slate-500">Your reset link must be opened in the same browser session.</p>
        <div className="mt-8">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
