import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { SITE_NAME } from "@/lib/site";
import { metadata } from "./layout";

// alt suit metadata.title : un littéral figé deviendrait faux au changement de titre.
export const alt = metadata.title as string;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: `${SITE_NAME} — Développeur`,
    title: metadata.title as string,
    subtitle: metadata.description as string,
  });
}
