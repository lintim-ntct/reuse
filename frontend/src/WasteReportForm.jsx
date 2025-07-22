import React, { useState } from "react";

// API 主機，可由 .env 設定為雲端或本機，例如：http://192.168.137.1:3001
const API_HOST = process.env.REACT_APP_API_HOST || "https://localhost:3001";

export default function WasteReportForm() {
  const [form, setForm] = useState({
    type: "",
    city: "",
    quantity: "",
    name: "",
    phone: ""
  });
  const [resp, setResp] = useState("");
  const [nearestOrg, setNearestOrg] = useState(null);
  const [gpsError, setGpsError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const fetchNearestOrg = async (lat, lng, type) => {
    try {
      const res = await fetch(
        `${API_HOST}/api/match?lat=${lat}&lng=${lng}&type=${type}`
      );
      const data = await res.json();
      if (data && data.location && data.name) {
        setNearestOrg(data);
      } else {
        setResp("附近暫無媒合業者");
        setNearestOrg(null);
      }
    } catch (err) {
      setResp("媒合失敗，請確認後端是否啟動");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 送出農廢回報資料
      const res = await fetch(`${API_HOST}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        const data = await res.json();
        setResp(data.message);

        // 拿到 GPS 並查詢最近業者
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              fetchNearestOrg(lat, lng, form.type);
              setGpsError(""); // 清除錯誤
            },
            (error) => {
              setGpsError("⚠️ 無法取得定位：" + error.message);
              setNearestOrg(null);
            }
          );
        } else {
          setGpsError("⚠️ 裝置不支援 GPS 功能");
        }
      } else {
        setResp("送出失敗，請確認網路或資料庫設定！");
      }
    } catch (err) {
      setResp("連線失敗，請檢查 API 主機或網路狀態！");
    }
  };

  const handleNavigate = () => {
    if (nearestOrg?.location?.coordinates) {
      const [lng, lat] = nearestOrg.location.coordinates;
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        "_blank"
      );
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h3>農業廢棄物回報表單</h3>

        <select
          name="type"
          onChange={handleChange}
          required
          value={form.type}
        >
          <option value="">選擇農業廢棄物類型</option>
          <option value="稻草">稻草</option>
          <option value="菇包">菇包</option>
          <option value="茶渣">茶渣</option>
        </select>

        <input
          name="city"
          placeholder="地區/城市"
          onChange={handleChange}
          required
          value={form.city}
        />
        <input
          name="quantity"
          type="number"
          placeholder="數量/公斤"
          onChange={handleChange}
          required
          value={form.quantity}
        />
        <input
          name="name"
          placeholder="聯絡人"
          onChange={handleChange}
          required
          value={form.name}
        />
        <input
          name="phone"
          placeholder="電話"
          onChange={handleChange}
          required
          value={form.phone}
        />

        <button type="submit">送出回報</button>
      </form>

      {resp && <div style={{ color: "green", marginTop: 8 }}>{resp}</div>}
      {gpsError && <div style={{ color: "red", marginTop: 8 }}>{gpsError}</div>}

      {nearestOrg && (
        <div style={{ marginTop: 16, padding: 10, border: "1px solid #ccc" }}>
          <h4>最近再利用業者</h4>
          <b>{nearestOrg.name}</b>（{nearestOrg.type}）<br />
          地址：{nearestOrg.address}<br />
          電話：<a href={`tel:${nearestOrg.phone}`}>{nearestOrg.phone}</a><br />
          <button onClick={handleNavigate}>📍 前往 Google 導航</button>
        </div>
      )}
    </div>
  );
}
