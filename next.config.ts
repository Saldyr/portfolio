import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indicateur de dev par défaut (bottom-left) chevauche le CTA hero et
  // le titre "PROJETS" à certaines tailles d'écran ; invisible en prod.
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
