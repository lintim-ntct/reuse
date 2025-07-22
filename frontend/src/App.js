import React from "react";
import WasteReportForm from "./WasteReportForm";
import OrgQuery from "./OrgQuery";

function App() {
  return (
    <div>
      <h1>農廢再生媒合平台</h1>
      <h2>農廢回報</h2>
      <WasteReportForm />
      <h2>再利用機構查詢</h2>
      <OrgQuery />
    </div>
  );
}
export default App;



