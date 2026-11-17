# ปิยปัญญา · ฝึกโจทย์ประถม

แอปฝึกโจทย์ฟรีสำหรับนักเรียน ป.1–ป.6 ของโรงเรียนกวดวิชาปิยปัญญา เชียงคำ พะเยา

หน้าเว็บเป็นไฟล์คงที่ โฮสต์บน GitHub Pages และอ่านบทเรียนกับข้อฝึกจาก Supabase ทุกครั้งที่เปิด จึงเห็นแถวใหม่ในคลังได้โดยไม่ต้องติดตั้งแอปใหม่

ที่อยู่เว็บ: https://kruom9.github.io/kruom-piyapanya-app/

## ใช้ในเครื่อง

```bash
npm test
npm start
```

แล้วเปิด http://127.0.0.1:4173

## ข้อมูล

ใช้เฉพาะ publishable key ใน `js/config.js` ห้ามใส่ secret key หรือ service role

คะแนนอยู่บนเครื่องของผู้เรียนผ่าน `localStorage` ยังไม่มีระบบเข้าสู่ระบบ จุดต่อ LINE Login อยู่ที่ `js/auth.js`

ติดต่อ: Kruom9@gmail.com · Tachit@me.com · [ส่งข้อความถึงเพจ](https://www.facebook.com/profile.php?id=61596231578488)
