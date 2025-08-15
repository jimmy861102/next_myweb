// pages/index.tsx
import { useState } from "react";
import axios from "axios";

const Foodcount = () => {
  const [name, setName] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchFood = async () => {
    try {
      const res = await axios.get(
        `https://data.fda.gov.tw/opendata/exportDataList.do`,
        {
          params: {
            method: "openData",
            InfoId: 20,
            limit: 20,
            樣品名稱: name, // 使用變數 name
            分析項分類: "一般成分",
          },
        }
      );
      setData(res.data);
      setError("");
      console.log(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "發生錯誤");
      setData(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Axios 測試範例 (Arrow Function)</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="輸入食材名稱"
      />
      <button onClick={fetchFood}>查詢</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <div>
          <h3>{data[0].樣品名稱}</h3>
          <p>熱量：{data[0].calories} kcal</p>
          <p>蛋白質：{data[0].protein} g</p>
          <p>脂肪：{data[0].fat} g</p>
          <p>碳水化合物：{data[0].carbs} g</p>
        </div>
      )}
    </div>
  );
};

export default Foodcount;
