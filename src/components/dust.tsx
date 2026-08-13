"use client";

import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────
   POUSSIÈRE EN SUSPENSION — partie droite du fond, WebGL2.

   La bande de droite est un aplat presque noir. Un effet qui doit
   DÉFORMER quelque chose n'y a rien à déformer ; seul un effet qui
   ÉMET sa propre lumière y fonctionne. C'est le principe ici : des
   particules lumineuses, rien d'autre.

   Trois nappes à des profondeurs différentes. Les proches sont
   grosses, floues, lentes à s'éteindre et se déplacent vite ; les
   lointaines sont fines, nettes et dérivent à peine. C'est cet écart
   qui donne la profondeur — une seule nappe donnerait un semis plat.

   Le canvas est composé en `screen` : le noir y est neutre, donc la
   lumière s'ajoute vraiment au fond. En composition normale, une
   alpha faible ne peut qu'assombrir.
   ────────────────────────────────────────────────────────────── */

const MAX_DPR = 2;
/* En deçà, la bande de droite est trop étroite pour que l'effet ait un
   sens — c'est le cas sur téléphone, où la photo occupe tout. */
const MIN_WIDTH = 220;
const MAX_FRAME = 1 / 30; // borne le dt après un onglet en arrière-plan

/* Réglages exposés en CSS, comme le reste du fond. Les valeurs ici ne
   servent que si la variable est absente ou illisible. */
const KNOBS = {
  "--dust-amount": 1, // intensité lumineuse d'ensemble
  "--dust-density": 0.55, // proportion de cellules portant une particule
  "--dust-speed": 1, // 0 fige la dérive sans figer le scintillement
} as const;

type Knob = keyof typeof KNOBS;

const VERT = /* glsl */ `#version 300 es
void main() {
  /* Triangle unique couvrant l'écran : pas de buffer de sommets, la
     position est déduite de gl_VertexID. */
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2  uRes;    // taille du canvas en px CSS
uniform float uTime;
uniform float uAmount;
uniform float uDensity;

out vec4 frag;

const vec3 ANIS = vec3(0.698, 0.890, 0.165);
const vec3 PALE = vec3(0.850, 0.920, 0.860);

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float t = uTime;
  vec3 acc = vec3(0.0);

  for (int L = 0; L < 3; L++) {
    float dep = 0.35 + 0.32 * float(L); // 0 = loin, 1 = près
    float cell = 74.0 + 52.0 * float(L);

    /* La dérive dépend de la profondeur : c'est ce décalage entre les
       nappes qui fait la parallaxe, donc la profondeur. */
    vec2 off = vec2(t * (3.0 + 9.0 * dep), -t * (5.0 + 16.0 * dep));
    vec2 id = floor((px + off) / cell);

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 nid = id + vec2(float(i), float(j));
        vec2 h = hash22(nid + float(L) * 17.0);
        if (hash11(dot(nid, vec2(11.3, 7.7)) + float(L)) > uDensity) continue;

        vec2 c = (nid + 0.15 + 0.7 * h) * cell - off;
        float r = (0.9 + 2.6 * dep) * (0.55 + 0.9 * h.x);
        /* Les particules proches sont hors focale : leur bord est
           d'autant plus étalé qu'elles sont près. */
        float soft = r * (0.5 + 1.5 * dep);
        float m = 1.0 - smoothstep(r * 0.15, r + soft, length(px - c));
        float tw = 0.55 + 0.45 * sin(t * (0.5 + h.y) + h.x * 6.283);

        acc += mix(PALE, ANIS, 0.35) * m * tw * (0.62 - 0.34 * dep);
      }
    }
  }

  /* Composition en screen : la couleur est la lumière ajoutée, et le
     noir est neutre. L'alpha reste à 1. */
  frag = vec4(acc * uAmount, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("dust: shader", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("dust: link", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uAmount = gl.getUniformLocation(program, "uAmount");
    const uDensity = gl.getUniformLocation(program, "uDensity");

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let width = 0;
    let height = 0;
    let time = 0;
    let speed: number = KNOBS["--dust-speed"];
    let frame = 0;
    let last = 0;
    let disposed = false;

    const readKnobs = () => {
      const style = getComputedStyle(canvas);
      const read = (name: Knob) => {
        const raw = parseFloat(style.getPropertyValue(name));
        return Number.isFinite(raw) ? raw : KNOBS[name];
      };
      gl.uniform1f(uAmount, read("--dust-amount"));
      gl.uniform1f(uDensity, read("--dust-density"));
      speed = read("--dust-speed");
    };

    const draw = () => {
      gl.uniform1f(uTime, time);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const step = (now: number) => {
      const dt = Math.min(MAX_FRAME, last ? (now - last) / 1000 : 0.016);
      last = now;
      time += dt * speed;
      draw();
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame || motion.matches || disposed || !width) return;
      last = 0;
      frame = requestAnimationFrame(step);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      if (box.width < MIN_WIDTH || box.height < 1) {
        stop();
        width = 0;
        height = 0;
        canvas.width = 0;
        canvas.height = 0;
        return;
      }

      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      /* uRes est en px CSS : la taille des particules et l'écartement
         des nappes sont écrits en px CSS et restent donc identiques
         quel que soit le DPR. Seul l'échantillonnage gagne en finesse. */
      gl.uniform2f(uRes, width, height);
      readKnobs();

      if (motion.matches) {
        // Pas d'animation : une poussière immobile, en suspension.
        stop();
        time = 8;
        draw();
      } else {
        draw();
        start();
      }
    };

    const onVisibility = () => {
      // Une boucle rAF sur un onglet caché est déjà suspendue par le
      // navigateur, mais l'arrêter explicitement évite le sursaut de
      // rattrapage au retour.
      if (document.hidden) stop();
      else start();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", resize);
    resize();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", resize);
      /* Jamais de WEBGL_lose_context ici : un canvas n'a qu'un seul
         objet contexte, il deviendrait inutilisable au remontage
         (StrictMode monte deux fois en dev). */
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={ref} className="site-backdrop__dust" aria-hidden="true" />;
}
