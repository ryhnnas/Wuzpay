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
    summary: 'Belum ada data transaksi yang cukup untuk dianalisis.',
    topProduct: 'Belum ada data produk terlaris.',
    peakHours: 'Belum ada data jam ramai transaksi.',
    strategy: 'Mulai kumpulkan data transaksi agar rekomendasi AI semakin akurat.',
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
          createdDate: tx.created_at ? new Date(tx.created_at) : null,
          dateKey: tx.created_at ? format(new Date(tx.created_at), 'yyyy-MM-dd') : null,
          amount: Number(tx.total_amount ?? tx.total ?? 0),
          items: Array.isArray(tx.items) ? tx.items : [],
        }))
        .filter((tx: any) => tx.createdDate && !Number.isNaN(tx.createdDate.getTime()));

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

      const productLookup = new Map(products.map((product: any) => [product.id, product.name]));
      const productStats = new Map<string, { qty: number; revenue: number; name: string }>();

      monthTx.forEach((tx: any) => {
        tx.items.forEach((item: any) => {
          const productId = item.product_id;
          const qty = Number(item.quantity || 0);
          const price = Number(item.price_at_sale || 0);
          const key = productId || item.product_name || 'unknown';
          const existing = productStats.get(key) || {
            qty: 0,
            revenue: 0,
            name: productLookup.get(productId) || item.product_name || 'Produk Tidak Dikenal',
          };
          existing.qty += qty;
          existing.revenue += qty * price;
          productStats.set(key, existing);
        });
      });

      const sortedProducts = Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue);
      const topProduct = sortedProducts[0];

      const lowStockProducts = products
        .filter((p: any) => Number(p.stock_quantity || p.stock || 0) < 5)
        .sort((a: any, b: any) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0));

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
        title: 'Performa 7 Hari Terakhir',
        description: `${formatCurrency(weekRevenue)} dari ${weekTx.length} transaksi (${formatPercentChange(weekRevenue, prevWeekRevenue)} vs 7 hari sebelumnya)`,
        action: 'Buka laporan penjualan',
      });

      generatedInsights.push({
        id: 'today-sales',
        type: 'success',
        title: 'Penjualan Hari Ini',
        description: `${todayTx.length} transaksi dengan total ${formatCurrency(todayRevenue)}`,
        action: 'Pantau transaksi live',
      });

      if (lowStockProducts.length > 0) {
        generatedInsights.push({
          id: 'low-stock',
          type: 'warning',
          title: 'Peringatan Stok Menipis',
          description: `${lowStockProducts.length} produk di bawah stok aman. Kritis: ${lowStockProducts.slice(0, 2).map((p: any) => p.name).join(', ')}`,
          action: 'Buka manajemen stok',
        });
      }

      if (topProduct) {
        generatedInsights.push({
          id: 'top-product',
          type: 'trend',
          title: 'Produk Paling Laris (30 Hari)',
          description: `${topProduct.name} terjual ${topProduct.qty} pcs dengan omzet ${formatCurrency(topProduct.revenue)}`,
          action: 'Optimalkan stok produk ini',
        });
      }

      setInsights(generatedInsights);

      setBusinessMetrics([
        {
          title: 'Total Penjualan 30 Hari',
          value: formatCurrency(monthRevenue),
          trend: formatPercentChange(monthRevenue, prevMonthRevenue),
          description: 'Dibandingkan 30 hari sebelumnya',
        },
        {
          title: 'Jumlah Transaksi 30 Hari',
          value: `${monthTx.length}`,
          trend: formatPercentChange(monthTx.length, prevMonthTx.length),
          description: 'Volume transaksi terbaru',
        },
        {
          title: 'Rata-rata Nilai Transaksi',
          value: formatCurrency(avgTransaction),
          trend: weekTx.length ? formatPercentChange(weekRevenue / weekTx.length, prevWeekTx.length ? prevWeekRevenue / prevWeekTx.length : 0) : '0%',
          description: 'Average ticket size per transaksi',
        },
        {
          title: 'Produk Stok Kritis',
          value: `${lowStockProducts.length}`,
          trend: lowStockProducts.length > 0 ? 'Perlu aksi' : 'Aman',
          description: 'Produk dengan stok di bawah 5 unit',
        },
      ]);

      const generatedRecommendations: RecommendationItem[] = [];

      if (lowStockProducts.length > 0) {
        generatedRecommendations.push({
          title: 'Restock Produk Kritis',
          description: `Segera isi ulang stok untuk ${lowStockProducts.slice(0, 3).map((p: any) => p.name).join(', ')} agar tidak kehilangan penjualan.`,
          impact: 'High',
        });
      }

      if (topProduct) {
        generatedRecommendations.push({
          title: 'Optimalkan Produk Terlaris',
          description: `${topProduct.name} adalah penyumbang omzet tertinggi. Pertahankan ketersediaan stok dan pertimbangkan upsell/bundling.`,
          impact: 'High',
        });
      }

      if (topHours.length > 0) {
        generatedRecommendations.push({
          title: 'Fokus Jam Ramai',
          description: `Jam paling ramai ada di ${topHours.join(' dan ')}. Pastikan staffing dan persiapan stok lebih optimal pada jam tersebut.`,
          impact: 'Medium',
        });
      }

      if (avgTransaction < 30000) {
        generatedRecommendations.push({
          title: 'Naikkan Nilai Transaksi',
          description: 'Nilai transaksi rata-rata masih relatif rendah. Coba strategi bundling atau add-on untuk menaikkan basket size.',
          impact: 'Medium',
        });
      }

      setRecommendations(generatedRecommendations.slice(0, 4));

      setNarrativeReport({
        summary: `Dalam 30 hari terakhir tercatat ${monthTx.length} transaksi dengan total penjualan ${formatCurrency(monthRevenue)} (${formatPercentChange(monthRevenue, prevMonthRevenue)} dibanding periode sebelumnya).`,
        topProduct: topProduct
          ? `${topProduct.name} menjadi kontributor utama dengan penjualan ${topProduct.qty} pcs dan omzet ${formatCurrency(topProduct.revenue)}.`
          : 'Belum ada produk dominan karena data item transaksi masih terbatas.',
        peakHours: topHours.length > 0
          ? `Puncak transaksi terjadi pada ${topHours.join(' dan ')}. Fokuskan staf dan kesiapan operasional pada jam tersebut.`
          : 'Belum ada pola jam ramai yang konsisten dari data saat ini.',
        strategy: lowStockProducts.length > 0
          ? 'Prioritas utama adalah menjaga ketersediaan produk kritis sambil memaksimalkan produk terlaris melalui strategi promo dan bundling.'
          : 'Pertahankan performa saat ini, lanjutkan optimasi produk terlaris dan evaluasi promosi berbasis jam transaksi tertinggi.',
      });
    } catch (error) {
      toast.error('Gagal memuat insights');
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="size-6 text-yellow-600" />;
      case 'trend':
        return <TrendingUp className="size-6 text-blue-600" />;
      case 'success':
        return <CheckCircle className="size-6 text-green-600" />;
      default:
        return <Info className="size-6 text-gray-600" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'trend':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-2xl">
            <Brain className="size-8 text-purple-600" />
            AI Business Insights
          </h2>
          <p className="text-gray-500 text-sm">Analisis bisnis berbasis kecerdasan buatan</p>
        </div>
        <Button onClick={loadInsights} disabled={isLoading}>
          <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Insights
        </Button>
      </div>

      {/* AI Insights Cards */}
      <div>
        <h3 className="mb-4 font-semibold text-lg">AI Insights Terbaru</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.length === 0 && !isLoading && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="pt-6">
                <p className="text-gray-600 text-sm">Belum ada data insight. Pastikan transaksi sudah tersedia di sistem.</p>
              </CardContent>
            </Card>
          )}
          {insights.map(insight => (
            <Card key={insight.id} className="border-l-4 border-l-blue-600">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-start justify-between">
                  {getIcon(insight.type)}
                  <Badge className={getBadgeColor(insight.type)}>
                    {insight.type}
                  </Badge>
                </div>
                <h4 className="mb-2 font-semibold">{insight.title}</h4>
                <p className="text-gray-600 text-sm">{insight.description}</p>
                {insight.action && (
                  <Button variant="link" className="mt-2 h-auto p-0" disabled>
                    {insight.action} →
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Business Metrics */}
      <div>
        <h3 className="mb-4 font-semibold text-lg">Metrik Bisnis</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {businessMetrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <p className="mb-2 text-gray-600 text-sm">{metric.title}</p>
                <p className="mb-1 break-words font-bold text-3xl">{metric.value}</p>
                <p className={`mb-2 text-sm ${metric.trend.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>
                  {metric.trend} vs periode lalu
                </p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5 text-yellow-500" />
            Rekomendasi AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start gap-4 rounded-lg border p-4 hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <h4 className="font-semibold">{rec.title}</h4>
                  <Badge
                    variant={rec.impact === 'High' ? 'default' : 'outline'}
                    className={rec.impact === 'High' ? 'bg-red-600' : ''}
                  >
                    Impact: {rec.impact}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm">{rec.description}</p>
              </div>
              <Button size="sm">Terapkan</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Narrative Report */}
      <Card>
        <CardHeader>
          <CardTitle>Laporan Naratif AI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-gray-700">
            <p>
              <strong>Ringkasan Performa Bisnis:</strong> {narrativeReport.summary}
            </p>
            <p>
              <strong>Produk Unggulan:</strong> {narrativeReport.topProduct}
            </p>
            <p>
              <strong>Peak Hours:</strong> {narrativeReport.peakHours}
            </p>
            <p>
              <strong>Rekomendasi Strategis:</strong> {narrativeReport.strategy}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Integration Info
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Brain className="size-12 text-purple-600" />
            <div>
              <h3 className="mb-2 font-semibold">Integrasi AI API</h3>
              <p className="mb-2 text-sm text-gray-700">
                Untuk mengaktifkan AI insights real-time, hubungkan dengan:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                <li>Google Gemini API - untuk analisis bisnis dan chat assistant</li>
                <li>OpenAI API - alternatif untuk AI processing</li>
                <li>n8n Automation - untuk notifikasi dan laporan otomatis</li>
              </ul>
              <p className="mt-3 text-xs text-gray-600">
                Tambahkan API key di file konfigurasi backend Anda
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
