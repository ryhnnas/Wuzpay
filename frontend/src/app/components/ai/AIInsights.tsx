import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Brain,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { productsAPI, transactionsAPI } from '@/services/api';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

type InsightType = 'warning' | 'trend' | 'success' | 'info';

interface InsightItem {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  action?: string;
}

interface MetricItem {
  title: string;
  value: string;
  trend: string;
  description: string;
}

interface RecommendationItem {
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
}

interface NarrativeReport {
  summary: string;
  topProduct: string;
  peakHours: string;
  strategy: string;
}

const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`;

const formatPercentChange = (current: number, previous: number) => {
  if (previous <= 0) return current > 0 ? '+100%' : '0%';
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${Math.round(delta)}%`;
};

export function AIInsights() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<MetricItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [narrativeReport, setNarrativeReport] = useState<NarrativeReport>({
    summary: 'Menganalisis data WuzPay...',
    topProduct: 'Menghitung performa produk...',
    peakHours: 'Mempelajari pola transaksi...',
    strategy: 'Menyiapkan rekomendasi bisnis...',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const [transactions, products] = await Promise.all([
        transactionsAPI.getAll(),
        productsAPI.getAll(),
      ]);

      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      const sevenDaysAgoStr = format(subDays(now, 7), 'yyyy-MM-dd');
      const fourteenDaysAgoStr = format(subDays(now, 14), 'yyyy-MM-dd');
      const thirtyDaysAgoStr = format(subDays(now, 30), 'yyyy-MM-dd');
      const sixtyDaysAgoStr = format(subDays(now, 60), 'yyyy-MM-dd');

      const txWithDate = transactions
        .map((tx: any) => ({
          ...tx,
          // MongoDB menggunakan string ISO, pastikan konversi date aman
          createdDate: tx.created_at ? new Date(tx.created_at) : new Date(),
          dateKey: tx.created_at ? format(new Date(tx.created_at), 'yyyy-MM-dd') : null,
          amount: Number(tx.total_amount ?? tx.total ?? 0),
          items: Array.isArray(tx.items) ? tx.items : [],
        }))
        .filter((tx: any) => tx.dateKey);

      const todayTx = txWithDate.filter((tx: any) => tx.dateKey === todayStr);
      const weekTx = txWithDate.filter((tx: any) => tx.dateKey >= sevenDaysAgoStr && tx.dateKey <= todayStr);
      const prevWeekTx = txWithDate.filter((tx: any) => tx.dateKey >= fourteenDaysAgoStr && tx.dateKey < sevenDaysAgoStr);
      const monthTx = txWithDate.filter((tx: any) => tx.dateKey >= thirtyDaysAgoStr && tx.dateKey <= todayStr);
      const prevMonthTx = txWithDate.filter((tx: any) => tx.dateKey >= sixtyDaysAgoStr && tx.dateKey < thirtyDaysAgoStr);

      const sumRevenue = (arr: any[]) => arr.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const todayRevenue = sumRevenue(todayTx);
      const weekRevenue = sumRevenue(weekTx);
      const prevWeekRevenue = sumRevenue(prevWeekTx);
      const monthRevenue = sumRevenue(monthTx);
      const prevMonthRevenue = sumRevenue(prevMonthTx);
      const avgTransaction = monthTx.length > 0 ? monthRevenue / monthTx.length : 0;

      // Mapping produk menggunakan _id (MongoDB)
      const productLookup = new Map(products.map((p: any) => [p._id || p.id, p.name]));
      const productStats = new Map<string, { qty: number; revenue: number; name: string }>();

      monthTx.forEach((tx: any) => {
        tx.items.forEach((item: any) => {
          const productId = item.product_id?._id || item.product_id; // Support populated object atau string ID
          const qty = Number(item.quantity || 0);
          const price = Number(item.price_at_sale || 0);
          const key = productId || 'unknown';
          
          const existing = productStats.get(key) || {
            qty: 0,
            revenue: 0,
            name: productLookup.get(key) || item.name || 'Produk Tidak Dikenal',
          };
          existing.qty += qty;
          existing.revenue += qty * price;
          productStats.set(key, existing);
        });
      });

      const sortedProducts = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue);
      const topProduct = sortedProducts[0];

      // Filter stok kritis berdasarkan stock_quantity (Nama kolom di backend baru)
      const lowStockProducts = products
        .filter((p: any) => Number(p.stock_quantity || 0) < 5)
        .sort((a: any, b: any) => Number(a.stock_quantity) - Number(b.stock_quantity));

      const hourCount = new Map<number, number>();
      txWithDate.forEach((tx: any) => {
        const hour = tx.createdDate.getHours();
        hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
      });
      
      const topHours = Array.from(hourCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);

      const generatedInsights: InsightItem[] = [];
      generatedInsights.push({
        id: 'weekly-trend',
        type: weekRevenue >= prevWeekRevenue ? 'trend' : 'warning',
        title: 'Tren Penjualan Mingguan',
        description: `${formatCurrency(weekRevenue)} dari ${weekTx.length} transaksi (${formatPercentChange(weekRevenue, prevWeekRevenue)} vs pekan lalu)`,
      });

      generatedInsights.push({
        id: 'today-sales',
        type: 'success',
        title: 'Status Hari Ini',
        description: `${todayTx.length} transaksi WuzPay berhasil diproses dengan total ${formatCurrency(todayRevenue)}`,
      });

      if (lowStockProducts.length > 0) {
        generatedInsights.push({
          id: 'low-stock',
          type: 'warning',
          title: 'Perhatian Stok!',
          description: `${lowStockProducts.length} produk di bawah stok aman. Segera restock secepatnya.`,
          action: 'Lihat Daftar Stok',
        });
      }

      setInsights(generatedInsights);

      setBusinessMetrics([
        {
          title: 'Omzet (30 Hari)',
          value: formatCurrency(monthRevenue),
          trend: formatPercentChange(monthRevenue, prevMonthRevenue),
          description: 'Dibandingkan 30 hari sebelumnya',
        },
        {
          title: 'Volume Transaksi',
          value: `${monthTx.length}`,
          trend: formatPercentChange(monthTx.length, prevMonthTx.length),
          description: 'Total transaksi berhasil',
        },
        {
          title: 'Rata-rata Keranjang',
          value: formatCurrency(avgTransaction),
          trend: weekTx.length ? formatPercentChange(weekRevenue / weekTx.length, prevWeekTx.length ? prevWeekRevenue / prevWeekTx.length : 0) : '0%',
          description: 'Nilai belanja per transaksi',
        },
        {
          title: 'Item Kritis',
          value: `${lowStockProducts.length}`,
          trend: lowStockProducts.length > 0 ? 'Urgent' : 'Aman',
          description: 'Produk stok di bawah 5 unit',
        },
      ]);

      const generatedRecommendations: RecommendationItem[] = [];
      if (lowStockProducts.length > 0) {
        generatedRecommendations.push({
          title: 'Restock Produk Prioritas',
          description: `Stok ${lowStockProducts.slice(0, 2).map((p: any) => p.name).join(' & ')} sudah kritis. Segera hubungi supplier.`,
          impact: 'High',
        });
      }

      if (topProduct) {
        generatedRecommendations.push({
          title: 'Eksploitasi Produk Terlaris',
          description: `${topProduct.name} adalah sumber cuan utama. Pertimbangkan paket bundling dengan minuman.`,
          impact: 'High',
        });
      }

      setRecommendations(generatedRecommendations.slice(0, 4));

      setNarrativeReport({
        summary: `Performa WuzPay dalam 30 hari terakhir menghasilkan ${formatCurrency(monthRevenue)} (${formatPercentChange(monthRevenue, prevMonthRevenue)}).`,
        topProduct: topProduct
          ? `${topProduct.name} mendominasi pasar dengan kontribusi ${formatCurrency(topProduct.revenue)}.`
          : 'Data produk belum cukup dominan untuk dianalisis.',
        peakHours: topHours.length > 0
          ? `Waktu tersibuk tokomu adalah pukul ${topHours.join(' & ')}. Pastikan stok siap sebelum jam ini.`
          : 'Pola jam ramai belum terbentuk secara konsisten.',
        strategy: 'Optimalkan ketersediaan bahan baku pada jam sibuk dan lakukan upsell pada produk terlaris.',
      });

    } catch (error) {
      toast.error('Gagal memproses data WuzPay AI');
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="size-6 text-orange-600" />;
      case 'trend': return <TrendingUp className="size-6 text-gray-900" />;
      case 'success': return <CheckCircle className="size-6 text-green-600" />;
      default: return <Info className="size-6 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter text-gray-900 italic">
            Business <span className="text-orange-600">Insights</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Analisis Data Otomatis WuzPay</p>
        </div>
        <Button onClick={loadInsights} disabled={isLoading} className="bg-gray-900 text-white rounded-2xl font-black px-6 h-12 shadow-xl shadow-gray-200 uppercase text-[10px] tracking-widest">
          <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} />
          Generate Report
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {businessMetrics.map((metric, index) => (
          <Card key={index} className="rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-2">
            <CardContent className="pt-6">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{metric.title}</p>
              <p className="mb-1 font-black text-2xl tracking-tighter text-gray-900">{metric.value}</p>
              <div className="flex items-center gap-2">
                 <Badge className={`text-[9px] font-black px-2 py-0.5 rounded-full ${metric.trend.startsWith('-') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                   {metric.trend}
                 </Badge>
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">vs Last Month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Insights Column */}
        <div className="space-y-4">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 ml-2">AI Findings</h3>
          <div className="grid gap-4">
            {insights.map(insight => (
              <Card key={insight.id} className="rounded-[24px] border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="pt-6 flex gap-4">
                  <div className="bg-gray-50 p-3 rounded-2xl h-fit">{getIcon(insight.type)}</div>
                  <div className="flex-1">
                    <h4 className="font-black text-sm uppercase tracking-tight text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed">{insight.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recommendations Column */}
        <div className="space-y-4">
           <h3 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 ml-2">Strategic Moves</h3>
           <Card className="rounded-[32px] border-none shadow-xl bg-gray-900 text-white overflow-hidden">
             <CardHeader className="border-b border-white/10 pb-4">
               <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                 <Zap className="size-4 text-orange-500" /> WuzPay Engine Recommendation
               </CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               {recommendations.map((rec, index) => (
                 <div key={index} className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                   <div className="flex items-center justify-between mb-2">
                     <h4 className="font-bold text-xs uppercase text-orange-500">{rec.title}</h4>
                     <Badge className="bg-orange-600 text-[8px] font-black text-white px-2 py-0">IMPACT: {rec.impact}</Badge>
                   </div>
                   <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{rec.description}</p>
                 </div>
               ))}
             </CardContent>
           </Card>
        </div>
      </div>

      {/* Narrative Report */}
      <Card className="rounded-[40px] border-none shadow-[0_20px_60px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
        <CardHeader className="bg-orange-50/50 p-8 border-b border-orange-100/50">
          <CardTitle className="font-black text-xl uppercase tracking-tighter text-gray-900 italic flex items-center gap-2">
            <Brain className="size-6 text-orange-600" /> Laporan Eksekutif WuzPay
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Ringkasan', text: narrativeReport.summary, icon: <Info /> },
              { label: 'Top Product', text: narrativeReport.topProduct, icon: <TrendingUp /> },
              { label: 'Puncak Jam', text: narrativeReport.peakHours, icon: <RefreshCw /> },
              { label: 'Strategi', text: narrativeReport.strategy, icon: <Zap /> }
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 block">{item.label}</span>
                <p className="text-xs font-bold text-gray-700 leading-relaxed italic">"{item.text}"</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}