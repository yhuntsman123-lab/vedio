# Open-Source Stack Manifest (Frozen)

## Core
- ComfyUI
  - Repo: https://github.com/comfyanonymous/ComfyUI
  - Pin: latest stable tag in deployment month
  - Purpose: graph orchestration

- ComfyUI_IPAdapter_plus
  - Repo: https://github.com/cubiq/ComfyUI_IPAdapter_plus
  - Purpose: body/style consistency

- InstantID
  - Repo: https://github.com/InstantID/InstantID
  - Purpose: identity lock for SDXL path

- PuLID
  - Repo: https://github.com/ToTheBeginning/PuLID
  - Purpose: identity lock for FLUX fallback

- PhotoMaker
  - Repo: https://github.com/TencentARC/PhotoMaker
  - Purpose: actor forge enhancement

- FFmpeg
  - Docs: https://ffmpeg.org/ffmpeg-filters.html
  - Purpose: motion, transition, mux, subtitles

- WhisperX
  - Repo: https://github.com/m-bain/whisperX
  - Purpose: word-level alignment for subtitles

## Optional
- StoryDiffusion
  - Repo: https://github.com/HVision-NKU/StoryDiffusion
  - Purpose: long-sequence consistency fallback

## Acquisition Rules (Frozen)
1. All repos mirrored to private org mirror before production rollout.
2. Dependency versions are pinned in lockfiles; no floating main branch in production.
3. Model weights are not baked into Docker images; pulled at runtime from R2/external.
4. Every upgrade must pass golden regression set before promotion.
