"use client";

import { useEffect, useRef } from "react";

// Poussière en suspension (fond WebGL2) : particules lumineuses composées en
// `screen` (le noir reste neutre), trois nappes de profondeur pour éviter un
// semis plat.

const MAX_DPR = 2;
const MIN_WIDTH = 220; // en dessous, effet coupé (photo occupe tout l'écran)
const MAX_FRAME = 1 / 30; // borne le dt après un onglet en arrière-plan

// Valeurs de repli si la variable CSS est absente ou illisible.
const KNOBS = {
  "--dust-amount": 1,
  "--dust-density": 0.55,
  "--dust-speed": 1, // 0 fige la dérive sans figer le scintillement
} as const;

type Knob = keyof typeof KNOBS;

const VERT = /* glsl */ `#version 300 es
void main() {
  // Triangle plein écran sans buffer de sommets, déduit de gl_VertexID.
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2  uRes;    // px CSS, pas px device
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

    // Dérive dépendante de la profondeur : c'est ce décalage qui fait la parallaxe.
    vec2 off = vec2(t * (3.0 + 9.0 * dep), -t * (5.0 + 16.0 * dep));
    vec2 id = floor((px + off) / cell);

    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 nid = id + vec2(float(i), float(j));
        vec2 h = hash22(nid + float(L) * 17.0);
        if (hash11(dot(nid, vec2(11.3, 7.7)) + float(L)) > uDensity) continue;

        vec2 c = (nid + 0.15 + 0.7 * h) * cell - off;
        float r = (0.9 + 2.6 * dep) * (0.55 + 0.9 * h.x);
        float soft = r * (0.5 + 1.5 * dep); // hors focale : bord d'autant plus étalé que proche
        float m = 1.0 - smoothstep(r * 0.15, r + soft, length(px - c));
        float tw = 0.55 + 0.45 * sin(t * (0.5 + h.y) + h.x * 6.283);

        acc += mix(PALE, ANIS, 0.35) * m * tw * (0.62 - 0.34 * dep);
      }
    }
  }

  frag = vec4(acc * uAmount, 1.0); // composition screen : alpha à 1
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

      gl.uniform2f(uRes, width, height); // px CSS : identique quel que soit le DPR
      readKnobs();

      if (motion.matches) {
        stop();
        time = 8;
        draw();
      } else {
        draw();
        start();
      }
    };

    const onVisibility = () => {
      // Arrêt explicite : évite le sursaut de rattrapage au retour d'onglet.
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
      // Jamais WEBGL_lose_context : rendrait le canvas inutilisable au
      // remontage (StrictMode monte deux fois en dev).
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={ref} className="site-backdrop__dust" aria-hidden="true" />;
}
