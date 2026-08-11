import Image from "next/image";
import Link from "next/link";
import { Tag } from "./tag";

export function ProjectCard({
  href,
  meta,
  title,
  desc,
  tags,
  image,
  imageAlt,
}: {
  href: string;
  meta: string;
  title: string;
  desc: string;
  tags: string[];
  image: string | null;
  imageAlt?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-card border border-(--border-subtle) bg-surface text-foreground transition-[border-color,box-shadow] duration-150 hover:border-(--border-accent) hover:shadow-(--shadow-night)"
    >
      <div className="relative flex h-[190px] items-center justify-center overflow-hidden border-b border-(--border-subtle) bg-(--leaf-void)">
        {image ? (
          <Image
            src={image}
            alt={imageAlt ?? title}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        ) : (
          <span className="font-mono text-xs text-(--text-muted)">
            Visuel à venir
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-(--space-s) p-(--space-l)">
        <div className="font-mono text-xs text-(--text-muted)">{meta}</div>
        <div className="text-[22px] font-semibold tracking-[-0.02em]">
          {title}
        </div>
        <p className="flex-1 text-sm leading-[1.7] text-(--text-muted)">
          {desc}
        </p>
        <div className="flex flex-wrap gap-(--space-s) pt-(--space-s)">
          {tags.map((tag) => (
            <Tag key={tag} size="sm">
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </Link>
  );
}
