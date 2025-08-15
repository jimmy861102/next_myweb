// pages/api/food.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name } = req.query;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "請提供 ?name=食材名稱" });
  }

  try {
    const resp = await axios.get(
      "https://data.fda.gov.tw/opendata/exportDataList.do",
      {
        params: {
          method: "openData",
          InfoId: 20,
          limit: 20,
          樣品名稱: name,
          分析項分類: "一般成分",
        },
        headers: { Accept: "application/json, text/plain, */*" },
        timeout: 15000,
        responseType: "text", // 兼容 CSV
      }
    );

    // 簡單 CSV 解析（正式建議用 papaparse）
    const raw = resp.data as string;
    const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
    const headers = headerLine.split(",");

    const rows = lines.map((line) => {
      const cols = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cols[i]));
      return obj;
    });

    // 嘗試正規化為 { name, calories, protein, fat, carbs }
    const pick = (o: any, keys: string[]) =>
      keys.map((k) => o?.[k]).find((v) => v !== undefined && v !== null);

    const normalized = rows.map((r) => ({
      name: pick(r, ["樣品名稱", "食品名稱", "品名"]) || "",
      calories: Number(pick(r, ["能量(kcal)", "熱量(kcal)", "熱量"])) || 0,
      protein: Number(pick(r, ["蛋白質(g)", "蛋白質"])) || 0,
      fat: Number(pick(r, ["脂肪(g)", "總脂肪(g)", "脂肪"])) || 0,
      carbs:
        Number(pick(r, ["碳水化合物(g)", "總碳水化合物(g)", "碳水化合物"])) ||
        0,
    }));

    res.status(200).json({ items: normalized });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "政府資料源查詢失敗" });
  }
};

export default handler;
