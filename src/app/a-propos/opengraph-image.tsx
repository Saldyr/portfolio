import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { SITE_NAME } from "@/lib/site";
import { metadata } from "./page";

// POR-46 : `alt` suit le titre de la page au lieu de le recopier. Le littéral
// précédent doublait `metadata.title` — le ticket change ce titre, et l'`alt`
// figé serait devenu faux le jour même. Couvert par qa/SEO/metadata.spec.ts.
export const alt = metadata.title as string;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgImage({
    eyebrow: `${SITE_NAME} — À propos`,
    title: metadata.title as string,
    subtitle: metadata.description as string,
  });
}
