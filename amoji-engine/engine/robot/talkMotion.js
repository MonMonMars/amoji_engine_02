/**
 * Multi-vendor robot talk-motion adapters.
 *
 * Maps Amoji Disney-style talk gesture styles onto command envelopes inspired by
 * open / published APIs from several robot companies (no vendor SDK required):
 *
 * - SoftBank / Aldebaran NAO & Pepper — ALAnimationPlayer tags + ALAnimatedSpeech
 *   annotations (doc.aldebaran.com NAOqi 2.8 Animation Library tags)
 * - Furhat Robotics — named gestures + Remote API gesture frames
 *   (docs.furhat.io Gestures / Remote API)
 * - Pollen Robotics Reachy — arm `goto` joint targets in degrees
 *   (reachy-sdk / Reachy 2 arm control docs, Apache-2.0 SDK)
 * - Unitree G1 — upper-body joint targets (rad) using common open retarget names
 *   (GMR / LAFAN1 retargeting community conventions)
 * - ROS — `sensor_msgs/JointState`-shaped payloads for any ROS bridge
 * - Sakura Face Live — existing Live2D talk-gesture params
 *
 * These adapters emit portable JSON a hardware bridge can consume; they do not
 * talk to robots directly.
 */
import {
  inferTalkGestureFromText,
  sampleTalkGesture,
  talkGestureToFaceLiveParams,
  TALK_GESTURE_STYLES,
} from "../face/talkGestures.js";

export const ROBOT_MOTION_SCHEMA = "amoji.robotMotion.v1";

/** Supported vendor adapters. */
export const ROBOT_MOTION_VENDORS = Object.freeze([
  "sakura",
  "softbank",
  "furhat",
  "reachy",
  "unitree_g1",
  "ros",
]);

/**
 * SoftBank NAOqi animation tags + default Stand gesture paths.
 * Tags from ALAnimationPlayer Advanced (NAOqi 2.8 Animation Library).
 */
export const SOFTBANK_STYLE_MAP = Object.freeze({
  explain: {
    tag: "explain",
    path: "animations/Stand/Gestures/Explain_1",
  },
  point: {
    tag: "indicate",
    path: "animations/Stand/Gestures/You_1",
  },
  emphasize: {
    tag: "enthusiastic",
    path: "animations/Stand/Gestures/Enthusiastic_4",
  },
  shrug: {
    tag: "not know",
    path: "animations/Stand/Gestures/IDontKnow_1",
  },
  celebrate: {
    tag: "happy",
    path: "animations/Stand/Gestures/Enthusiastic_5",
  },
  count: {
    tag: "show",
    path: "animations/Stand/Gestures/You_4",
  },
  wave: {
    tag: "hello",
    path: "animations/Stand/Gestures/Hey_1",
  },
  question: {
    tag: "unknown",
    path: "animations/Stand/Gestures/IDontKnow_2",
  },
  soft: {
    tag: "body language",
    path: "animations/Stand/Gestures/BodyTalk_3",
  },
  thinking: {
    tag: "think",
    path: "animations/Stand/Gestures/Thinking_1",
  },
});

/**
 * Furhat built-in / Remote API gesture names (docs.furhat.io).
 * Custom keyframes approximate body-less social cues when needed.
 */
export const FURHAT_STYLE_MAP = Object.freeze({
  explain: { name: "Thoughtful", strength: 0.7 },
  point: { name: "GazeAway", strength: 0.85 },
  emphasize: { name: "Surprise", strength: 1 },
  shrug: { name: "Oh", strength: 0.8 },
  celebrate: { name: "BigSmile", strength: 1 },
  count: { name: "Nod", strength: 0.75 },
  wave: { name: "Smile", strength: 0.9 },
  question: { name: "BrowRaise", strength: 0.95 },
  soft: { name: "Smile", strength: 0.45 },
  thinking: { name: "Thoughtful", strength: 0.9 },
});

/**
 * Reachy arm joint order (degrees) used by Pollen `arm.goto([...])`:
 * [shoulder_pitch, shoulder_roll, arm_yaw, elbow_pitch, forearm_yaw, wrist_pitch, wrist_roll]
 * Values are expressive approximations adapted from Reachy SDK goto examples —
 * tune per robot calibration before real hardware use.
 */
