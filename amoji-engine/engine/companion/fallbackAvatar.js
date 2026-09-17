/**
 * 2D canvas fallback — more detailed feminine anime companion.
 */
import {
  buildModelFaceProfile,
  NUANCE_PROCEDURAL_MODS,
} from "./companionFaceEmotion.js";

export const FALLBACK_AVATAR_SCHEMA = "amoji.fallbackAvatar.v1";

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * @param {{ canvas: HTMLCanvasElement }} opts
 */
export function createFallbackAvatar(opts) {
  const canvas = opts.canvas;
  const ctx = canvas.getContext("2d");
  let emotion = "neutral";
  let nuance = "none";
  const faceProfile = buildModelFaceProfile({ avatarKind: "procedural" });
  let mouthOpen = 0;
  let talking = false;
  let raf = 0;
  const t0 = performance.now();

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 800;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (now) => {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 800;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.44;
    const breath = Math.sin((now - t0) * 0.0018);
    // Standing idle — no side-to-side float / hover
    const blinkCycle = (now - t0) % 4200;
    const eyeClose =
      blinkCycle > 3900 && blinkCycle < 4120
        ? blinkCycle < 4000
          ? 0.35
          : 0.15
        : 1;

    // soft pedestal glow (fixed to ground, not floating with body)
    const g = ctx.createRadialGradient(cx, cy + 150, 10, cx, cy + 160, 240);
    g.addColorStop(0, "rgba(127,212,207,0.28)");
    g.addColorStop(1, "rgba(127,212,207,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 170, 200, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    // Keep feet planted — only tiny chest-driven vertical (almost none)
    ctx.translate(cx, cy);

    // skirt
    ctx.fillStyle = "#4fa8a4";
    ctx.beginPath();
    ctx.moveTo(-55, 70);
    ctx.lineTo(55, 70);
    ctx.lineTo(105, 195);
    ctx.lineTo(-105, 195);
    ctx.closePath();
    ctx.fill();

    // torso with breath scale feel
    ctx.fillStyle = "#7fd4cf";
    ctx.beginPath();
    const torsoExpand = breath * 2;
    ctx.moveTo(-48 - torsoExpand * 0.3, 20);
    ctx.quadraticCurveTo(0, 5 - breath * 1.5, 48 + torsoExpand * 0.3, 20);
    ctx.lineTo(42, 85);
    ctx.quadraticCurveTo(0, 95, -42, 85);
    ctx.closePath();
    ctx.fill();

    // Iconic arms: left relaxed, right hand-on-hip
    const armLift =
      emotion === "happy" || emotion === "surprised"
        ? 28
        : emotion === "thinking"
          ? 42
          : 6;
    ctx.strokeStyle = "#f6c9b4";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-48, 45);
    ctx.quadraticCurveTo(-100, 95, -78, 155);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(48, 45);
    ctx.quadraticCurveTo(95, 70 - armLift * 0.35, 70, 120 - armLift * 0.15);
    ctx.stroke();

    // long hair behind
    ctx.fillStyle = "#3b2348";
    ctx.beginPath();
    ctx.ellipse(-78, 30, 28, 110, -0.25, 0, Math.PI * 2);
    ctx.ellipse(78, 30, 28, 110, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = "#f6c9b4";
    ctx.beginPath();
    ctx.ellipse(0, -35, 72, 82, 0, 0, Math.PI * 2);
    ctx.fill();

    // hair dome + bangs
    ctx.fillStyle = "#3b2348";
    ctx.beginPath();
    ctx.ellipse(0, -70, 86, 58, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -48, 78, 34, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#6a3d7a";
    ctx.beginPath();
    ctx.moveTo(-60, -55);
    ctx.quadraticCurveTo(-20, -10, 5, -40);
    ctx.quadraticCurveTo(35, -5, 62, -55);
    ctx.closePath();
    ctx.fill();

    // eyes
    const eyeY = emotion === "happy" ? -28 : -32;
    const eyeHBase =
      emotion === "surprised" ? 18 : emotion === "sad" ? 8 : emotion === "happy" ? 7 : 14;
    const eyeH = Math.max(2, eyeHBase * eyeClose);
    ctx.fillStyle = "#fff8f2";
    ctx.beginPath();
    ctx.ellipse(-26, eyeY, 14, eyeH + 2, 0, 0, Math.PI * 2);
    ctx.ellipse(26, eyeY, 14, eyeH + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d2a55";
    ctx.beginPath();
    ctx.ellipse(-26, eyeY, 9, eyeH, 0, 0, Math.PI * 2);
    ctx.ellipse(26, eyeY, 9, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-22, eyeY - 4, 3.5, 0, Math.PI * 2);
    ctx.arc(30, eyeY - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // brows
    ctx.strokeStyle = "#3b2348";
    ctx.lineWidth = 3.5;
    const browTilt =
      emotion === "angry" ? 0.45 : emotion === "thinking" ? -0.3 : emotion === "surprised" ? -0.4 : 0.05;
    ctx.beginPath();
    ctx.moveTo(-42, -52 - browTilt * 12);
    ctx.lineTo(-14, -54 + browTilt * 10);
    ctx.moveTo(14, -54 + browTilt * 10);
    ctx.lineTo(42, -52 - browTilt * 12);
    ctx.stroke();

    const nuanceMods =
      NUANCE_PROCEDURAL_MODS[String(nuance || "none").toLowerCase()] ||
      NUANCE_PROCEDURAL_MODS.none;
    const blushBoost = Number(nuanceMods.blush) || 0;

    // blush
    if (
      emotion === "happy" ||
      emotion === "angry" ||
      emotion === "surprised" ||
      blushBoost > 0.12
    ) {
      ctx.fillStyle = `rgba(255,143,171,${clamp(0.5 + blushBoost * 0.45, 0.15, 0.82)})`;
      ctx.beginPath();
      ctx.ellipse(-48, -5, 15, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(48, -5, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // earrings
    ctx.fillStyle = "#f0d48a";
    ctx.beginPath();
    ctx.arc(-68, -10, 5, 0, Math.PI * 2);
    ctx.arc(68, -10, 5, 0, Math.PI * 2);
    ctx.fill();

    // mouth
    const talk = talking ? 0.25 + Math.abs(Math.sin(now * 0.03)) * 0.75 : 0;
    const open = clamp(Math.max(mouthOpen, talk), 0, 1);
    ctx.fillStyle = "#d46378";
    ctx.beginPath();
    if (emotion === "happy" && open < 0.18) {
      ctx.strokeStyle = "#d46378";
      ctx.lineWidth = 3.5;
      ctx.arc(0, 8, 16, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
    } else {
      ctx.ellipse(0, 12, 13 + open * 5, 3.5 + open * 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    raf = requestAnimationFrame(draw);
  };

  resize();
  raf = requestAnimationFrame(draw);
  globalThis.addEventListener?.("resize", resize);

  return {
    schema: FALLBACK_AVATAR_SCHEMA,
    setEmotion(next) {
      emotion = String(next || "neutral").toLowerCase();
      return emotion;
    },
    applyExpressionProfile({ emotion: em = "neutral", nuance: n = "none" } = {}) {
      emotion = String(em || "neutral").toLowerCase();
      nuance = String(n || "none").toLowerCase();
      return { emotion, nuance };
    },
    getFaceProfile() {
      return { ...faceProfile, rigType: "canvas2d" };
    },
    getFaceReport() {
      return {
        rigType: "canvas2d",
        faceProfile: { rigType: "canvas2d", usePresets: false },
        emotion,
        nuance,
      };
    },
    setMouthOpen(v) {
      mouthOpen = clamp(Number(v) || 0, 0, 1);
      return mouthOpen;
    },
    setTalking(on) {
      talking = Boolean(on);
      return talking;
    },
    get emotion() {
      return emotion;
    },
    get mouthOpen() {
      return mouthOpen;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener?.("resize", resize);
    },
  };
}
