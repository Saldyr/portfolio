import Image from "next/image";
import formationPhoto from "@public/uploads/formation.jpg";
import { Tag } from "./tag";

export function FormationNote() {
  return (
    <section className="flex flex-col gap-(--space-l) pt-(--space-s)">
      <div className="font-mono text-base font-medium uppercase tracking-(--tracking-caps) text-(--text-muted) sm:text-lg">
        <span className="text-accent">{"//"}</span> En parallèle
      </div>

      <div
        className="relative mx-auto flex w-full max-w-120 items-center justify-center overflow-hidden rounded-card border border-(--border-subtle) bg-(--leaf-void)"
        style={{ aspectRatio: "1408 / 784" }}
      >
        <Image
          src={formationPhoto}
          alt=""
          fill
          loading="eager"
          className="object-contain"
          sizes="480px"
        />
      </div>

      <h2 className="m-0 text-(length:--type-card-title) font-semibold tracking-[-0.01em]">
        Une formation IA que je construis moi-même
      </h2>

      <p className="m-0 max-w-[58ch] text-base leading-[1.75] text-(--text-muted)">
        Un programme que je me suis construit moi-même, sans école,
        organisé en niveaux progressifs. Il part des fondamentaux, machine
        learning, deep learning, comment un modèle comprend un texte,
        avant de passer à la pratique : j&apos;appelle l&apos;API des
        modèles directement, en Python, sans framework au départ. Le fil
        rouge est un assistant en ligne de commande, capable par exemple
        de lire un fichier ou d&apos;agir seul sur plusieurs étapes pour
        répondre à une demande : chaque niveau lui ajoute une capacité
        réelle, jamais un exercice jetable.
      </p>

      <div className="flex flex-wrap gap-(--space-s)">
        {["Machine learning", "Deep learning", "Appels API LLM", "Tool calling", "RAG", "Boucle d'agent"].map(
          (item) => (
            <Tag key={item} size="sm">
              {item}
            </Tag>
          ),
        )}
      </div>
    </section>
  );
}
