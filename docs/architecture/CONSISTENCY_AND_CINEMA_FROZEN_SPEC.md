# AI Studio 冻结规范补充：角色一致性与影视质量引擎（不可更改）

日期：2026-05-05
状态：FROZEN_BASELINE_V1（后续项目执行不可更改）

## 1. 目标
- 在低成本前提下，实现跨镜头稳定角色一致性、电影感运镜与平滑转场、字幕音频毫秒级对齐。
- 全部流程可在 Cloudflare + Modal + Cloud Run 体系中自动化运行。

## 2. 顶级开源项目选型（固定）

### 2.1 角色一致性核心栈（固定优先级）
1. `ComfyUI`（主编排引擎）
2. `InstantID`（优先用于 SDXL 角色脸部身份锁定）
3. `PuLID`（FLUX 路线下高保真人脸一致性备选）
4. `IP-Adapter Plus`（服装、体态、风格参考锁定）
5. `ControlNet / OpenPose`（镜头动作姿态约束）
6. `PhotoMaker`（单图多图人物保持，可用于资产铸造增强）
7. `StoryDiffusion`（长序列一致性生成参考与兜底）

### 2.2 影视质量核心栈（固定优先级）
1. `FFmpeg`（运镜、转场、字幕合成）
2. `WhisperX`（词级时间戳对齐，字幕修正）
3. `Montreal Forced Aligner`（高精度强制对齐备选）

## 3. 获取方法（固定）

### 3.1 ComfyUI 及节点
- 主仓库：`https://github.com/comfyanonymous/ComfyUI`
- API/工作流规范：`https://docs.comfy.org/specs/workflow_json`
- IP-Adapter Plus：`https://github.com/cubiq/ComfyUI_IPAdapter_plus`
- InstantID：`https://github.com/InstantID/InstantID`
- PuLID：`https://github.com/ToTheBeginning/PuLID`
- PhotoMaker：`https://github.com/TencentARC/PhotoMaker`

### 3.2 语音字幕对齐
- WhisperX：`https://github.com/m-bain/whisperX`
- Montreal Forced Aligner：`https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner`

### 3.3 影视合成
- FFmpeg：`https://ffmpeg.org/ffmpeg-filters.html`

## 4. 固定工作流（不可改）

### 4.1 数字演员铸造（Actor Forge）
输入：角色结构化描述 + 风格约束
输出：`front/side/back` 三视图资产 + face_ref 裁切
固定步骤：
1. LLM 生成角色外观 JSON。
2. 生成三视图图像（同一 seed 族、同一角色 token）。
3. 自动裁切正脸区域，写入 `actor_face_ref`。
4. 入库 R2 与 D1（版本化）。

### 4.2 镜头渲染（Shot Render）
输入：shot prompt(en) + actor refs + pose ref(可选)
输出：单镜头关键帧（或短段）
固定策略：
1. FaceID 锁脸（权重高）
2. IP-Adapter 锁体态/服饰（权重中）
3. Prompt 控制服装状态机（normal/stealth/battle/damaged）
4. OpenPose 控动作幅度（避免崩脸）

### 4.3 质量门禁（Quality Gate）
每镜头必须计算：
1. 脸部相似度（embedding distance）
2. 风格一致度（CLIP style similarity）
3. 文本镜头意图匹配度
不达阈值：自动重渲染 1 次；仍失败则降级模型重渲染 1 次。

### 4.4 组装（Compose）
1. 对每镜头应用 `zoompan` 运镜。
2. 镜头间强制 `xfade`。
3. 旁白音频与字幕按词级时间戳对齐。
4. 最终 MP4 输出 + 封面图 + 可索引摘要。

## 5. 提示词体系（固定）

### 5.1 全局风格前缀（强制注入）
`dark epic, cyberpunk neon cyan lighting, dark guofeng, cinematic volumetric light, ultra-detailed, high contrast, dramatic atmosphere`

### 5.2 角色锁定模板（固定）
- Identity block：五官、年龄段、面部标记、发色发型
- Costume block：当前剧情服装状态
- Camera block：景别、机位、焦段、运动方向
- Safety block：避免畸形脸、额外肢体、错位眼睛

### 5.3 中英路由规则（固定）
- 用户原文可中文/英文。
- 绘图 prompt 永远输出英文。
- 字幕保留用户原文语种。
- 绘图英文 prompt 必须与原剧本语义严格一致，不得擅自改剧情、改人设、改情绪走向。
- 每个镜头必须保存双字段：`prompt_source`（原文语义版）与 `prompt_en`（英文执行版）。
- 上线前必须执行“回译一致性校验”：将 `prompt_en` 回译后与 `prompt_source` 比较，语义偏差超阈值则重写。

## 6. 成本与性能硬约束（固定）
1. 每任务先估算积分，再预扣。
2. 优先生成关键帧 + FFmpeg 物理运镜，避免全程视频扩散。
3. 镜头失败仅重跑失败镜头，不全片重跑。
4. 冷启动超过阈值时自动切低配模式（分辨率/步数下降）。

## 7. 三轮专家测试记录（本轮补充）

### Round 1（漫剧质量专家）
- 对比“单参考图”与“三视图+脸服分离”
- 结论：后者在跨镜头人物稳定性显著更优，确定为唯一方案。

### Round 2（架构与技术专家）
- 验证 ComfyUI + FFmpeg + WhisperX 的流水线可自动化与可回放。
- 结论：可落地，且失败重试粒度可细化到镜头级。

### Round 3（成本控制专家）
- 对比“全视频生成”与“关键帧+物理运镜”
- 结论：后者成本/产能/可控性最优，固定为默认生产路径。

## 8. 不可更改执行条款
1. 角色一致性必须走“数字演员资产 + 脸服分离”。
2. 运镜与转场必须走 FFmpeg 标准滤镜链。
3. 每次模型与参数变更必须通过同一回归样本集。
4. 任何人不得绕过质量门禁直接发布。
5. 绘图提示词必须“语义忠实原剧本 + 英文执行”，不得只追求英文流畅而牺牲剧情准确性。
