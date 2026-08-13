import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { BrowserContext, Page } from "playwright/test";

/**
 * Outils partagés par les suites qa/WebGL.
 *
 * Le composant testé (src/components/dust.tsx) n'expose rien : ni handle sur
 * son contexte, ni compteur de frames, ni état. Toute observation passe donc
 * par une instrumentation posée AVANT le chargement du document
 * (`context.addInitScript`), qui enveloppe `HTMLCanvasElement.getContext` et
 * `WebGL2RenderingContext.drawArrays` sans toucher à `src/`.
 */

/* ── Pilote GL du navigateur ───────────────────────────────────────────
   `qa/playwright.config.ts` lance Chromium avec `--enable-webgl
   --ignore-gpu-blocklist`, qui suffisent à exposer un contexte WebGL2 stable
   en headless. `--use-gl=swiftshader` a été retiré du config (fait vérifié
   par `harness-gl-flags.spec.ts` : provoquait une perte de contexte après
   ~4 frames, jamais restaurée). */
export const GL_ARGS = ["--enable-webgl", "--ignore-gpu-blocklist"];

export const DUST_SELECTOR = ".site-backdrop__dust";

/** Dossier de preuves. `QA_WEBGL_RUN=1|2` sépare les runs de vérification. */
export const EVIDENCE_DIR = path.resolve(
  __dirname,
  "../Reports/WebGL",
  process.env.QA_WEBGL_RUN ? `run${process.env.QA_WEBGL_RUN}` : "latest",
);

