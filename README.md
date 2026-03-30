# 🚀 WuzPay POS
> **"Kemudahan Transaksi"**
> Modern Point of Sale System with Cloud MongoDB Integration.

![WuzPay Banner](https://img.shields.io/badge/WuzPay-POS_System-orange?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-green?style=for-the-badge&logo=mongodb)
![Status](https://img.shields.io/badge/Status-Development-yellow?style=for-the-badge)

---

## 🚀 Overview
**WuzPay** adalah sistem Point of Sale (POS) modern yang dirancang khusus untuk mengelola operasional outlet makanan. Sistem ini mengintegrasikan manajemen inventaris, transaksi multi-metode, hingga analitik penjualan berbasis cloud menggunakan MongoDB. Dibangun dengan fokus pada kecepatan input kasir dan akurasi laporan keuangan.

### ✨ Fitur Unggulan
- **🔥 Real-time POS Screen**: Sistem kasir responsif dengan pencarian menu kilat dan filter kategori.
- **📦 Smart Inventory**: Pantau stok barang otomatis, lengkap dengan harga modal (*cost price*) dan margin keuntungan.
- **💳 Multi-Payment Simulation**: Mendukung simulasi pembayaran QRIS (Midtrans/GoPay), Cash, dan Bank Transfer.
- **📋 Order Management**: Fitur "Simpan Antrean" untuk manajemen meja yang fleksibel (Pending Orders).
- **📊 Professional Reporting**: Laporan penjualan per barang, per kategori, hingga laporan laba rugi real-time.
- **🤖 AI Insights**: Analisis data penjualan menggunakan kecerdasan buatan untuk rekomendasi strategi bisnis.

---

## 🛠 Tech Stack
Arsitektur sistem menggunakan teknologi *cutting-edge* untuk memastikan skalabilitas:

* **Frontend**: React.js + TypeScript
* **Backend**: Deno / Node.js
* **Database**: MongoDB Atlas (NoSQL Cloud)
* **UI Components**: Tailwind CSS + Shadcn UI
* **Icons**: Lucide React
* **State Management**: React Hooks (useState, useEffect, useMemo, useRef)

---

## ⚙️ Installation & Setup

Ikuti langkah-langkah di bawah untuk menjalankan projek di lingkungan lokal:

### 1. Clone Repository
```bash
git clone [https://github.com/username/wuzpay-pos.git](https://github.com/username/wuzpay-pos.git)
cd wuzpay-pos
```

### 2. Konfigurasi Environment
Buat file .env di folder root dan backend, lalu masukkan:
```bash
MONGODB_URI=your_mongodb_connection_string
PORT=8000
JWT_SECRET=seblak_mledak_rahasia_2026
```

### 3. Install Dependencies
#### Frontend directory
```bash
npm install
```

#### Backend directory
```bash
npm install
```

### 4. Jalankan Aplikasi
#### Jalankan Frontend (Vite)
```
npm run dev
```

#### Jalankan Backend (Deno/Node)
```
npm run dev
```

### 5. Tim Pengembang
Ali, Dani, Farhan, Raja, Reyhan, Zacky
