Cantonese + Hong Kong English voice samples (Edge TTS neural)

Downloaded for in-app preview and attribution reference.
Source: Microsoft Edge TTS (no API key; server-side synthesis in ttsHandler.mjs).

Cantonese (zh-HK):
  hiugaai.mp3   — 曉佳  zh-HK-HiuGaaiNeural   (Amoji)
  hiumaan.mp3   — 曉曼  zh-HK-HiuMaanNeural   (Sora)
  wanlung.mp3   — 雲龍  zh-HK-WanLungNeural   (Rex)

Hong Kong English (en-HK):
  yan-en-hk.mp3 — Yan   en-HK-YanNeural       (Kizuna EN)
  sam-en-hk.mp3 — Sam   en-HK-SamNeural       (Rex EN)

Persona profiles (same speaker, tuned prosody): see companionVoiceProfiles.js
  zh-HK-HiuGaaiNeural-idol, zh-HK-HiuMaanNeural-cool, en-US-AriaNeural-cool

Emotion comparison clips (happy/sad/surprised/thinking):
  emotion/en/*.mp3, emotion/yue/*.mp3 — regenerate with:
  node amoji-engine/scripts/generate-voice-emotion-samples.mjs

OpenAI voices (openai-coral, openai-marin, …) need OPENAI_API_KEY on the server.
Try the interactive demo: prototypes/voice-emotion-demo.html

Note: Microsoft currently ships only 3 zh-HK neural speakers. For more
Cantonese timbres later, see CosyVoice2-Yue (HuggingFace) or WenetSpeech-Yue.