export function writeEvidence(name: string, data: unknown) {
  const file = path.join(EVIDENCE_DIR, `${name}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

export function evidencePath(name: string) {
  const file = path.join(EVIDENCE_DIR, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

export const md5 = (buf: Buffer) => createHash("md5").update(buf).digest("hex");

/* ── Instrumentation ──────────────────────────────────────────────── */

export type ContextCall = {
  attrs: Record<string, unknown> | null;
  ok: boolean;
  className: string;
};

export type ProbeState = {
  contextCalls: ContextCall[];
  draws: number;
  lostAt: number[];
  restoredAt: number[];
  canvasSizes: [string, number, number][];
  visibilityEvents: string[];
};

export type ProbeSnapshot = ProbeState & {
  isLost: boolean | null;
  hasContext: boolean;
  now: number;
};

export type PixelStats =
  | { available: false; reason: "no-context" | "context-lost" | "empty-buffer" }
  | { available: true; sum: number; nonZero: number; max: number; hash: number; sampled: number };

type ProbeWindow = Window & {
  __dustProbe: ProbeState & { gl: WebGL2RenderingContext | null };
};

export type ProbeOptions = {
  /** Force `preserveDrawingBuffer` pour rendre `readPixels` exploitable. */
  preserveDrawingBuffer?: boolean;
  /** Simule l'indisponibilité de WebGL2 : `getContext("webgl2")` renvoie null. */
  failWebgl2?: boolean;
  /** Rend `document.hidden`/`visibilityState` pilotables depuis le test. */
  controllableVisibility?: boolean;
};

/**
 * Pose la sonde. À appeler sur le BrowserContext AVANT toute navigation.
 *
 * `preserveDrawingBuffer` est un écart assumé au comportement de production
 * (le composant demande le défaut, `false`) : sans lui, le back-buffer est
 * vidé après composition et `readPixels` ne renverrait que du noir. Les
 * attributs réellement demandés par le composant restent enregistrés tels
 * quels dans `contextCalls[].attrs`. Les preuves visuelles non instrumentées
 * (captures d'écran) sont produites séparément, sondes désactivées.
 */
export async function installDustProbe(context: BrowserContext, options: ProbeOptions = {}) {
  await context.addInitScript(
    (opts: Required<ProbeOptions>) => {
      const state: ProbeState & { gl: WebGL2RenderingContext | null } = {
        contextCalls: [],
        draws: 0,
        lostAt: [],
        restoredAt: [],
        canvasSizes: [],
        visibilityEvents: [],
        gl: null,
      };
      (window as unknown as ProbeWindow).__dustProbe = state;

      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        attrs?: Record<string, unknown>,
      ) {
        if (type !== "webgl2") {
          return (originalGetContext as unknown as (
            t: string,
            a?: Record<string, unknown>,
          ) => RenderingContext | null).call(this, type, attrs);
        }

        const call = { attrs: attrs ?? null, ok: false, className: this.className };
        state.contextCalls.push(call);
        if (opts.failWebgl2) return null;

        const effective = opts.preserveDrawingBuffer
          ? { ...(attrs ?? {}), preserveDrawingBuffer: true }
          : attrs;
        const ctx = (originalGetContext as unknown as (
          t: string,
          a?: Record<string, unknown>,
        ) => RenderingContext | null).call(this, type, effective) as WebGL2RenderingContext | null;

        call.ok = !!ctx;
        /* `gl`, `lostAt` et `restoredAt` ne suivent QUE le canvas de Dust :
           un canvas témoin créé par un test ne doit pas se substituer à lui
           dans les lectures suivantes. */
        if (ctx && this.classList?.contains("site-backdrop__dust")) {
          state.gl = ctx;
          this.addEventListener("webglcontextlost", () => state.lostAt.push(state.draws));
          this.addEventListener("webglcontextrestored", () => state.restoredAt.push(state.draws));
        }
        return ctx;
      } as typeof HTMLCanvasElement.prototype.getContext;

      const proto = window.WebGL2RenderingContext?.prototype;
      if (proto) {
        const originalDraw = proto.drawArrays;
        proto.drawArrays = function (this: WebGL2RenderingContext, ...args: [number, number, number]) {
          state.draws++;
          return originalDraw.apply(this, args);
        };
      }

      /* Trace les réallocations du back-buffer : c'est le seul signe
         observable du chemin `resize()` du composant. */
      for (const prop of ["width", "height"] as const) {
        const desc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, prop);
        if (!desc?.get || !desc.set) continue;
        const { get, set } = desc;
        Object.defineProperty(HTMLCanvasElement.prototype, prop, {
          configurable: true,
          get(this: HTMLCanvasElement) {
            return get.call(this);
          },
          set(this: HTMLCanvasElement, value: number) {
            if (this.classList?.contains("site-backdrop__dust")) {
              state.canvasSizes.push([prop, value, Math.round(performance.now())]);
            }
            set.call(this, value);
          },
        });
      }

      if (opts.controllableVisibility) {
        /* Chromium headless ne permet pas de mettre réellement l'onglet en
           arrière-plan (mesuré : `page.bringToFront()` sur une autre page et
           `Page.setWebLifecycleState` laissent `document.visibilityState` à
           "visible"). On rend donc l'état pilotable pour exercer le
           gestionnaire `visibilitychange` réel du composant. */
        let hidden = false;
        Object.defineProperty(Document.prototype, "hidden", {
          configurable: true,
          get: () => hidden,
        });
        Object.defineProperty(Document.prototype, "visibilityState", {
          configurable: true,
          get: () => (hidden ? "hidden" : "visible"),
        });
        document.addEventListener("visibilitychange", () =>
          state.visibilityEvents.push(document.visibilityState),
        );
        (window as unknown as { __setHidden: (v: boolean) => void }).__setHidden = (v: boolean) => {
          hidden = v;
          document.dispatchEvent(new Event("visibilitychange"));
        };
      }
    },
    {
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? true,
      failWebgl2: options.failWebgl2 ?? false,
      controllableVisibility: options.controllableVisibility ?? false,
    } as Required<ProbeOptions>,
  );
}

export function readProbe(page: Page): Promise<ProbeSnapshot> {
  return page.evaluate(() => {
    const s = (window as unknown as ProbeWindow).__dustProbe;
    return {
      contextCalls: s.contextCalls,
      draws: s.draws,
      lostAt: s.lostAt,
      restoredAt: s.restoredAt,
      canvasSizes: s.canvasSizes,
      visibilityEvents: s.visibilityEvents,
      hasContext: !!s.gl,
      isLost: s.gl ? s.gl.isContextLost() : null,
      now: Math.round(performance.now()),
    };
  });
}

/** Statistiques du back-buffer réellement rendu (nécessite `preserveDrawingBuffer`). */
export function readPixels(page: Page, size = 300): Promise<PixelStats> {
  return page.evaluate((n: number) => {
    const gl = (window as unknown as ProbeWindow).__dustProbe.gl;
    if (!gl) return { available: false, reason: "no-context" } as const;
    if (gl.isContextLost()) return { available: false, reason: "context-lost" } as const;
    const w = Math.min(n, gl.drawingBufferWidth);
    const h = Math.min(n, gl.drawingBufferHeight);
    if (w <= 0 || h <= 0) return { available: false, reason: "empty-buffer" } as const;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sum = 0;
    let nonZero = 0;
    let max = 0;
    let hash = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const v = buf[i] + buf[i + 1] + buf[i + 2];
      sum += v;
      if (v > 0) nonZero++;
      if (v > max) max = v;
      hash = (hash * 31 + v) >>> 0;
    }
    return { available: true, sum, nonZero, max, hash, sampled: w * h } as const;
  }, size);
}

/** Vide le drapeau d'erreur GL et renvoie les codes rencontrés. */
export function drainGlErrors(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const gl = (window as unknown as ProbeWindow).__dustProbe.gl;
    if (!gl || gl.isContextLost()) return [];
    const codes: number[] = [];
    for (let i = 0; i < 8; i++) {
      const code = gl.getError();
      if (code === gl.NO_ERROR) break;
      codes.push(code);
    }
    return codes;
  });
}

/** Cadence de `drawArrays` sur une fenêtre de temps (proxy du FPS de la boucle rAF). */
export async function sampleDrawRate(page: Page, windowMs: number) {
  const before = await readProbe(page);
  await page.waitForTimeout(windowMs);
  const after = await readProbe(page);
  const elapsed = (after.now - before.now) / 1000;
  return {
    frames: after.draws - before.draws,
    elapsedSeconds: Number(elapsed.toFixed(3)),
    fps: Number(((after.draws - before.draws) / Math.max(elapsed, 0.001)).toFixed(2)),
  };
}

/* ── Métriques navigateur (CDP) ────────────────────────────────────── */

/**
 * Ouvre une session CDP et renvoie un lecteur de `Performance.getMetrics`.
 * Métriques utiles ici : `JSHeapUsedSize` (proxy mémoire), `TaskDuration` et
 * `ScriptDuration` (temps cumulé du thread principal — proxy du coût CPU
 * soutenu), `Documents`/`Nodes`/`JSEventListeners` (accumulation au fil des
 * navigations).
 */
export async function metricsReader(context: BrowserContext, page: Page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  /**
   * `gc: true` déclenche `HeapProfiler.collectGarbage` avant la lecture.
   * Indispensable pour toute question de fuite : sans ramasse-miettes forcé,
   * `Documents`/`Nodes`/`JSEventListeners` montent linéairement à chaque
   * rechargement (documents détachés pas encore collectés) et se lisent à
   * tort comme une fuite. Mesuré ici : 2 → 18 documents sur 8 rechargements
   * sans GC, retour à 2 après GC.
   */
  return async (options: { gc?: boolean } = {}) => {
    if (options.gc) {
      await cdp.send("HeapProfiler.collectGarbage");
      await page.waitForTimeout(300);
    }
    const { metrics } = await cdp.send("Performance.getMetrics");
    const out: Record<string, number> = {};
    for (const m of metrics) out[m.name] = m.value;
    return out;
  };
}

/* ── Observations sans instrumentation ─────────────────────────────── */

/** Fige les animations CSS du fond pour isoler la contribution du canvas. */
export function pauseCssAnimations(page: Page) {
  return page.evaluate(() => {
    document.getAnimations().forEach((a) => a.pause());
    return document.getAnimations().length;
  });
}

export type DustGeometry = {
  present: boolean;
  cssWidth: number;
  cssHeight: number;
  backingWidth: number;
  backingHeight: number;
  dpr: number;
  viewport: [number, number];
};

/** Géométrie du canvas : boîte CSS, back-buffer, DPR effectif. */
export function dustGeometry(page: Page): Promise<DustGeometry> {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector) as HTMLCanvasElement | null;
    if (!el) {
      return {
        present: false,
        cssWidth: 0,
        cssHeight: 0,
        backingWidth: 0,
        backingHeight: 0,
        dpr: window.devicePixelRatio,
        viewport: [window.innerWidth, window.innerHeight] as [number, number],
      };
    }
    const box = el.getBoundingClientRect();
    return {
      present: true,
      cssWidth: Math.round(box.width * 100) / 100,
      cssHeight: Math.round(box.height * 100) / 100,
      backingWidth: el.width,
      backingHeight: el.height,
      dpr: window.devicePixelRatio,
      viewport: [window.innerWidth, window.innerHeight] as [number, number],
    };
  }, DUST_SELECTOR);
}

export function dustBandClip(page: Page) {
  return page.evaluate((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const x = Math.max(0, Math.ceil(box.x));
    const y = Math.max(0, Math.ceil(box.y));
    const width = Math.floor(Math.min(box.width, window.innerWidth - x));
    const height = Math.floor(Math.min(box.height, window.innerHeight - y));
    return width > 0 && height > 0 ? { x, y, width, height } : null;
  }, DUST_SELECTOR);
}

/* ── Console ───────────────────────────────────────────────────────── */

export type ConsoleEntry = { type: string; text: string };

/**
 * Collecte les messages console et les erreurs de page.
 *
 * Le pilote logiciel émet des avertissements de pilote non applicatifs
 * (`GL Driver Message (... GPU stall due to ReadPixels)`), déclenchés par la
 * sonde `readPixels` elle-même : ils sont exclus du bruit retenu, mais
 * conservés dans `all` pour les preuves.
 */
export function collectConsole(page: Page) {
  const all: ConsoleEntry[] = [];
  page.on("console", (msg) => all.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => all.push({ type: "pageerror", text: err.message }));
  return {
    all,
    /** Erreurs applicatives : console.error, exceptions, messages "dust:". */
    errors: () =>
      all.filter(
        (e) =>
          e.type === "error" ||
          e.type === "pageerror" ||
          /^dust:/.test(e.text) ||
          /CONTEXT_LOST_WEBGL/.test(e.text),
      ),
    driverNoise: () => all.filter((e) => /GL Driver Message/.test(e.text)),
  };
}