export const REACHY_STYLE_JOINTS = Object.freeze({
  explain: {
    l_arm: [20, 10, 0, -70, 0, 0, 0],
    r_arm: [25, -10, 0, -65, 0, 0, 0],
  },
  point: {
    l_arm: [10, 5, 0, -80, 0, 0, 0],
    r_arm: [55, -25, 15, -20, 0, 10, 0],
  },
  emphasize: {
    l_arm: [45, 20, 0, -40, 0, 0, 0],
    r_arm: [45, -20, 0, -40, 0, 0, 0],
  },
  shrug: {
    l_arm: [35, 40, 0, -55, 0, 0, 0],
    r_arm: [35, -40, 0, -55, 0, 0, 0],
  },
  celebrate: {
    l_arm: [70, 25, 0, -25, 0, 0, 0],
    r_arm: [70, -25, 0, -25, 0, 0, 0],
  },
  count: {
    l_arm: [10, 5, 0, -85, 0, 0, 0],
    r_arm: [50, -20, 10, -30, 0, 5, 0],
  },
  wave: {
    l_arm: [10, 5, 0, -85, 0, 0, 0],
    r_arm: [60, -30, 20, -35, 0, 15, 0],
  },
  question: {
    l_arm: [40, 30, 0, -50, 0, 0, 0],
    r_arm: [40, -30, 0, -50, 0, 0, 0],
  },
  soft: {
    l_arm: [15, 8, 0, -75, 0, 0, 0],
    r_arm: [15, -8, 0, -75, 0, 0, 0],
  },
  thinking: {
    l_arm: [45, 15, 25, -55, 20, 15, 0],
    r_arm: [10, -5, 0, -85, 0, 0, 0],
  },
});

/**
 * Unitree G1 upper-body joint targets (radians).
 * Names follow common open retargeting conventions (GMR / community LAFAN1 ports).
 * Legs stay at 0 — talk gestures are upper-body only.
 */
export const UNITREE_G1_STYLE_JOINTS = Object.freeze({
  explain: {
    waist_yaw: 0.05,
    left_shoulder_pitch: 0.35,
    left_shoulder_roll: 0.15,
    left_elbow: -0.9,
    right_shoulder_pitch: 0.4,
    right_shoulder_roll: -0.15,
    right_elbow: -0.85,
  },
  point: {
    waist_yaw: 0.08,
    left_shoulder_pitch: 0.15,
    left_elbow: -1.1,
    right_shoulder_pitch: 0.95,
    right_shoulder_roll: -0.35,
    right_elbow: -0.25,
    right_wrist_yaw: 0.2,
  },
  emphasize: {
    left_shoulder_pitch: 0.7,
    left_shoulder_roll: 0.25,
    left_elbow: -0.5,
    right_shoulder_pitch: 0.7,
    right_shoulder_roll: -0.25,
    right_elbow: -0.5,
  },
  shrug: {
    left_shoulder_pitch: 0.55,
    left_shoulder_roll: 0.55,
    left_elbow: -0.7,
    right_shoulder_pitch: 0.55,
    right_shoulder_roll: -0.55,
    right_elbow: -0.7,
  },
  celebrate: {
    left_shoulder_pitch: 1.15,
    left_shoulder_roll: 0.3,
    left_elbow: -0.3,
    right_shoulder_pitch: 1.15,
    right_shoulder_roll: -0.3,
    right_elbow: -0.3,
  },
  count: {
    right_shoulder_pitch: 0.85,
    right_shoulder_roll: -0.25,
    right_elbow: -0.35,
    right_wrist_yaw: 0.15,
  },
  wave: {
    right_shoulder_pitch: 1.0,
    right_shoulder_roll: -0.4,
    right_elbow: -0.45,
    right_wrist_yaw: 0.35,
  },
  question: {
    left_shoulder_pitch: 0.6,
    left_shoulder_roll: 0.4,
    left_elbow: -0.65,
    right_shoulder_pitch: 0.6,
    right_shoulder_roll: -0.4,
    right_elbow: -0.65,
  },
  soft: {
    left_shoulder_pitch: 0.2,
    left_elbow: -1.0,
    right_shoulder_pitch: 0.2,
    right_elbow: -1.0,
  },
  thinking: {
    waist_yaw: -0.08,
    left_shoulder_pitch: 0.75,
    left_elbow: -0.7,
    left_wrist_yaw: 0.25,
    right_shoulder_pitch: 0.15,
    right_elbow: -1.1,
  },
});

/**
 * @param {string | null | undefined} vendor
 */
export function normalizeRobotMotionVendor(vendor) {
  const v = String(vendor || "sakura")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (v === "nao" || v === "pepper" || v === "naoqi" || v === "aldebaran") {
    return "softbank";
  }
  if (v === "unitree" || v === "g1") return "unitree_g1";
  if (v === "pollen" || v === "reachy2") return "reachy";
  if (ROBOT_MOTION_VENDORS.includes(v)) return v;
  return "sakura";
}

