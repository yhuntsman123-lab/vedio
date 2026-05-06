# Prompt Templates (Frozen)

## 1) Style Prefix (Required)
`dark epic, cyberpunk neon cyan lighting, dark guofeng, cinematic volumetric lighting, dramatic atmosphere, high contrast, ultra detailed`

## 2) Character Anchor Prompt
`{{STYLE_PREFIX}}, portrait of {{CHAR_NAME}}, {{AGE_RANGE}}, {{FACE_SIGNATURE}}, {{HAIR_STYLE}}, {{EYE_DESC}}, same identity across scenes, clean face geometry, realistic skin texture`

## 3) Shot Prompt
`{{STYLE_PREFIX}}, {{SHOT_TYPE}}, {{CAMERA_ANGLE}}, {{LENS_HINT}}, {{SCENE_ENV}}, {{ACTION}}, {{EMOTION}}, outfit: {{OUTFIT_STATE}}, keep same facial identity as reference`

## 4) Negative Prompt
`worst quality, low quality, blurry, deformed face, asymmetrical eyes, extra limbs, extra fingers, bad hands, duplicate face, identity drift, watermark, logo, text artifacts`

## 5) Rewrite Prompt (Script Polishing)
System:
`You are an expert screenplay adapter. Keep original meaning and plot; improve pacing, visual actions, and emotional beats for short-form episodic comic drama. Output JSON only.`

User Template:
`Rewrite the following script into cinematic shots. Keep language same as input.
Return JSON fields: title, synopsis, characters[], shots[].
Each shot: shot_id, duration_sec, scene, action, dialogue, narration, mood, outfit_state, camera.
Input:\n{{RAW_SCRIPT}}`

## 6) Translation Prompt (CN/EN -> EN Image Prompt)
System:
`Translate and normalize script shot description into concise high-performing English image prompt for diffusion models. Preserve identity and outfit constraints.`

User Template:
`Source language: {{LANG}}
Character constraints: {{CHAR_CONSTRAINTS}}
Shot text: {{SHOT_TEXT}}
Return: one-line English prompt only.`

## 7) Semantic Fidelity Check Prompt (Required)
System:
`You are a strict semantic QA checker. Compare source shot text and back-translated English prompt. Score semantic fidelity from 0 to 1. Penalize any drift in character identity, action, emotion, scene, timeline, or outfit state.`

User Template:
`Source shot text: {{PROMPT_SOURCE}}
English prompt: {{PROMPT_EN}}
Back translation: {{PROMPT_BACK_TRANSLATED}}
Return JSON only:
{
  "semantic_check_score": 0.0,
  "drift_items": [],
  "pass": true
}`

## 8) Glossary Lock Prompt (Required)
System:
`Apply glossary lock before finalizing English prompt. Terms in glossary must remain fixed and cannot be creatively rewritten.`

User Template:
`Glossary:
{{GLOSSARY_TERMS}}
Candidate prompt:
{{PROMPT_EN_DRAFT}}
Return:
final one-line English prompt only.`
