"use server";

import { Resend } from "resend";
import { claimContactSendSlot, recordResendCall } from "@/lib/contact-rate-limit";
import { SITE_AUTHOR } from "@/lib/site";

const EMAIL_PATTERN = /.+@.+\..+/;
const TO_EMAIL = "saldyr69@proton.me";
const FROM_EMAIL = "onboarding@resend.dev";

// Longueur maximale d'une adresse email (RFC 5321). Au-delà, l'adresse est
// invalide et pas seulement longue : même message que la regex, pas un
// deuxième cas d'erreur à expliquer au visiteur.
const MAX_EMAIL_LENGTH = 254;

// Un formulaire de portfolio n'a pas besoin de plus, et sans borne un seul POST
// peut pousser un corps de plusieurs centaines de kilo-octets jusqu'à Resend et
// dans la boîte de réception (POR-51).
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

  // Avant le plafond de fréquence, et pas seulement par économie : un bot qui
  // remplit le piège ne doit pas pouvoir consommer le budget d'envoi des vrais
  // visiteurs. Il garde donc son faux succès, sans quoi le message de blocage
  // deviendrait un détecteur de honeypot.
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

  // Placé ici, et pas plus haut : une soumission rejetée par le honeypot ou par
  // les validations n'atteint jamais Resend, donc ne coûte ni boîte mail ni
  // quota — la compter rapprocherait le limiteur du faux positif. Et pas plus
  // bas : sous la lecture de la clé, la protection serait inatteignable par la
  // QA, donc intestable, donc décorative (POR-51).
  if ((await claimContactSendSlot()) === "rate-limited") {
    // Message unique quel que soit le plafond franchi : distinguer « ta limite »
    // de « la limite du site » indiquerait à un attaquant distribué si son
    // étalement fonctionne. Il reste actionnable pour un humain — perdre
    // silencieusement un message légitime serait pire que la nuisance évitée —
    // et renvoie vers les liens publics du pied de page plutôt que vers
    // TO_EMAIL, exposée nulle part ailleurs.
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

  // Juste avant l'appel, jamais après : après, l'`await` ouvrirait une fenêtre
  // pendant laquelle des requêtes concurrentes liraient toutes un compteur non
  // encore incrémenté. Dissocié du plafond par IP à dessein — ce compteur-ci
  // protège le quota Resend, il ne bouge donc que si Resend est réellement
  // appelé (voir src/lib/contact-rate-limit.ts).
  recordResendCall();

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      // Nom d'expéditeur lu dans une boîte de réception, hors du contexte
      // qui rend « Romain C » lisible : SITE_AUTHOR, et non SITE_NAME, dont la
      // forme courte y passerait pour une troncature.
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
