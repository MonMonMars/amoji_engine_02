/**
 * 2D canvas fallback when WebGL is unavailable.
 * Same control surface as createLowPolyAvatar.
 */
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
  /** @type {string} */
  let emotion = "neutral";
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

  const palette = {
    skin: "#f2c4a8",
    hair: "#2a1f3d",
    outfit: "#6ec8c4",
    blush: "#ff8fab",
    lip: "#c45c6a",
  };

  const draw = (now) => {
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 800;
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.46;
    const breath = Math.sin((now - t0) * 0.002) * 6;
    const sway = Math.sin((now - t0) * 0.0008) * 10;

    // glow
    const g = ctx.createRadialGradient(cx, cy + 120, 20, cx, cy + 140, 220);
    g.addColorStop(0, "rgba(110,200,196,0.25)");
    g.addColorStop(1, "rgba(110,200,196,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 160, 180, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx + sway * 0.15, cy + breath);

    // body
    ctx.fillStyle = palette.outfit;
    ctx.beginPath();
    ctx.moveTo(-70, 40);
    ctx.lineTo(70, 40);
    ctx.lineTo(90, 180);
    ctx.lineTo(-90, 180);
    ctx.closePath();
    ctx.fill();

    // arms
    const armLift =
      emotion === "happy" || emotion === "surprised"
        ? 25
        : emotion === "thinking"
          ? 40
          : 8;
    ctx.strokeStyle = palette.skin;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-70, 70);
    ctx.quadraticCurveTo(-120, 90 - armLift, -100, 150 - armLift * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(70, 70);
    ctx.quadraticCurveTo(120, 90 - armLift, 100, 150 - armLift * 0.4);
    ctx.stroke();

    // head
    ctx.fillStyle = palette.skin;
    ctx.beginPath();
    ctx.arc(0, -20, 78, 0, Math.PI * 2);
    ctx.fill();

    // hair
    ctx.fillStyle = palette.hair;
    ctx.beginPath();
    ctx.ellipse(0, -55, 88, 55, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-70, -10, 22, 55, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(70, -10, 22, 55, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    const eyeY = emotion === "happy" ? -18 : -22;
    const eyeH =
      emotion === "surprised" ? 16 : emotion === "sad" ? 8 : emotion === "happy" ? 7 : 12;
    ctx.fillStyle = "#1a1420";
    ctx.beginPath();
    ctx.ellipse(-28, eyeY, 10, eyeH, 0, 0, Math.PI * 2);
    ctx.ellipse(28, eyeY, 10, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-24, eyeY - 4, 3, 0, Math.PI * 2);
    ctx.arc(32, eyeY - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // brows
    ctx.strokeStyle = palette.hair;
    ctx.lineWidth = 4;
    const browTilt =
      emotion === "angry" ? 0.4 : emotion === "thinking" ? -0.25 : emotion === "surprised" ? -0.35 : 0;
    ctx.beginPath();
    ctx.moveTo(-40, -40 - browTilt * 10);
    ctx.lineTo(-16, -42 + browTilt * 10);
    ctx.moveTo(16, -42 + browTilt * 10);
    ctx.lineTo(40, -40 - browTilt * 10);
    ctx.stroke();

    // blush
    if (emotion === "happy" || emotion === "angry" || emotion === "surprised") {
      ctx.fillStyle = "rgba(255,143,171,0.45)";
      ctx.beginPath();
      ctx.ellipse(-48, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(48, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // mouth
    const talk =
      talking
        ? 0.25 + Math.abs(Math.sin(now * 0.03)) * 0.75
        : 0;
    const open = clamp(Math.max(mouthOpen, talk), 0, 1);
    ctx.fillStyle = palette.lip;
    ctx.beginPath();
    if (emotion === "happy" && open < 0.2) {
      ctx.arc(0, 18, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = palette.lip;
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.ellipse(0, 22, 14 + open * 4, 4 + open * 14, 0, 0, Math.PI * 2);
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
      emotion = String(next || "neutral");
      return emotion;
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
