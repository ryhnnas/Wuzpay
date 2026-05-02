# 🚀 WuzPay POS
> **"Kemudahan Transaksi. Kebal Pemadaman."**
> Modern Point of Sale System with Offline-First Capability & AI OCR Integration.

![WuzPay Banner](https://img.shields.io/badge/WuzPay-POS_System-orange?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-green?style=for-the-badge&logo=mongodb)
![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue?style=for-the-badge&logo=docker)

---

## 🚀 Overview
**WuzPay** adalah sistem Point of Sale (POS) modern yang dirancang khusus untuk mengelola operasional outlet makanan dan retail. Berkat pengembangan mutakhir, aplikasi ini tidak hanya berfungsi sebagai pencatatan kasir, tetapi juga dilengkapi integrasi kecerdasan buatan, proteksi data tinggi, dan arsitektur anti-pemadaman internet.

### ✨ Fitur Unggulan 
- **⚡ Offline-First PWA**: Kasir yang sudah login tetap bisa beroperasi memproses transaksi dengan kecepatan tinggi meski WiFi terputus, termasuk setelah refresh aplikasi. Data disimpan aman di IndexedDB (*Dexie.js*) dan melakukan *background auto-sync* otomatis ketika koneksi pulih. Login baru tetap membutuhkan koneksi internet.
- **📄 AI Receipt Scanner (Microservice)**: Dilengkapi dengan model pintar **PaddleOCR** via *FastAPI Python* untuk merekap struk bahan baku belanjaan secara otomatis hanya dari unggahan foto (langsung dikalkulasikan ke HPP menu).
- **🛡️ Bulletproof Security (Zod & Middleware)**: Menolak mentah-mentah injeksi payload jahat melalui validasi lapis baja menggunakan tipe data Zod dan *Global Rate Limiter*.
- **🕵️ Audit Logging Engine**: Seluruh pergerakan aktivitas sensitif kasir (Pembuatan Transaksi, Pembatalan) tercatat rapi secara persisten ke dalam `wuzpay-audit.log`.
- **🔥 Real-time POS Screen**: Sistem kasir responsif dengan logika pencarian super kilat.
- **📦 Smart Inventory**: Konfigurasi resep dan pemotongan bahan baku otomatis (*ingredient formula*).
- **💳 Multi-Payment Simulation**: Mendukung simulasi pembayaran QRIS dinamis (*auto-rendered*), Uang Tunai, dan Saldo Pihak Ketiga.

---

## 🛠 Tech Stack
WuzPay mengadopsi pendekatan dua-pilar *(Backend ganda)* untuk pemisahan tugas berat:

* **Frontend Aplikasi**: React 18, Vite, Tailwind CSS + Shadcn UI, Dexie.js (Offline DB).
* **Core API Backend**: Hono di atas runtime Deno / Node.js (untuk koneksi ke MongoDB Atlas).
* **AI/OCR Microservice**: Python, FastAPI, Uvicorn, PaddleOCR (Computer Vision).
* **Keamanan**: Zod Validator, Helmet Headers, Rate Limiting In-Memory Map.

---

## ⚙️ Installation & Setup

Proyek ini telah dibagi menjadi tiga kerangka utama yang bisa dijalankan berbarengan menggunakan sistem skrip gabungan yang ada di *root* `package.json`:

### 1. Prasyarat & Perangkat
Pastikan Anda sudah memasang alat-alat berikut di terminal:
* **Node.js** (Versi 18+ disarankan)
* **Python** (Versi 3.8+ untuk menjalankan *virtual environment* OCR)
* **Deno** (Opsional jika ingin performa natif, tapi sudah bisa jalan *node compatible*)

```bash
# Contoh Instalasi Deno (Linux/Mac)
curl -fsSL https://deno.land/install.sh | sh
```

### 2. Kloning Repositori
```bash
git clone https://github.com/ryhnnas/Wuzpay.git
cd Wuzpay
```

### 3. Konfigurasi Environment (`.env`)
Buat file env di dalam direktori `backend/`:
```bash
MONGODB_URI=your_mongodb_connection_string
PORT=8000
JWT_SECRET=seblak_mledak_rahasia_2026
```

### 4. Menjalankan Aplikasi Utama (Satu Klik!)
Sistem sudah dirangkai menggunakan modul `concurrently` di folder *root*. Anda tidak perlu membuka banyak terminal.
```bash
# Install seluruh dependency Frontend dan Backend secara terpusat:
npm install

# Jalankan Frontend (Vite) + Backend (Node/Deno) + AI OCR Server (Python) serentak:
npm run dev
```

> **Catatan Server Python:** Perintah `npm run dev` otomatis akan mencoba menyematkan library AI jika mesin belum memilikinya lewat fitur *virtual environment*.

### 5. Tim Pengembang
Ali, Dani, Farhan, Raja, Reyhan, Zacky.