/**
 * @param {string | null | undefined} vendor
 */
export function nextRobotMotionVendor(vendor) {
  const cur = normalizeRobotMotionVendor(vendor);
  const idx = ROBOT_MOTION_VENDORS.indexOf(cur);
  return ROBOT_MOTION_VENDORS[(Math.max(0, idx) + 1) % ROBOT_MOTION_VENDORS.length];
}

/**
 * Build a portable motion package from talk-gesture style / text.
 * @param {{
 *   style?: string,
 *   text?: string,
 *   emotion?: string,
 *   intensity?: number,
 *   timeSec?: number,
 *   speechEnergy?: number,
 *   vendor?: string,
 *   countDigit?: number,
 * }} [opts]
 */
export function buildRobotMotionPackage(opts = {}) {
  const vendor = normalizeRobotMotionVendor(opts.vendor);
  const style =
    opts.style && TALK_GESTURE_STYLES.includes(String(opts.style))
      ? String(opts.style)
      : inferTalkGestureFromText(opts.text || "", { emotion: opts.emotion });
  const intensity = clamp(opts.intensity ?? 0.72, 0.15, 1.35);
  const timeSec = Math.max(0, Number(opts.timeSec) || 0.4);
  const sample = sampleTalkGesture(timeSec, {
    style,
    intensity,
    emotion: opts.emotion,
    speechEnergy: opts.speechEnergy,
    countDigit: opts.countDigit,
  });

  const base = {
    schema: ROBOT_MOTION_SCHEMA,
    vendor,
    style,
    intensity,
    emotion: opts.emotion || "neutral",
    sources: vendorSources(vendor),
    sample: {
      timeSec: sample.timeSec,
      fingerTips: sample.fingerTips,
    },
  };

  switch (vendor) {
    case "softbank":
      return { ...base, softbank: toSoftbankMotion(style, opts.text) };
    case "furhat":
      return { ...base, furhat: toFurhatMotion(style, intensity) };
    case "reachy":
      return { ...base, reachy: toReachyMotion(style, intensity) };
    case "unitree_g1":
      return {
        ...base,
        unitree_g1: toUnitreeG1Motion(style, intensity, sample.pose),
      };
    case "ros":
      return { ...base, ros: toRosMotion(style, intensity, sample.pose) };
    case "sakura":
    default:
      return {
        ...base,
        sakura: {
          parameters: talkGestureToFaceLiveParams(sample),
          style,
        },
      };
  }
}

/**
 * Annotate reply text for SoftBank ALAnimatedSpeech.
 * @param {string} text
 * @param {string} style
 */
export function annotateSoftbankSpeech(text, style) {
  const map = SOFTBANK_STYLE_MAP[style] || SOFTBANK_STYLE_MAP.explain;
  const spoken = String(text || "").trim() || " ";
  return `^start(${map.path}) ${spoken} ^wait(${map.path})`;
}

/** @param {string} style @param {string | undefined} text */
export function toSoftbankMotion(style, text) {
  const map = SOFTBANK_STYLE_MAP[style] || SOFTBANK_STYLE_MAP.explain;
  return {
    api: "ALAnimationPlayer / ALAnimatedSpeech",
    tag: map.tag,
    runTag: map.tag,
    run: map.path,
    annotatedSay: annotateSoftbankSpeech(text || "", style),
    // Example NAOqi calls (documentation only — not executed here)
    qiExample: [
      `animation_player.runTag("${map.tag}")`,
      `animated_speech.say(${JSON.stringify(annotateSoftbankSpeech(text || "Hello", style))})`,
    ],
  };
}

/** @param {string} style @param {number} intensity */
export function toFurhatMotion(style, intensity) {
  const map = FURHAT_STYLE_MAP[style] || FURHAT_STYLE_MAP.explain;
  const strength = Number((map.strength * intensity).toFixed(3));
  return {
    api: "Furhat Remote API POST /furhat/gesture",
    name: map.name,
    strength,
    duration: 1,
    // Optional custom keyframe body (Remote API GestureDefinition shape)
    definition: {
      name: `amoji_${style}`,
      frames: [
        {
          time: [0.15],
          params: furhatFrameParams(style, strength),
        },
        {
          time: [0.9],
          params: { reset: true },
        },
      ],
    },
  };
}

