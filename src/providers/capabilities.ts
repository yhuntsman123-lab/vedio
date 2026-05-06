export type ProviderId = "generic" | "doubao" | "keling" | "runway";

export interface ProviderCapabilities {
  // 平台标识（不影响业务逻辑，仅用于导出适配）
  providerId: ProviderId;
  // 单条视频片段的最大秒数（超过会自动切段）
  maxClipDurationSec: number;
  // 单条视频片段最小秒数（防止尾段过短）
  minClipDurationSec: number;
  // 是否支持转场（后续可用于组合策略）
  supportsTransitions: boolean;
}

export interface ShotSegment {
  shotId: string;
  segmentIndex: number;
  durationSec: number;
  startOffsetSec: number;
}

const DEFAULT_CAPS: Record<ProviderId, ProviderCapabilities> = {
  // 通用默认：不绑定具体平台，优先用于产品内部预览/标准导出
  generic: { providerId: "generic", maxClipDurationSec: 15, minClipDurationSec: 1, supportsTransitions: true },
  // 豆包示例能力：单段上限 9 秒（如未来接入可直接启用）
  doubao: { providerId: "doubao", maxClipDurationSec: 9, minClipDurationSec: 1, supportsTransitions: true },
  keling: { providerId: "keling", maxClipDurationSec: 10, minClipDurationSec: 1, supportsTransitions: true },
  runway: { providerId: "runway", maxClipDurationSec: 16, minClipDurationSec: 1, supportsTransitions: true }
};

export function getProviderCapabilities(providerId: ProviderId): ProviderCapabilities {
  return DEFAULT_CAPS[providerId];
}

export function splitShotByCapabilities(shotId: string, durationSec: number, caps: ProviderCapabilities): ShotSegment[] {
  // 如果目标时长在平台上限内，保持单镜头，不做切分
  if (durationSec <= caps.maxClipDurationSec) {
    return [{ shotId, segmentIndex: 0, durationSec, startOffsetSec: 0 }];
  }

  const segments: ShotSegment[] = [];
  let remain = durationSec;
  let index = 0;
  let offset = 0;

  while (remain > 0) {
    let seg = Math.min(remain, caps.maxClipDurationSec);

    // 保障最后一段不低于最小时长：从前一段“借时长”
    if (remain - seg > 0 && remain - seg < caps.minClipDurationSec) {
      const borrow = caps.minClipDurationSec - (remain - seg);
      seg -= borrow;
    }

    segments.push({ shotId, segmentIndex: index, durationSec: Number(seg.toFixed(3)), startOffsetSec: Number(offset.toFixed(3)) });
    remain -= seg;
    offset += seg;
    index += 1;
  }

  return segments;
}
