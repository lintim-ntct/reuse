import React, { useState } from "react";
export default function OrgQuery() {
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState([]);
  const handleQuery = async () => {
    const url = `http://localhost:3000/api/orgs?type=${type}&city=${city}`;
    const res = await fetch(url);
    setResults(await res.json());
  };
  return (
    <div>
      <input placeholder="農廢類型" value={type} onChange={e => setType(e.target.value)} />
      <input placeholder="地區/城市" value={city} onChange={e => setCity(e.target.value)} />
      <button onClick={handleQuery}>查詢機構</button>
      <ul>
        {results.map(org => (
          <li key={org.id}>
            <b>{org.name}</b> 電話:{org.phone} 地址:{org.address}
          </li>
        ))}
      </ul>
    </div>
  );
}
