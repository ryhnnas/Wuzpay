export const TOOL_DECLARATIONS = [
  {
    functionDeclarations: [
      {
        name: "get_sales_summary",
        description:
          "Ambil ringkasan penjualan (omzet, jumlah transaksi, profit) untuk periode tertentu. Gunakan untuk pertanyaan tentang penjualan, omzet, revenue, pendapatan, penghasilan. Bisa pakai period preset ATAU custom date range. Contoh: 'Berapa omzet hari ini?', 'Revenue minggu ini berapa?', 'Total penjualan bulan April?'",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["today", "week", "month", "custom"],
              description:
                "Periode data: today (hari ini), week (7 hari terakhir), month (30 hari terakhir), custom (gunakan start_date & end_date)",
            },
            start_date: {
              type: "STRING",
              description:
                "Tanggal awal format YYYY-MM-DD (wajib jika period=custom). Contoh: 2026-04-01",
            },
            end_date: {
              type: "STRING",
              description:
                "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom). Contoh: 2026-04-30",
            },
          },
          required: ["period"],
        },
      },
      {
        name: "get_daily_breakdown",
        description:
          "Ambil rincian penjualan per hari (revenue dan jumlah transaksi). Gunakan jika user ingin melihat tren harian, perbandingan antar hari, atau grafik penjualan. Contoh: 'Tunjukkan penjualan 7 hari terakhir', 'Gimana tren harian minggu ini?'",
        parameters: {
          type: "OBJECT",
          properties: {
            days: {
              type: "INTEGER",
              description:
                "Jumlah hari ke belakang yang ingin ditampilkan (default 7)",
            },
          },
          required: ["days"],
        },
      },
      {
        name: "get_top_products",
        description:
          "Ambil daftar produk berdasarkan revenue atau quantity terjual. Bisa untuk produk TERLARIS (desc) maupun PALING SEDIKIT terjual (asc). Gunakan untuk pertanyaan tentang produk laris, best seller, paling laku, paling sedikit terjual, kurang diminati. Contoh: 'Produk apa yang paling laris bulan ini?', 'Menu yang paling jarang dibeli?'",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description:
                "Periode data: week (7 hari), month (30 hari), custom (gunakan start_date & end_date)",
            },
            start_date: {
              type: "STRING",
              description:
                "Tanggal awal format YYYY-MM-DD (wajib jika period=custom)",
            },
            end_date: {
              type: "STRING",
              description:
                "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom)",
            },
            limit: {
              type: "INTEGER",
              description:
                "Jumlah produk yang ditampilkan (default 10, max 20)",
            },
            sort_by: {
              type: "STRING",
              enum: ["revenue", "quantity"],
              description: "Urutkan berdasarkan revenue atau jumlah terjual",
            },
            sort_order: {
              type: "STRING",
              enum: ["desc", "asc"],
              description:
                "Urutan: desc (terbanyak/terlaris, default), asc (paling sedikit/kurang laku)",
            },
          },
          required: ["period"],
        },
      },
      {
        name: "get_low_stock_ingredients",
        description:
          "Ambil daftar bahan baku (ingredient) yang stoknya rendah atau hampir habis. Gunakan untuk pertanyaan tentang stok, bahan baku kritis, perlu restock, atau ketersediaan bahan. Contoh: 'Bahan apa yang hampir habis?', 'Ada ingredient yang perlu restock?'",
        parameters: {
          type: "OBJECT",
          properties: {
            threshold: {
              type: "INTEGER",
              description: "Batas stok dianggap rendah (default 10)",
            },
          },
        },
      },
      {
        name: "get_product_list",
        description:
          "Ambil daftar produk (menu/item yang dijual) beserta harga, kategori, dan resep bahan baku. Gunakan untuk pertanyaan tentang daftar produk, harga menu, produk apa saja, atau cari produk tertentu. Contoh: 'Tampilkan semua menu', 'Harga Matcha Latte berapa?'",
        parameters: {
          type: "OBJECT",
          properties: {
            category: {
              type: "STRING",
              description:
                "Filter berdasarkan nama kategori (opsional). Kosongkan untuk semua produk.",
            },
            search: {
              type: "STRING",
              description: "Kata kunci pencarian nama produk (opsional)",
            },
          },
        },
      },
      {
        name: "get_ingredient_list",
        description:
          "Ambil daftar semua bahan baku (ingredients) beserta stok, unit, dan harga modal per unit. Gunakan untuk pertanyaan tentang inventaris bahan, modal bahan baku, daftar ingredient. Contoh: 'List semua bahan baku', 'Berapa stok susu sekarang?'",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_category_list",
        description:
          "Ambil daftar semua kategori produk. Gunakan jika user bertanya tentang kategori, jenis produk, atau klasifikasi menu. Contoh: 'Ada kategori apa aja?', 'Jenis menu apa yang tersedia?'",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "get_transaction_detail",
        description:
          "Ambil detail satu transaksi berdasarkan nomor receipt/struk. Gunakan ketika user bertanya tentang transaksi spesifik, nota tertentu.",
        parameters: {
          type: "OBJECT",
          properties: {
            receipt_number: {
              type: "STRING",
              description: "Nomor receipt/struk transaksi",
            },
          },
          required: ["receipt_number"],
        },
      },
      {
        name: "get_profit_report",
        description:
          "Ambil laporan profit/keuntungan bersih. Gunakan untuk pertanyaan tentang profit, laba, keuntungan, margin.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description:
                "Periode: week (7 hari), month (30 hari), custom (gunakan start_date & end_date)",
            },
            start_date: {
              type: "STRING",
              description:
                "Tanggal awal format YYYY-MM-DD (wajib jika period=custom)",
            },
            end_date: {
              type: "STRING",
              description:
                "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom)",
            },
          },
          required: ["period"],
        },
      },
      {
        name: "get_payment_method_stats",
        description:
          "Ambil statistik metode pembayaran (cash, QRIS, gopay, transfer). Gunakan untuk pertanyaan tentang pembayaran, QRIS, cash, transfer, metode bayar.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description:
                "Periode: week (7 hari), month (30 hari), custom (gunakan start_date & end_date)",
            },
            start_date: {
              type: "STRING",
              description:
                "Tanggal awal format YYYY-MM-DD (wajib jika period=custom)",
            },
            end_date: {
              type: "STRING",
              description:
                "Tanggal akhir format YYYY-MM-DD (wajib jika period=custom)",
            },
          },
          required: ["period"],
        },
      },
      {
        name: "compare_periods",
        description:
          "Bandingkan metrik bisnis antara dua periode dan hitung perubahan absolut + persentase. Gunakan untuk pertanyaan seperti 'bulan ini vs bulan lalu' atau 'minggu ini dibanding minggu lalu'.",
        parameters: {
          type: "OBJECT",
          properties: {
            metric: {
              type: "STRING",
              enum: ["revenue", "profit", "transactions", "avg_transaction"],
              description: "Metrik utama yang akan dibandingkan",
            },
            current_period: {
              type: "STRING",
              enum: ["today", "week", "month", "custom"],
              description: "Periode utama yang dianalisis",
            },
            current_start_date: {
              type: "STRING",
              description:
                "Tanggal awal current_period jika custom (YYYY-MM-DD)",
            },
            current_end_date: {
              type: "STRING",
              description:
                "Tanggal akhir current_period jika custom (YYYY-MM-DD)",
            },
            compare_with: {
              type: "STRING",
              enum: [
                "previous_period",
                "same_period_last_week",
                "same_period_last_month",
                "custom",
              ],
              description: "Cara memilih periode pembanding",
            },
            compare_start_date: {
              type: "STRING",
              description:
                "Tanggal awal periode pembanding jika compare_with=custom (YYYY-MM-DD)",
            },
            compare_end_date: {
              type: "STRING",
              description:
                "Tanggal akhir periode pembanding jika compare_with=custom (YYYY-MM-DD)",
            },
          },
          required: ["metric", "current_period", "compare_with"],
        },
      },
      {
        name: "search_transactions",
        description:
          "Cari daftar transaksi dengan filter fleksibel: tanggal, metode pembayaran, customer, item produk, dan rentang nominal. Gunakan ketika user tidak punya nomor struk spesifik.",
        parameters: {
          type: "OBJECT",
          properties: {
            start_date: {
              type: "STRING",
              description: "Tanggal awal pencarian (YYYY-MM-DD)",
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir pencarian (YYYY-MM-DD)",
            },
            payment_method: {
              type: "STRING",
              enum: ["cash", "qris", "gopay", "transfer"],
              description: "Filter metode pembayaran (opsional)",
            },
            customer_name: {
              type: "STRING",
              description: "Filter nama customer (opsional, partial match)",
            },
            product_name: {
              type: "STRING",
              description:
                "Filter transaksi yang memuat nama produk tertentu (opsional)",
            },
            min_amount: {
              type: "NUMBER",
              description: "Nominal transaksi minimum (opsional)",
            },
            max_amount: {
              type: "NUMBER",
              description: "Nominal transaksi maksimum (opsional)",
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah maksimal hasil (default 20, max 50)",
            },
          },
        },
      },
      {
        name: "get_customer_stats",
        description:
          "Ambil statistik pelanggan: total pelanggan unik, pelanggan paling sering transaksi, dan pelanggan dengan spending tertinggi. Contoh: 'Siapa pelanggan paling loyal?', 'Customer spending tertinggi bulan ini?'",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode data pelanggan",
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)",
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)",
            },
            limit: {
              type: "INTEGER",
              description:
                "Jumlah top customer yang ditampilkan (default 10, max 20)",
            },
            sort_by: {
              type: "STRING",
              enum: ["spending", "frequency"],
              description:
                "Urutkan berdasarkan total spending atau frekuensi transaksi (default: spending)",
            },
          },
          required: ["period"],
        },
      },
      {
        name: "get_discount_analysis",
        description:
          "Analisis diskon penjualan: total diskon, rasio diskon terhadap omzet, dan transaksi dengan diskon terbesar.",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode analisis diskon",
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)",
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)",
            },
            limit: {
              type: "INTEGER",
              description:
                "Jumlah transaksi diskon terbesar yang ditampilkan (default 10, max 20)",
            },
          },
          required: ["period"],
        },
      },
      {
        name: "get_hourly_sales",
        description:
          "Ambil pola penjualan per jam (jam sibuk/ramai). Gunakan untuk pertanyaan tentang jam ramai, jam sibuk, peak hours, kapan paling rame. Contoh: 'Jam berapa paling rame?', 'Kapan peak hour toko?'",
        parameters: {
          type: "OBJECT",
          properties: {
            days: {
              type: "INTEGER",
              description: "Jumlah hari data yang dianalisis (default 30)",
            },
          },
        },
      },
      {
        name: "get_market_basket_analysis",
        description:
          "Analisis cross-selling: cari produk yang sering dibeli bersamaan dengan produk target. Gunakan untuk strategi bundling, rekomendasi menu, atau analisis keranjang belanja. Contoh: 'Produk apa yang sering dibeli bareng Matcha Latte?', 'Analisis bundling untuk Pancake'",
        parameters: {
          type: "OBJECT",
          properties: {
            target_product: {
              type: "STRING",
              description: "Nama produk target untuk analisis (wajib)",
            },
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode analisis (default: month)",
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)",
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)",
            },
            limit: {
              type: "INTEGER",
              description:
                "Jumlah produk terkait yang ditampilkan (default 10)",
            },
          },
          required: ["target_product"],
        },
      },
      {
        name: "predict_stock_depletion",
        description:
          "Prediksi kapan bahan baku akan habis berdasarkan rata-rata pemakaian harian. Gunakan untuk perencanaan restock dan supply chain. Contoh: 'Kapan stok susu habis?', 'Prediksi kehabisan bahan minggu depan?'",
        parameters: {
          type: "OBJECT",
          properties: {
            days_history: {
              type: "INTEGER",
              description:
                "Jumlah hari riwayat untuk menghitung rata-rata pemakaian (default 30)",
            },
            ingredient_name: {
              type: "STRING",
              description:
                "Nama ingredient spesifik (opsional, kosongkan untuk semua)",
            },
          },
        },
      },
      {
        name: "get_churned_customers",
        description:
          "Cari pelanggan loyal yang sudah lama tidak bertransaksi (churn risk). Gunakan untuk retensi pelanggan dan CRM. Contoh: 'Pelanggan mana yang sudah lama ga beli?', 'Customer churn bulan ini?'",
        parameters: {
          type: "OBJECT",
          properties: {
            min_spending: {
              type: "NUMBER",
              description:
                "Minimum total spending untuk dianggap loyal (default: 100000)",
            },
            days_inactive: {
              type: "INTEGER",
              description:
                "Jumlah hari tidak aktif untuk dianggap churn (default: 30)",
            },
            limit: {
              type: "INTEGER",
              description: "Jumlah maksimal hasil (default 20)",
            },
          },
        },
      },
      {
        name: "get_void_refund_stats",
        description:
          "Audit transaksi void dan refund: jumlah, total nominal, dan detail. Gunakan untuk audit, pelacakan kerugian, atau analisis pembatalan. Contoh: 'Ada berapa transaksi void bulan ini?', 'Total refund minggu ini?'",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode audit (default: month)",
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)",
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)",
            },
          },
        },
      },
      {
        name: "get_comprehensive_report",
        description:
          "Laporan komprehensif dalam satu panggilan: ringkasan finansial, top produk (dengan harga dasar dari database), dan distribusi pembayaran. Gunakan untuk laporan lengkap, overview bisnis, atau executive summary. Contoh: 'Beri laporan lengkap bulan ini', 'Overview bisnis minggu ini?'",
        parameters: {
          type: "OBJECT",
          properties: {
            period: {
              type: "STRING",
              enum: ["week", "month", "custom"],
              description: "Periode laporan (default: month)",
            },
            start_date: {
              type: "STRING",
              description: "Tanggal awal jika period=custom (YYYY-MM-DD)",
            },
            end_date: {
              type: "STRING",
              description: "Tanggal akhir jika period=custom (YYYY-MM-DD)",
            },
          },
        },
      },
      {
        name: "get_sales_forecast",
        description:
          "Prediksi omzet/penjualan ke depan menggunakan algoritma pemulusan eksponensial. Gunakan jika user bertanya tentang prediksi masa depan, target omzet besok, proyeksi pendapatan, atau estimasi penjualan.",
        parameters: {
          type: "OBJECT",
          properties: {
            days_to_predict: {
              type: "INTEGER",
              description: "Jumlah hari ke depan yang ingin diprediksi (default 7)",
            },
            history_days: {
              type: "INTEGER",
              description: "Jumlah hari riwayat data yang dianalisis (default 30)",
            },
          },
        },
      },
    ],
  },
];