/** @param {string} style @param {number} intensity */
export function toReachyMotion(style, intensity) {
  const joints = REACHY_STYLE_JOINTS[style] || REACHY_STYLE_JOINTS.explain;
  const scale = (arr) =>
    arr.map((v) => Number((v * (0.65 + 0.35 * intensity)).toFixed(2)));
  return {
    api: "Pollen Reachy SDK arm.goto(joints_deg)",
    durationSec: Number((0.55 + intensity * 0.35).toFixed(2)),
    interpolation: "minimum_jerk",
    l_arm: scale(joints.l_arm),
    r_arm: scale(joints.r_arm),
    sdkExample:
      "reachy.r_arm.goto(r_arm, duration=durationSec, interpolation_mode='minimum_jerk')",
  };
}

/**
 * @param {string} style
 * @param {number} intensity
 * @param {Record<string, number>} [pose]
 */
export function toUnitreeG1Motion(style, intensity, pose = {}) {
  const base = {
    ...(UNITREE_G1_STYLE_JOINTS[style] || UNITREE_G1_STYLE_JOINTS.explain),
  };
  // Blend a little from Disney pose energy into shoulder pitch
  if (pose.armRA != null) {
    base.right_shoulder_pitch = Number(
      (
        (base.right_shoulder_pitch || 0) * 0.7 +
        pose.armRA * 0.9 * intensity
      ).toFixed(3),
    );
  }
  if (pose.armLA != null) {
    base.left_shoulder_pitch = Number(
      (
        (base.left_shoulder_pitch || 0) * 0.7 +
        pose.armLA * 0.9 * intensity
      ).toFixed(3),
    );
  }
  for (const key of Object.keys(base)) {
    base[key] = Number((base[key] * (0.7 + 0.3 * intensity)).toFixed(3));
  }
  return {
    api: "Unitree G1 upper-body joints (open retarget naming)",
    frameRateHz: 30,
    joints: base,
    note: "Upper-body talk gesture only; do not command locomotion from this package.",
  };
}

/**
 * @param {string} style
 * @param {number} intensity
 * @param {Record<string, number>} [pose]
 */
export function toRosMotion(style, intensity, pose = {}) {
  const g1 = toUnitreeG1Motion(style, intensity, pose);
  const names = Object.keys(g1.joints);
  return {
    api: "sensor_msgs/JointState",
    header: { frame_id: "amoji_talk_gesture" },
    name: names,
    position: names.map((n) => g1.joints[n]),
    velocity: names.map(() => 0),
    effort: names.map(() => 0),
  };
}

/**
 * @param {string} vendor
 * @param {object} motionPackage
 */
export function formatRobotMotionHud(motionPackage) {
  if (!motionPackage) return "—";
  const vendor = motionPackage.vendor || "?";
  const style = motionPackage.style || "?";
  if (motionPackage.softbank) {
    return `${vendor} · ${style} · tag ${motionPackage.softbank.tag}`;
  }
  if (motionPackage.furhat) {
    return `${vendor} · ${style} · ${motionPackage.furhat.name}`;
  }
  if (motionPackage.reachy) {
    return `${vendor} · ${style} · r_arm[${motionPackage.reachy.r_arm[0]}]`;
  }
  if (motionPackage.unitree_g1) {
    const j = motionPackage.unitree_g1.joints;
    return `${vendor} · ${style} · R.pitch ${j.right_shoulder_pitch ?? 0}`;
  }
  if (motionPackage.ros) {
    return `${vendor} · ${style} · ${motionPackage.ros.name.length} joints`;
  }
  if (motionPackage.sakura) {
    return `${vendor} · ${style} · ${motionPackage.sakura.parameters.length}p`;
  }
  return `${vendor} · ${style}`;
}

/**
 * Plan step labels for robot HUD / archives.
 * @param {object} motionPackage
 */
export function robotMotionPlanSteps(motionPackage) {
  if (!motionPackage) return [];
  const steps = [`motion:${motionPackage.vendor}:${motionPackage.style}`];
  if (motionPackage.softbank) {
    steps.push(`naoqi:tag:${motionPackage.softbank.tag}`);
    steps.push(`naoqi:run:${motionPackage.softbank.run}`);
  } else if (motionPackage.furhat) {
    steps.push(`furhat:gesture:${motionPackage.furhat.name}`);
  } else if (motionPackage.reachy) {
    steps.push("reachy:goto:arms");
  } else if (motionPackage.unitree_g1) {
    steps.push("unitree:g1:upper_body");
  } else if (motionPackage.ros) {
    steps.push(`ros:JointState:${motionPackage.ros.name.length}`);
  } else if (motionPackage.sakura) {
    steps.push("sakura:talk_gesture");
  }
  return steps;
}

