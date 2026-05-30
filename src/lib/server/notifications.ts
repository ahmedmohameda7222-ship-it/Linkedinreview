import { createAdminClient } from "@/lib/supabase/admin";

export async function sendFirstClickNotification({
  userId,
  companyId,
  trackingLinkId,
}: {
  userId: string;
  companyId: string;
  trackingLinkId: string;
}) {
  const admin = createAdminClient();
  if (!admin) return { sent: false, skipped: true, reason: "SUPABASE_SERVICE_ROLE_KEY is not configured." };

  const [{ data: profile }, { data: company }, { data: trackingLink }] = await Promise.all([
    admin.from("profiles").select("notification_email,email_notifications_enabled").eq("user_id", userId).maybeSingle(),
    admin.from("companies").select("name,job_title").eq("id", companyId).maybeSingle(),
    admin.from("tracking_links").select("source,slug").eq("id", trackingLinkId).maybeSingle(),
  ]);

  if (!profile?.email_notifications_enabled || !profile.notification_email) {
    return { sent: false, skipped: true, reason: "Notifications are disabled or no notification email is configured." };
  }

  const provider = process.env.EMAIL_PROVIDER;
  const subject = `First likely-human click: ${company?.name ?? "Application"}`;
  const body = `A first likely-human click was recorded.\n\nCompany: ${company?.name ?? "Unknown"}\nJob title: ${company?.job_title ?? "—"}\nSource: ${trackingLink?.source ?? "—"}\nSlug: ${trackingLink?.slug ?? "—"}`;

  if (provider === "resend" && process.env.RESEND_API_KEY && process.env.FIRST_CLICK_NOTIFICATION_FROM) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FIRST_CLICK_NOTIFICATION_FROM,
        to: profile.notification_email,
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      return { sent: false, skipped: false, reason: `Resend returned ${response.status}.` };
    }
  } else {
    return { sent: false, skipped: true, reason: "Email provider is not configured." };
  }

  await admin.rpc("mark_first_click_notification_sent", { p_tracking_link_id: trackingLinkId });
  return { sent: true, skipped: false, reason: "sent" };
}
