"use client";

// Formulaire de contact : appelle la Server Action sendContactMessage et
// affiche le résultat (succès/erreur) sous forme de toast temporaire.
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendContactMessage, type ContactState } from "@/app/contact/actions";
import { Button } from "./button";

type Toast = { type: "success" | "error"; text: string } | null;

const initialState: ContactState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? "Envoi..." : "Envoyer"}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactMessage, initialState);
  const [prevState, setPrevState] = useState(state);
  const [dismissed, setDismissed] = useState(false);

  // useActionState renvoie un objet neuf à chaque soumission, même si le
  // résultat est identique : cette comparaison d'identité est le seul signal
  // d'une nouvelle réponse serveur. Réinitialiser ici plutôt que dans un effet
  // évite d'afficher une frame avec l'ancien toast encore masqué.
  if (state !== prevState) {
    setPrevState(state);
    setDismissed(false);
  }

  useEffect(() => {
    if (state.status !== "success") return;
    const timer = setTimeout(() => setDismissed(true), 4000);
    return () => clearTimeout(timer);
  }, [state]);

  const toast: Toast =
    dismissed || state.status === "idle"
      ? null
      : state.status === "success"
        ? { type: "success", text: "Message envoyé. Réponse sous 48 h." }
        : { type: "error", text: state.message };

  return (
    <form action={formAction} className="flex flex-col gap-(--space-m)">
      <label className="flex flex-col gap-(--space-s)">
        <span className="text-sm font-medium text-(--text-muted)">Email</span>
        <input
          type="text"
          name="email"
          placeholder="toi@exemple.fr"
          className="h-11 rounded-(--radius-input) border border-(--leaf-stone) bg-(--leaf-void) px-3.5 text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-(--focus-ring)"
        />
      </label>
      <label className="flex flex-col gap-(--space-s)">
        <span className="text-sm font-medium text-(--text-muted)">
          Message
        </span>
        <textarea
          name="message"
          required
          rows={4}
          placeholder="Parle-moi de ton projet."
          className="resize-y rounded-(--radius-input) border border-(--leaf-stone) bg-(--leaf-void) px-3.5 py-3 leading-[1.7] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-(--focus-ring)"
        />
      </label>
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      />
      <SubmitButton />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-(--space-l) right-(--space-l) z-50 flex max-w-100 items-center gap-(--space-m) rounded-(--radius-button) border border-(--border-subtle) bg-(--surface-raised) px-5 py-(--space-m) shadow-(--shadow-deep)"
        >
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              toast.type === "error" ? "bg-danger" : "bg-success"
            }`}
          />
          <span className="flex-1 text-sm leading-normal text-foreground">
            {toast.text}
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fermer la notification"
            className="font-mono text-sm text-(--text-muted)"
          >
            ✕
          </button>
        </div>
      )}
    </form>
  );
}
