// pages/index.tsx
import { useState } from "react";
import axios from "axios";
import { log } from "node:console";

type RawItem = {
  整合編號: string;
  樣品名稱: string;
  分析項: string; // 熱量、蛋白質、脂肪、碳水化合物、水分、灰分…
  每100克含量: string; // 例如 "12.0"
  含量單位?: string; // "g" 或 "kcal"
  分析項分類?: string; // "一般成分"
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

// ---------- helpers (arrow) ----------
const parseNum = (s?: string) => {
  if (!s) return undefined;
  const n = parseFloat(s.trim());
  return Number.isFinite(n) ? n : undefined;
};

const toNutritionRow = (items: RawItem[]): NutritionRow => {
  const name = items[0]?.樣品名稱?.trim() || "未知樣品";
  const row: NutritionRow = { name };

  for (const it of items) {
    const key = it.分析項?.trim();
    const val = parseNum(it["每100克含量"]);
    if (!key || val === undefined) continue;

    if (key.includes("熱量")) row.calories = val; // kcal
    else if (key.includes("蛋白")) row.protein = val;
    else if (key.includes("脂肪")) row.fat = val;
    else if (key.includes("碳水") || key.includes("醣類")) row.carbs = val;
    else if (key.includes("水分")) row.water = val;
    else if (key.includes("灰分")) row.ash = val;
    else if (key.includes("纖維")) row.fiber = val;
    else if (key.includes("糖")) row.sugar = val;
  }

  return row;
};

// ---------- UI: 營養標示 (arrow) ----------
const NutritionFactsTW: React.FC<{
  title?: string;
  servingsText?: string;
  perServingText?: string;
  kcal: number; // 使用 totalKcal
  protein?: number;
  fat?: number;
  carbs?: number;
}> = ({
  title = "營養標示",
  servingsText = "本包裝含 1 份（合併計算）",
  perServingText = "每份",
  kcal,
  protein,
  fat,
  carbs,
}) => {
  const kJ = Math.round(kcal * 4.184);

  const Row = ({
    label,
    value,
    unit,
  }: {
    label: string;
    value?: number;
    unit: string;
  }) => (
    <div className="flex justify-between border-t border-black py-1 text-sm">
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">
        {value !== undefined ? value : "-"} {unit}
      </span>
    </div>
  );

  return (
    <div className="w-full max-w-sm border-4 border-black p-3 bg-white text-black print:w-[360px]">
      <div className="text-2xl font-extrabold tracking-wider border-b-8 border-black pb-1">
        {title}
      </div>

      <div className="mt-2 text-xs">{servingsText}</div>
      <div className="text-xs">{perServingText}</div>

      <div className="flex justify-between items-end border-t-4 border-black mt-2 pt-2">
        <div className="text-lg font-extrabold">熱量</div>
        <div className="text-right leading-tight">
          <div className="text-2xl font-extrabold tabular-nums">
            {kcal} kcal
          </div>
          <div className="text-[10px]">{kJ} kJ</div>
        </div>
      </div>

      <Row label="蛋白質" value={protein} unit="g" />
      <Row label="脂肪" value={fat} unit="g" />
      <Row label="碳水化合物" value={carbs} unit="g" />

      <div className="border-t border-black mt-2 pt-2 text-[10px] leading-snug text-gray-700">
        註：此標示為多食材依克數合併之「每份」估算值；正式上架請依法規補齊欄位與單位格式。
      </div>
    </div>
  );
};

// ---------- Page (arrow) ----------
const Foodcount: React.FC = () => {
  const [name, setName] = useState("");
  const [rows, setRows] = useState<NutritionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [servings, setServings] = useState<Record<string, number>>({});

  // 營養標示所需總計
  const [totals, setTotals] = useState<{
    kcal: number;
    protein?: number;
    fat?: number;
    carbs?: number;
  } | null>(null);

  // 查詢（保留）
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
            limit: 50, // 放大避免漏資料
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

      // 只保留第一筆樣品名稱的成分（API 會回近似名稱）
      const topName = raw[0].樣品名稱;
      const sameSample = raw.filter((x) => x.樣品名稱 === topName);
      const row = toNutritionRow(sameSample);

      setServings((prev) =>
        prev[row.name] ? prev : { ...prev, [row.name]: 100 }
      );

      // 已存在同名則覆蓋，否則加入
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
    setTotals(null);
    setServings({});
  };

  // 計算總營養 & 更新營養標示
  const countNutrition = () => {
    const result = rows.map((r) => {
      const grams = servings[r.name] ?? 100;

      const calc = (value?: number, digits = 1) =>
        typeof value === "number"
          ? +(value * (grams / 100)).toFixed(digits)
          : undefined;

      return {
        name: r.name,
        grams,
        kcalPerServing: calc(r.calories, 0), // 熱量整數
        proteinPerServing: calc(r.protein),
        carbsPerServing: calc(r.carbs),
        fatPerServing: calc(r.fat),
      };
    });

    let totalKcal = 0,
      totalProtein = 0,
      totalCarbs = 0,
      totalFat = 0;

    for (const item of result) {
      if (typeof item.kcalPerServing === "number")
        totalKcal += item.kcalPerServing;
      if (typeof item.proteinPerServing === "number")
        totalProtein += item.proteinPerServing;
      if (typeof item.carbsPerServing === "number")
        totalCarbs += item.carbsPerServing;
      if (typeof item.fatPerServing === "number")
        totalFat += item.fatPerServing;
    }

    setTotals({
      kcal: Math.round(totalKcal),
      protein: +totalProtein.toFixed(1) || undefined,
      carbs: +totalCarbs.toFixed(1) || undefined,
      fat: +totalFat.toFixed(1) || undefined,
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">營養成分查詢（每 100 g）</h1>

      {/* 查詢區（保留） */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="輸入食材名稱，如：低筋麵粉"
          className="border rounded px-3 py-2 flex-1"
        />
        <div className="flex gap-2">
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
          <button
            onClick={countNutrition}
            className="bg-gray-200 px-3 py-2 rounded"
          >
            計算總營養
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      {/* 結果表（保留） */}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border rounded overflow-hidden">
            <thead className="bg-gray-50">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>克數</th>
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
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-20 text-sm text-gray-700 border rounded px-1"
                      value={servings[r.name] ?? 100}
                      min={0}
                      onChange={(e) => {
                        const grams = Number(e.target.value);
                        setServings((prev) => ({
                          ...prev,
                          [r.name]: grams >= 0 ? grams : 0,
                        }));
                      }}
                    />
                  </td>
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

      {/* 營養標示（使用 totalKcal + 總營養） */}
      {totals && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">合併食材之「營養標示」</h2>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <NutritionFactsTW
              kcal={totals.kcal}
              protein={totals.protein}
              fat={totals.fat}
              carbs={totals.carbs}
            />
            <div className="text-sm text-gray-600">
              <p className="mb-2">
                這張標籤使用你選取食材與克數計出的
                <span className="font-semibold"> 總熱量（totalKcal）</span>{" "}
                與各營養素總和。
              </p>
              <button
                className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
                onClick={() => window.print()}
              >
                列印 / 存成 PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Foodcount;
