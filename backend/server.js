require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 3001;

const app = express();

// 允許所有來源跨域 (可依需求修改為指定來源)
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// 1. 連線 MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB 連線成功'))
  .catch(err => console.error('MongoDB 連線失敗：', err));

// 2. 定義報告 Schema 與 Model
const reportSchema = new mongoose.Schema({
  type: String,
  city: String,
  quantity: Number,
  name: String,
  phone: String,
  time: { type: Date, default: Date.now }
});
const Report = mongoose.model('Report', reportSchema);

// 3. 定義機構 Schema 與 Model，包含地理座標欄位(location)
const orgSchema = new mongoose.Schema({
  name: String,
  type: String,
  city: String,
  phone: String,
  address: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [經度, 緯度]
  }
});

// 啟用地理空間索引
orgSchema.index({ location: '2dsphere' });

const Organization = mongoose.model('Organization', orgSchema);

// 4. 農廢回報：POST /api/report
app.post('/api/report', async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    console.log('收到農廢回報:', report);
    res.json({ message: '回報完成，感謝您!' });
  } catch (e) {
    res.status(500).json({ message: '資料庫寫入失敗' });
  }
});

// 5. 查詢所有農廢回報：GET /api/reports
app.get('/api/reports', async (req, res) => {
  const reports = await Report.find();
  res.json(reports);
});

// 新增：取得所有農業廢棄物類型列表（去重）/api/types
app.get('/api/types', async (req, res) => {
  try {
    const types = await Organization.distinct('type');
    res.json(types);
  } catch (err) {
    console.error('取得類型失敗:', err);
    res.status(500).json({ message: '取得農業廢棄物類型失敗' });
  }
});

// 新增：取得所有城市列表（去重）/api/cities
app.get('/api/cities', async (req, res) => {
  try {
    const cities = await Organization.distinct('city');
    res.json(cities);
  } catch (err) {
    console.error('取得城市失敗:', err);
    res.status(500).json({ message: '取得城市列表失敗' });
  }
});

// 6. 查詢機構（支援類型及城市篩選），GET /api/orgs
app.get('/api/orgs', async (req, res) => {
  const { type, city } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (city) filter.city = city;
  try {
    const orgs = await Organization.find(filter);
    res.json(orgs);
  } catch (err) {
    console.error('查詢業者失敗:', err);
    res.status(500).json({ message: '查詢業者失敗' });
  }
});

// 7. 新增含經緯度的機構資料：POST /api/org
app.post('/api/org', async (req, res) => {
  try {
    const { name, type, city, phone, address, lat, lng } = req.body;
    const organization = new Organization({
      name,
      type,
      city,
      phone,
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      }
    });
    await organization.save();
    res.json({ message: "業者新增成功", organization });
  } catch (err) {
    console.error("新增失敗:", err);
    res.status(500).json({ message: "業者建立失敗" });
  }
});

// 8. 智慧媒合根據 GPS 與類型查找最近機構：GET /api/match?lat=&lng=&type=
app.get('/api/match', async (req, res) => {
  const { lat, lng, type } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ message: "缺少經緯度參數" });
  }
  const geoQuery = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        $maxDistance: 30000 // 30公里內
      }
    }
  };
  if (type) geoQuery.type = type;
  try {
    const match = await Organization.findOne(geoQuery);
    res.json(match || { message: "無附近媒合業者" });
  } catch (err) {
    console.error("媒合錯誤:", err);
    res.status(500).json({ message: "媒合失敗" });
  }
});

// 9. 批次匯入示範業者資料(含經緯度)：GET /api/seed-orgs
app.get('/api/seed-orgs', async (req, res) => {
  try {
    await Organization.create([
      {
        name: "中興資源中心",
        type: "稻草",
        city: "南投市",
        phone: "049-2563472",
        address: "南投市中正路1號",
        location: { type: "Point", coordinates: [120.6845, 23.8385] }
      },
      {
        name: "示範再生工坊",
        type: "菇包",
        city: "南投市",
        phone: "049-1111222",
        address: "南投市測試路22號",
        location: { type: "Point", coordinates: [120.6623, 23.8299] }
      }
    ]);
    res.json({ message: "已匯入初始業者資料" });
  } catch (err) {
    console.error('匯入示範資料失敗:', err);
    res.status(500).json({ message: '匯入示範資料失敗' });
  }
});

// 10. 啟動伺服器
app.listen(PORT, () => console.log(`伺服器啟動於埠口 ${PORT}`));
