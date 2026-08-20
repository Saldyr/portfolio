import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og-image";
import { SITE_NAME } from "@/lib/site";
import { metadata } from "./layout";

// POR-46 : `alt` SUIT le titre au lieu de le recopier. Le littéral précédent
// (« Saldyr — développeur full-stack ») était périmé depuis le changement de
// titre de POR-43, et aucune assertion ne couvrait `og:image:alt` — la dérive
// n'avait donc aucun moyen d'être signalée. Elle l'est désormais dans
// qa/SEO/metadata.spec.ts, qui compare la balise servie au titre servi.
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
