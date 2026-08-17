# Multi-vendor robot talk motion

Amoji maps Disney-style **talk gesture styles** (`explain`, `point`, `wave`, …) onto
portable command packages for several robot ecosystems. Adapters emit JSON a
hardware bridge can consume — they do **not** ship vendor SDKs or talk to robots
over the network.

Module: `engine/robot/talkMotion.js` · schema `amoji.robotMotion.v1`

## Vendors

| Vendor id | Company / stack | Adapted from (open / published) |
| --- | --- | --- |
| `sakura` | Sakura Face Live / VTube Studio | Existing Amoji Live2D inject (Prox→Mid→Tip fingers) |
| `softbank` | SoftBank NAO & Pepper (NAOqi) | [ALAnimationPlayer tags](http://doc.aldebaran.com/2-8/naoqi/motion/alanimationplayer-advanced.html) + [ALAnimatedSpeech](http://doc.aldebaran.com/2-8/naoqi/audio/alanimatedspeech.html) `^start` / `^wait` |
| `furhat` | Furhat Robotics | [Gestures](https://docs.furhat.io/gestures/) + [Remote API](https://docs.furhat.io/remote-api/) `/furhat/gesture` |
| `reachy` | Pollen Robotics Reachy | [reachy-sdk](https://github.com/pollen-robotics/reachy-sdk) (Apache-2.0) arm `goto` joint lists |
| `unitree_g1` | Unitree G1 humanoid | Open retarget naming from [GMR](https://github.com/YanjieZe/GMR) / [LAFAN1 Unitree dataset](https://huggingface.co/datasets/unitreerobotics/LAFAN1_Retargeting_Dataset) |
| `ros` | Any ROS bridge | `sensor_msgs/JointState` shaped from the Unitree upper-body targets |

Aliases: `pepper`/`nao`/`naoqi` → `softbank`; `g1` → `unitree_g1`; `pollen` → `reachy`.

## Style → SoftBank tag (examples)

| Talk style | NAOqi tag | Default Stand path |
| --- | --- | --- |
| `explain` | `explain` | `animations/Stand/Gestures/Explain_1` |
| `point` | `indicate` | `…/You_1` |
| `wave` | `hello` | `…/Hey_1` |
| `shrug` | `not know` | `…/IDontKnow_1` |
| `thinking` | `think` | `…/Thinking_1` |
| `celebrate` | `happy` | `…/Enthusiastic_5` |

## Usage

```js
import {
  buildRobotMotionPackage,
  createRobotMotionAdapter,
  createVoiceRobotBridge,
} from "@amoji/engine/engine";

const pkg = buildRobotMotionPackage({
  text: "睇下呢個！",
  vendor: "softbank",
});
// pkg.softbank.tag === "indicate"
// pkg.softbank.annotatedSay → "^start(animations/Stand/Gestures/You_1) …"

const adapter = createRobotMotionAdapter({ vendor: "reachy" });
adapter.fromStyle("wave"); // → reachy.r_arm 7-DOF degrees

const robot = createVoiceRobotBridge({ motionVendor: "unitree_g1" });
const turn = await robot.runTurn("哈哈好開心");
turn.motion.unitree_g1.joints; // upper-body rad targets
```

Lab: **Motion:** button cycles vendors (`?motion=` / `amoji.motionVendor`); Robot HUD **motion** row shows the active package + dispatch log. SoftBank turns also return `annotatedReply` for ALAnimatedSpeech.

While speaking, the lab samples vendor frames (~12 Hz) through `sampleVendorMotionFrame` / `createRobotMotionDispatcher` (mock hardware bridge).

## Hardware notes

- SoftBank / Furhat packages are ready for an external qi / HTTP bridge.
- Reachy / Unitree joint numbers are **expressive approximations** — calibrate before real robots.
- `unitree_g1` and `ros` packages are **upper-body talk only** (no locomotion).
- Keep Sakura Face Live for avatar fingers; pick SoftBank/Reachy/Unitree when driving a physical body.

See also [Session & presence](./SESSION_AND_PRESENCE.md) (talk gestures) and [Realtime voice lab](./REALTIME_VOICE_LAB.md).
