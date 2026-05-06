import type { PromptTemplate } from "../types";

export const STORYBOARD_EXPERT_TEMPLATE: PromptTemplate = {
  id: "storyboard_expert_v1",
  name: "漫剧分镜（15秒四段）",
  purpose: "storyboard",
  requiredVars: ["shotText"],
  body: `请将以下剧本文案生成连续分镜，每个段落对应一个分镜。

时间固定为：0s–4s、4s–8s、8s–12s、12s–15s。

必须严格按以下格式输出，不要解释，不要分析，不要额外内容：
分镜：1
人物：XXXX
场景：XXXX
0s–4s：镜头类型：XXXX，人物可视化动作：XXXX，运镜方式：XXXX，环境音与动作音：XXXX，台词：XXXX
4s–8s：镜头类型：XXXX，人物可视化动作：XXXX，运镜方式：XXXX，环境音与动作音：XXXX，台词：XXXX
8s–12s：镜头类型：XXXX，人物可视化动作：XXXX，运镜方式：XXXX，环境音与动作音：XXXX，台词：XXXX
12s–15s：镜头类型：XXXX，人物可视化动作：XXXX，运镜方式：XXXX，环境音与动作音：XXXX，台词：XXXX

规则：
1. 只依据原文，不胡编。
2. 强调画面感、镜头感、动作感、表情变化、情绪递进。
3. 人物可视化动作必须可直接看见，禁止空泛描述。
4. 环境音与动作音只写音效，不写音乐。
5. 旁白负责叙述推进，台词是人物说出口的话，没有就写“无”。
6. 可使用【闪回】与【闪出】标记回忆段。

输入文案：
{{shotText}}`
};
