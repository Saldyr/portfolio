/**
 * Décodage des URLs servies par `next/image`, partagé entre les specs qui
 * comparent le rendu à `src/lib/projects.ts`.
 *
 * Extrait de qa/Functional/project-page.spec.ts (POR-40) : la visionneuse de
 * galerie a besoin exactement du même décodage, et deux copies de cette
 * logique dériveraient l'une de l'autre sans que rien ne le signale.
 */

/**
 * `next/image` sert une image optimisée : le `src` rendu est
 * `/_next/image?url=%2F_next%2Fstatic%2Fmedia%2F...&w=640&q=75` depuis le
 * passage aux imports statiques, jamais le chemin déclaré dans projects.ts.
 * Seul le paramètre `url` est comparable à la donnée source, et encore : via
 * `imageIdentity()`, l'empreinte webpack n'existant pas côté source.
 *
 * Trois différences avec la version qui vivait dans project-page.spec.ts, la
 * première étant le motif de l'extraction :
 *   1. les URLs ABSOLUES sont désormais décodées — indispensable au relevé
 *      réseau de la visionneuse, qui manipule des `request.url()` ;
 *   2. la reconnaissance se fait sur le `pathname` exact et non plus sur un
 *      préfixe : une route `/_next/image-autre-chose` ne matche plus par
 *      accident ;
 *   3. une entrée non parsable en URL LÈVE désormais, là où l'ancienne version
 *      la renvoyait telle quelle. Inatteignable depuis un attribut `src` rendu,
 *      mais c'est un changement de comportement, pas un détail.
 */
export function decodeNextImageSrc(rawSrc: string | null) {
  if (rawSrc === null) return null;
  const url = new URL(rawSrc, "http://localhost");
  if (url.pathname !== "/_next/image") return rawSrc;
  return url.searchParams.get("url");
}

/**
 * Nom de fichier sans son empreinte — seule identité comparable entre les deux
 * côtés depuis POR-39. `src/lib/projects.ts` importe ses images statiquement :
 * côté Node il en reste `/uploads/x.png` (hook
 * qa/support/register-image-imports.ts), tandis que le rendu sert
 * `/_next/static/media/x.<hash>.png`. Webpack conserve le nom et l'extension,
 * pas le chemin ni l'empreinte : les deux bouts conservés ici portent donc
 * l'identité du fichier. L'extension est gardée délibérément — sans elle, une
 * substitution `x.png` → `x.jpg` passerait inaperçue.
 *
 * Une image substituée ou réordonnée reste détectée ; seule une image renommée
 * à l'identique passerait, ce qu'aucune manipulation accidentelle ne produit.
 */
export function imageIdentity(src: string | null) {
  if (src === null) return null;
  const parts = (src.split("/").pop() ?? "").split(".");
  return parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
}
