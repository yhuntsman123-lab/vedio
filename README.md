# vedio

# AI Studio

本仓库已初始化为 AI 漫剧引擎执行基线。

## 已冻结文档
- docs/architecture/CONSISTENCY_AND_CINEMA_FROZEN_SPEC.md
- docs/architecture/OPEN_SOURCE_STACK_MANIFEST.md
- docs/prompts/PROMPT_LIBRARY_FROZEN.md
- docs/workflows/comfyui_shot_render_sdxl_instantid_ipadapter.template.json
- docs/workflows/comfyui_shot_render_flux_pulid_fallback.template.json
- infra/ffmpeg/FFMPEG_CINEMA_TEMPLATE.md

## 下一步执行顺序（固定）
1. D1 schema + points ledger transaction
2. Worker API contracts + Stripe webhook verify
3. Queue pipeline (script -> render -> tts -> compose)
4. Modal ComfyUI runtime + workflow executor
5. Cloud Run ffmpeg assembler service
6. SEO/GEO page rendering and metadata
