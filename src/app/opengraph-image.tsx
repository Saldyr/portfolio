import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { metadata } from "./layout";

export const alt = "Saldyr — développeur full-stack";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Saldyr — Développeur",
    title: metadata.title as string,
    subtitle: metadata.description as string,
  });
}
