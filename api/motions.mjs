import { enrichMotionWithClip } from "../amoji-engine/engine/companion/companionOnlineMotionClips.mjs";
import {
  getCloudMotionDef,
  getMotionPack,
  listMotionPacks,
  MOTION_PACK_SCHEMA,
} from "../amoji-engine/engine/companion/motionPackData.mjs";

function enrichPackMotions(pack) {
  if (!pack?.motions) return pack;
  return {
    ...pack,
    motions: pack.motions.map((motion) => {
      const id = motion.id || motion;
      const clip = enrichMotionWithClip(id);
      return typeof motion === "string"
        ? { id: motion, ...clip }
        : { ...motion, ...clip };
    }),
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300",
  };
}

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(corsHeaders())) {
    res.setHeader(key, value);
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  try {
    const packParam = req.query?.pack;
    const actionParam = req.query?.action;

    if (actionParam) {
      const motion = getCloudMotionDef(actionParam);
      if (!motion) {
        res.status(404).json({ ok: false, error: "motion not found" });
        return;
      }
      res.status(200).json({
        ok: true,
        schema: MOTION_PACK_SCHEMA,
        motion: { ...motion, ...enrichMotionWithClip(motion.id) },
      });
      return;
    }

    if (packParam) {
      const pack = getMotionPack(packParam);
      if (!pack) {
        res.status(404).json({ ok: false, error: "pack not found" });
        return;
      }
      res.status(200).json({
        ok: true,
        schema: MOTION_PACK_SCHEMA,
        pack: enrichPackMotions(pack),
      });
      return;
    }

    res.status(200).json({
      ok: true,
      schema: MOTION_PACK_SCHEMA,
      packs: listMotionPacks().map((p) => ({
        id: p.id,
        label: p.label,
        version: p.version,
        motionCount: p.motions.length,
      })),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
