# FFmpeg Cinema Assembly Template

## 1) Per-shot motion (zoompan)
```bash
ffmpeg -loop 1 -i shot_001.png -i shot_001.wav \
-filter_complex "[0:v]scale=1920:1080,zoompan=z='min(zoom+0.0009,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30[v]" \
-map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -shortest shot_001.mp4
```

## 2) Crossfade between shots
```bash
ffmpeg -i shot_001.mp4 -i shot_002.mp4 \
-filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.35:offset=2.65[v];[0:a][1:a]acrossfade=d=0.35[a]" \
-map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p scene_001_002.mp4
```

## 3) Burn subtitles
```bash
ffmpeg -i final_video.mp4 -vf "subtitles=final.srt:force_style='Fontsize=18,PrimaryColour=&H00F7E7A6,Outline=1,Shadow=0'" -c:a copy final_with_subs.mp4
```

## 4) Quality Rules (Frozen)
- Transition required for all adjacent shots except intentional smash-cut scenes.
- Audio-video sync tolerance <= 120ms.
- Subtitle line max 22 CJK chars or 42 EN chars.
- Loudness normalize to -16 LUFS integrated.