/**
 * Stateful adapter used by the lab / robot bridge.
 * @param {{ vendor?: string, intensity?: number }} [opts]
 */
export function createRobotMotionAdapter(opts = {}) {
  let vendor = normalizeRobotMotionVendor(opts.vendor);
  let intensity = opts.intensity ?? 0.72;
  /** @type {object | null} */
  let last = null;

  return {
    get schema() {
      return ROBOT_MOTION_SCHEMA;
    },
    get vendor() {
      return vendor;
    },
    get last() {
      return last;
    },
    setVendor(next) {
      vendor = normalizeRobotMotionVendor(next);
      return vendor;
    },
    cycleVendor() {
      vendor = nextRobotMotionVendor(vendor);
      return vendor;
    },
    setIntensity(value) {
      intensity = clamp(value, 0.15, 1.35);
      return intensity;
    },
    /**
     * @param {string} text
     * @param {{ emotion?: string, style?: string, timeSec?: number }} [extra]
     */
    fromText(text, extra = {}) {
      last = buildRobotMotionPackage({
        text,
        emotion: extra.emotion,
        style: extra.style,
        intensity,
        vendor,
        timeSec: extra.timeSec,
      });
      return last;
    },
    /**
     * @param {string} style
     * @param {{ emotion?: string, timeSec?: number, text?: string }} [extra]
     */
    fromStyle(style, extra = {}) {
      last = buildRobotMotionPackage({
        style,
        text: extra.text,
        emotion: extra.emotion,
        intensity,
        vendor,
        timeSec: extra.timeSec,
      });
      return last;
    },
  };
}

/** @param {string} vendor */
function vendorSources(vendor) {
  switch (vendor) {
    case "softbank":
      return [
        "SoftBank/Aldebaran NAOqi ALAnimationPlayer tags",
        "ALAnimatedSpeech ^start/^wait annotations",
        "http://doc.aldebaran.com/2-8/naoqi/motion/alanimationplayer-advanced.html",
      ];
    case "furhat":
      return [
        "Furhat Gestures + Remote API",
        "https://docs.furhat.io/gestures/",
        "https://docs.furhat.io/remote-api/",
      ];
    case "reachy":
      return [
        "Pollen Robotics Reachy SDK (Apache-2.0)",
        "https://github.com/pollen-robotics/reachy-sdk",
        "Reachy 2 arm goto joint control docs",
      ];
    case "unitree_g1":
      return [
        "Unitree G1 open retarget motion conventions (GMR / LAFAN1 ports)",
        "https://github.com/YanjieZe/GMR",
        "https://huggingface.co/datasets/unitreerobotics/LAFAN1_Retargeting_Dataset",
      ];
    case "ros":
      return [
        "ROS sensor_msgs/JointState",
        "Adapted from Unitree G1 upper-body talk targets",
      ];
    default:
      return [
        "Sakura Face Live / VTube Studio InjectParameterData",
        "Amoji talkGestures Prox→Mid→Tip finger chains",
      ];
  }
}

/** @param {string} style @param {number} strength */
function furhatFrameParams(style, strength) {
  const s = clamp(strength, 0, 1);
  switch (style) {
    case "celebrate":
      return { SMILE_OPEN: s, BROW_UP_LEFT: s * 0.6, BROW_UP_RIGHT: s * 0.6 };
    case "question":
      return { BROW_UP_LEFT: s, BROW_UP_RIGHT: s * 0.85 };
    case "thinking":
      return { BROW_IN_LEFT: s * 0.7, BROW_UP_RIGHT: s * 0.4, NECK_PAN: -8 * s };
    case "soft":
      return { SMILE_CLOSED: s * 0.6 };
    case "emphasize":
      return { SURPRISE: s * 0.7, BROW_UP_LEFT: s, BROW_UP_RIGHT: s };
    case "shrug":
      return { NECK_TILT: 6 * s, BROW_UP_LEFT: s * 0.5, BROW_UP_RIGHT: s * 0.5 };
    case "wave":
      return { SMILE_OPEN: s * 0.8, NECK_PAN: 10 * s };
    case "point":
      return { NECK_PAN: 12 * s, BROW_UP_RIGHT: s * 0.4 };
    default:
      return { SMILE_CLOSED: s * 0.35, BROW_UP_LEFT: s * 0.2 };
  }
}

/** @param {number} n @param {number} lo @param {number} hi */
function clamp(n, lo, hi) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
