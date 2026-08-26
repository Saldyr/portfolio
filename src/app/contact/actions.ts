"use server";

// Server Action du formulaire de contact : valide la saisie, applique le
// honeypot et le plafond de fréquence, puis envoie l'email via Resend.
import { Resend } from "resend";
import { claimContactSendSlot, recordResendCall } from "@/lib/contact-rate-limit";
import { SITE_AUTHOR } from "@/lib/site";

const EMAIL_PATTERN = /.+@.+\..+/;
const TO_EMAIL = "saldyr69@proton.me";
const FROM_EMAIL = "onboarding@resend.dev";

// RFC 5321 : au-delà, l'adresse est invalide, pas seulement longue.
const MAX_EMAIL_LENGTH = 254;

// Borne le poids d'un POST envoyé jusqu'à Resend.
const MAX_MESSAGE_LENGTH = 5000;

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

  // Avant le plafond de fréquence : un bot ne doit pas consommer le budget des
  // vrais visiteurs. Faux succès conservé, sinon le blocage trahirait le piège.
  if (honeypot) {
    return { status: "success" };
  }

  if (!EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) {
    return { status: "error", message: "Adresse email invalide." };
  }

  if (!message) {
    return { status: "error", message: "Le message ne peut pas être vide." };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      status: "error",
      message: `Le message est trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`,
    };
  }

  // Après le honeypot et les validations : une soumission déjà rejetée ne doit
  // pas coûter de quota.
  if ((await claimContactSendSlot()) === "rate-limited") {
    // Message unique quel que soit le plafond franchi : distinguer les deux
    // renseignerait un attaquant distribué sur l'efficacité de son étalement.
    return {
      status: "error",
      message:
        "Trop de messages envoyés depuis peu. Réessaie dans quelques minutes, " +
        "ou passe par les liens en bas de page.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY manquante dans l'environnement.");
    return {
      status: "error",
      message: "Envoi impossible pour le moment. Réessaie plus tard.",
    };
  }

  // Juste avant l'appel, jamais après : après, l'`await` laisserait des
  // requêtes concurrentes lire un compteur pas encore incrémenté.
  recordResendCall();

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      // SITE_AUTHOR, pas SITE_NAME : sa forme courte passerait pour une troncature.
      from: `Contact ${SITE_AUTHOR} <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Nouveau message de ${email}`,
      text: message,
    });

    if (error) {
      console.error("[contact] Resend a refusé l'envoi :", error.name, error.message);
      return {
        status: "error",
        message: "Envoi impossible pour le moment. Réessaie plus tard.",
      };
    }
  } catch (cause) {
    console.error("[contact] Échec de l'appel Resend :", cause);
    return {
      status: "error",
      message: "Envoi impossible pour le moment. Réessaie plus tard.",
    };
  }

  return { status: "success" };
}
