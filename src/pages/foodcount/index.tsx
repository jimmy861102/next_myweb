// pages/index.tsx
import { useState } from "react";
import axios from "axios";

type RawItem = {
  整合編號: string;
  樣品名稱: string;
  分析項: string; // 例如：熱量、蛋白質、脂肪、碳水化合物、水分、灰分…
  每100克含量: string; // 例如：" 12.0"
  含量單位?: string; // 例如："g" 或 "kcal"
  分析項分類?: string; // 例如："一般成分"
};

type NutritionRow = {
  name: string;
  calories?: number; // kcal
  protein?: number; // g
  fat?: number; // g
  carbs?: number; // g
  water?: number; // g
  ash?: number; // g
  fiber?: number; // g
  sugar?: number; // g
};

function parseNum(s?: string) {
  if (!s) return undefined;
  const n = parseFloat(s.trim());
  return Number.isFinite(n) ? n : undefined;
}

/**
 * 將政府資料（同一個樣品名稱的一串 RawItem）整理成 1 筆 NutritionRow
 */
function toNutritionRow(items: RawItem[]): NutritionRow {
  const name = items[0]?.樣品名稱?.trim() || "未知樣品";
  const row: NutritionRow = { name };

  for (const it of items) {
    const key = it.分析項?.trim();
    const val = parseNum(it["每100克含量"]);
    if (!key || val === undefined) continue;

    // 做一點「模糊比對」兼容不同寫法
    if (key.includes("熱量")) row.calories = val; // kcal
    else if (key.includes("蛋白")) row.protein = val; // g
    else if (key.includes("脂肪")) row.fat = val; // g
    else if (key.includes("碳水") || key.includes("醣類")) row.carbs = val; // g
    else if (key.includes("水分")) row.water = val; // g
    else if (key.includes("灰分")) row.ash = val; // g
    else if (key.includes("纖維")) row.fiber = val; // g
    else if (key.includes("糖")) row.sugar = val; // g
  }

  return row;
}

export default function Foodcount() {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<NutritionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFood = async () => {
    if (!name.trim()) {
      setError("請先輸入食材名稱");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await axios.get<RawItem[]>(
        "https://data.fda.gov.tw/opendata/exportDataList.do",
        {
          params: {
            method: "openData",
            InfoId: 20,
            limit: 50, // 稍微放大一點，避免只取到前 20 筆遺漏
            樣品名稱: name.trim(),
            分析項分類: "一般成分",
          },
        }
      );

      const raw = res.data || [];
      if (raw.length === 0) {
        setError(`找不到「${name}」的資料`);
        return;
      }

      // 只保留同一個樣品名稱的資料（API 可能回多個近似名稱）
      const topName = raw[0].樣品名稱;
      const sameSample = raw.filter((x) => x.樣品名稱 === topName);

      const row = toNutritionRow(sameSample);

      // 累積顯示：若已存在同名樣品就覆蓋，不同樣品就新增
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.name === row.name);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = row;
          return copy;
        }
        return [...prev, row];
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || "發生錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setRows([]);
    setError("");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">營養成分查詢（每 100 g）</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="輸入食材名稱，如：低筋麵粉"
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          onClick={fetchFood}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "查詢中…" : "查詢"}
        </button>
        <button onClick={clearAll} className="bg-gray-200 px-3 py-2 rounded">
          清空
        </button>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded overflow-hidden">
            <thead className="bg-gray-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>樣品名稱</th>
                <th>熱量 (kcal)</th>
                <th>蛋白質 (g)</th>
                <th>脂肪 (g)</th>
                <th>碳水 (g)</th>
                <th>水分 (g)</th>
                <th>灰分 (g)</th>
                <th>膳食纖維 (g)</th>
                <th>糖 (g)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.name}
                  className="odd:bg-white even:bg-gray-50 border-t"
                >
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.calories ?? "-"}</td>
                  <td className="px-3 py-2">{r.protein ?? "-"}</td>
                  <td className="px-3 py-2">{r.fat ?? "-"}</td>
                  <td className="px-3 py-2">{r.carbs ?? "-"}</td>
                  <td className="px-3 py-2">{r.water ?? "-"}</td>
                  <td className="px-3 py-2">{r.ash ?? "-"}</td>
                  <td className="px-3 py-2">{r.fiber ?? "-"}</td>
                  <td className="px-3 py-2">{r.sugar ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-sm text-gray-500 mt-2">
            註：數值為每 100
            g；來源：衛福部食藥署開放資料（一般成分）。不同資料集欄位可能稍有差異。
          </p>
        </div>
      )}
    </div>
  );
}
