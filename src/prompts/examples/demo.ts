import { buildPrompt, listTemplates } from "../builder";

const threeViewPrompt = buildPrompt("three_view_expert_v1", {
  styleProfileId: "cn_cyber_dark",
  projectTitle: "霓虹潜入",
  characterName: "程平安",
  characterDescription:
    "26岁女性，黑色长发低马尾，深棕瞳，鹅蛋脸，眉峰清晰，鼻梁挺直，薄唇；上身黑色机能风短夹克，下身深灰工装裤，黑色短靴，身高168cm，体型匀称"
});

const storyboardPrompt = buildPrompt("storyboard_expert_v1", {
  styleProfileId: "cn_cyber_dark",
  projectTitle: "霓虹潜入",
  shotText: "我贴着塔壁前进，警报灯忽明忽暗，脚步声在空廊里被放大。"
});

console.log("TEMPLATES:", listTemplates().map((t) => t.id));
console.log("\n--- THREE VIEW PROMPT ---\n", threeViewPrompt);
console.log("\n--- STORYBOARD PROMPT ---\n", storyboardPrompt);
