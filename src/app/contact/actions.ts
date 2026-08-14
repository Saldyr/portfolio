"use server";

import { Resend } from "resend";

const EMAIL_PATTERN = /.+@.+\..+/;
const TO_EMAIL = "saldyr69@proton.me";
const FROM_EMAIL = "onboarding@resend.dev";

export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

export async function sendContactMessage(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const honeypot = String(formData.get("company") ?? "").trim();

  if (honeypot) {
    return { status: "success" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Adresse email invalide." };
  }

  if (!message) {
    return { status: "error", message: "Le message ne peut pas être vide." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: "Envoi impossible pour le moment. Réessaie plus tard.",
    };
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: `Contact Saldyr <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Nouveau message de ${email}`,
      text: message,
    });

    if (error) {
      return {
        status: "error",
        message: "Envoi impossible pour le moment. Réessaie plus tard.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "Envoi impossible pour le moment. Réessaie plus tard.",
    };
  }

  return { status: "success" };
}
