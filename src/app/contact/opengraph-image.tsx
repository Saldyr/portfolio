import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { metadata } from "./page";

export const alt = "Contact — Saldyr";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: "Saldyr — Contact",
    title: metadata.title as string,
    subtitle: metadata.description as string,
  });
}
