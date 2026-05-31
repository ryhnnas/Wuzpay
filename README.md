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

Untuk memudahkan konfigurasi, kami telah menyediakan template `.env.example` di setiap direktori penting. Silakan salin file `.env.example` tersebut menjadi `.env` dan sesuaikan nilainya:

#### A. Konfigurasi Backend (`backend/`)
Salin file `backend/.env.example` menjadi `backend/.env` dan isi variabel berikut:
```bash
# Di dalam folder backend/
cp .env.example .env
```
Isi konfigurasi pada `backend/.env`:
* `MONGO_URI`: String koneksi database MongoDB Atlas atau MongoDB lokal Anda.
* `PORT`: Port server backend Deno (default: `5000`).
* `GROQ_API_KEY`: API Key layanan Groq untuk fitur AI Chatbot & Agent.
* `GROQ_API_URL`: URL Endpoint Groq (default: `https://api.groq.com/openai/v1`).
* `GROQ_MODEL`: Model LLM yang digunakan (contoh: `llama-3.3-70b-versatile`).
* `OPENAI_API_KEY` & `OPENAI_API_URL`: Digunakan untuk model LLM Vision (Groq) saat memindai struk belanja secara otomatis.
* `JWT_SECRET`: Kunci rahasia untuk enkripsi token otentikasi kasir.

#### B. Konfigurasi Frontend (`frontend/`)
Salin file `frontend/.env.example` menjadi `frontend/.env`:
```bash
# Di dalam folder frontend/
cp .env.example .env
```
Isi konfigurasi pada `frontend/.env`:
* `VITE_API_URL`: Alamat URL dari API Backend WuzPay (default untuk lokal: `http://localhost:5000`).

#### C. Konfigurasi Deployment Staging/Docker (`/` - Folder Root)
Jika Anda men-deploy sistem menggunakan Docker Compose di server produksi/staging, salin file `.env.example` di folder root menjadi `.env`:
```bash
# Di folder root proyek
cp .env.example .env
```
Isi konfigurasi pada `.env` root:
* `OPENAI_API_KEY`: API Key Groq untuk container OCR Service agar dapat mengekstrak struk belanja secara otomatis.
* `OPENAI_API_URL`: Endpoint Groq (default: `https://api.groq.com/openai/v1`).


### 4. Menjalankan Aplikasi Utama (Satu Klik!)
Sistem sudah dirangkai menggunakan modul `concurrently` di folder *root*. Anda tidak perlu membuka banyak terminal.
```bash
# Install seluruh dependency Frontend dan Backend secara terpusat:
npm install

# Jalankan Frontend (Vite) + Backend (Node/Deno) + AI OCR Server (Python) serentak:
npm run dev
```

> **Catatan Server Python:** Perintah `npm run dev` otomatis akan mencoba menyematkan library AI jika mesin belum memilikinya lewat fitur *virtual environment*.

### 5. Inisialisasi & Auto-Seeding Database

WuzPay menggunakan **MongoDB (NoSQL)** sebagai media penyimpanan data. Untuk memudahkan pengisian data awal pengujian (seperti produk, bahan baku resep, pelanggan, diskon, dan 300+ data transaksi historis untuk analitik dashboard), kami menyediakan endpoint migrasi otomatis:

1. Pastikan server API backend sudah menyala (`npm run dev`).
2. Jalankan seeding database dengan mengakses endpoint berikut di browser atau via `curl`:
   ```bash
   curl http://localhost:5000/api/seed/full-setup
   ```
3. Jika Anda men-deploy menggunakan Docker Compose, jalankan seeding melalui URL port staging:
   ```bash
   curl http://localhost:1111/api/seed/full-setup
   ```

Setelah proses seeding selesai, database akan terisi dengan data transaksi historis lengkap untuk mensimulasikan operasional kasir secara nyata.

### 6. Akun Login Default Kasir & Owner (Kredensial Uji Coba)

Setelah melakukan seeding database, Anda dapat login menggunakan kredensial default berikut untuk masing-masing role:

| Role | Username / Email | Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@wuzpay.com` | `owner123` | Akses penuh: Dashboard Keuangan, Analitik Penjualan, Manajemen Produk/Bahan Baku, Pengaturan Akses & Kasir, AI Assistant. |
| **Kasir** | `kasir@wuzpay.com` | `kasir123` | Akses operasional kasir: Layar POS Utama, Tambah Pesanan/Antrean, Transaksi Kasir, Simulasi Pembayaran QRIS/Tunai, Manajemen Bahan Baku Produk. |

### 7. Tim Pengembang

Ali, Dani, Farhan, Raja, Reyhan, Zacky.

