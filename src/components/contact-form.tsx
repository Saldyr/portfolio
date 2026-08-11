"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

type Toast = { type: "success" | "error"; text: string } | null;

const EMAIL_PATTERN = /.+@.+\..+/;

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState<Toast>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(dismissTimer.current);
  }, []);

  function showToast(next: Toast) {
    setToast(next);
    clearTimeout(dismissTimer.current);
    if (next?.type !== "error") {
      dismissTimer.current = setTimeout(() => setToast(null), 4000);
    }
  }

  function handleSend() {
    const valid = EMAIL_PATTERN.test(email);
    showToast(
      valid
        ? { type: "success", text: "Message envoyé. Réponse sous 48 h." }
        : {
            type: "error",
            text: "Envoi impossible. Vérifie ton adresse email.",
          },
    );
  }

  return (
    <div className="flex flex-col gap-(--space-m)">
      <label className="flex flex-col gap-(--space-s)">
        <span className="text-sm font-medium text-(--text-muted)">Email</span>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.fr"
          className="h-11 rounded-(--radius-input) border border-(--leaf-stone) bg-(--leaf-void) px-3.5 text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-(--focus-ring)"
        />
      </label>
      <label className="flex flex-col gap-(--space-s)">
        <span className="text-sm font-medium text-(--text-muted)">
          Message
        </span>
        <textarea
          rows={4}
          placeholder="Parle-moi de ton projet."
          className="resize-y rounded-(--radius-input) border border-(--leaf-stone) bg-(--leaf-void) px-3.5 py-3 leading-[1.7] text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-(--focus-ring)"
        />
      </label>
      <Button onClick={handleSend} className="self-start">
        Envoyer
      </Button>

      {toast && (
        <div className="fixed bottom-(--space-l) right-(--space-l) z-50 flex max-w-100 items-center gap-(--space-m) rounded-(--radius-button) border border-(--border-subtle) bg-(--surface-raised) px-5 py-(--space-m) shadow-(--shadow-deep)">
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
            onClick={() => setToast(null)}
            aria-label="Fermer la notification"
            className="font-mono text-sm text-(--text-muted)"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
