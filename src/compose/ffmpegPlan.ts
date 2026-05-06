export interface ComposeShot {
  shotId: string;
  image: string;
  audio: string;
  durationSec: number;
}

export interface ComposePlan {
  perShotCommands: string[];
  transitionCommands: string[];
  subtitleCommand: string;
}

export function buildComposePlan(shots: ComposeShot[]): ComposePlan {
  const perShotCommands = shots.map((s, idx) => {
    const out = `shot_${String(idx + 1).padStart(3, "0")}.mp4`;
    return [
      "ffmpeg -loop 1",
      `-i ${s.image}`,
      `-i ${s.audio}`,
      '-filter_complex "[0:v]scale=1920:1080,zoompan=z=\'min(zoom+0.0009,1.08)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=1:s=1920x1080:fps=30[v]"',
      '-map "[v]" -map 1:a -c:v libx264 -pix_fmt yuv420p -shortest',
      out
    ].join(" ");
  });

  const transitionCommands: string[] = [];
  for (let i = 0; i < shots.length - 1; i += 1) {
    const left = `shot_${String(i + 1).padStart(3, "0")}.mp4`;
    const right = `shot_${String(i + 2).padStart(3, "0")}.mp4`;
    const out = `scene_${String(i + 1).padStart(3, "0")}_${String(i + 2).padStart(3, "0")}.mp4`;
    const offset = Math.max(0.2, shots[i].durationSec - 0.35).toFixed(2);
    transitionCommands.push(
      [
        `ffmpeg -i ${left} -i ${right}`,
        `-filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.35:offset=${offset}[v];[0:a][1:a]acrossfade=d=0.35[a]"`,
        '-map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p',
        out
      ].join(" ")
    );
  }

  const subtitleCommand =
    'ffmpeg -i final_video.mp4 -vf "subtitles=final.srt:force_style=\'Fontsize=18,PrimaryColour=&H00F7E7A6,Outline=1,Shadow=0\'" -c:a copy final_with_subs.mp4';

  return {
    perShotCommands,
    transitionCommands,
    subtitleCommand
  };
}
