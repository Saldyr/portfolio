import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ImageResponse } from "next/og";

// Palette et typo reprises de src/app/globals.css (design system "Nocturne") —
// ImageResponse ne peut pas lire les variables CSS/Tailwind, valeurs dupliquées ici.
const COLOR_VOID = "#050908";
const COLOR_LIME = "#b2e32a";
const COLOR_PAPER = "#dde6e4";
const COLOR_HAZE = "#8fa3a3";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

async function loadFont(path: string) {
  return readFile(fileURLToPath(new URL(path, import.meta.url)));
}

export async function renderOgImage({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const [spaceGroteskBold, spaceGroteskMedium, jetbrainsMono] = await Promise.all([
    loadFont("./fonts/space-grotesk-700.ttf"),
    loadFont("./fonts/space-grotesk-500.ttf"),
    loadFont("./fonts/jetbrains-mono-500.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: COLOR_VOID,
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: COLOR_LIME,
          }}
        >
          {eyebrow}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Space Grotesk",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
              color: COLOR_PAPER,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                display: "flex",
                fontFamily: "Space Grotesk",
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.5,
                color: COLOR_HAZE,
                maxWidth: 820,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            width: 96,
            height: 6,
            backgroundColor: COLOR_LIME,
          }}
        />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Space Grotesk", data: spaceGroteskBold, weight: 700, style: "normal" },
        { name: "Space Grotesk", data: spaceGroteskMedium, weight: 500, style: "normal" },
        { name: "JetBrains Mono", data: jetbrainsMono, weight: 500, style: "normal" },
      ],
    },
  );
}
