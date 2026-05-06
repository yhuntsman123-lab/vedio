# 产品级提示词系统（专家版）

## 1. 设计目标
- 用户侧：不要求会写提示词。
- 系统侧：全部由模板引擎自动产出高质量提示词。
- 项目侧：一剧一风格，模板版本可追溯，可A/B迭代。

## 2. 已内置模板
1. `three_view_expert_v1`：角色三视图与设定板
2. `storyboard_expert_v1`：15秒四段分镜
3. `scene_extract_expert_v1`：无人纯场景提取

## 3. 调用方式（后端）
- 入口：`src/prompts/builder.ts`
- API：`buildPrompt(templateId, context)`
- 必填校验：模板 `requiredVars` 自动检查

## 4. 一剧一风格原则
- 项目创建时绑定 `styleProfileId`
- 后续提示词全部继承该风格，禁止混入其他风格关键词

## 5. 推荐接入工作流
1. 小说导入
2. 分幕JSON
3. 分镜模板生成
4. 三视图模板生成
5. 场景模板生成
6. 渲染执行

## 6. 下一步建议
- 给每个模板加入 A/B 子版本并落评分表
- 把 `buildPrompt` 暴露到 Worker API，供前端一键生成
