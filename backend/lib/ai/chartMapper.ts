import * as Types from "./types.ts";

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie';
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKeys: { key: string; label: string; color: string }[];
  layout?: 'vertical' | 'horizontal';
  formatY?: 'currency' | 'number' | 'percent';
}

export function generateCharts(collectedData: { toolName: string, result: any }[]): ChartConfig[] {
  const charts: ChartConfig[] = [];
  
  for (const item of collectedData) {
    if (!item.result || item.result.error) continue;
    
    const config = mapToolToChart(item.toolName, item.result);
    if (config) {
      charts.push(config);
    }
  }
  
  return charts;
}

function mapToolToChart(toolName: string, data: any): ChartConfig | null {
  const chartId = `${toolName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  switch (toolName) {
    case 'get_daily_breakdown':
      if (!data.breakdown || data.breakdown.length === 0) return null;
      return {
        id: chartId,
        type: 'bar',
        title: `Penjualan ${data.days_requested} Hari Terakhir`,
        data: data.breakdown.map((d: any) => {
          // Format date for better x-axis display (e.g. 2026-05-01 -> 01 Mei)
          const dateObj = new Date(d.date);
          const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          return {
            ...d,
            formattedDate
          };
        }),
        xKey: 'formattedDate',
        yKeys: [
          { key: 'revenue', label: 'Omzet', color: '#ea580c' }, // orange-600
          { key: 'profit', label: 'Profit', color: '#16a34a' }   // green-600
        ],
        formatY: 'currency'
      };

    case 'get_top_products':
      if (!data.products || data.products.length === 0) return null;
      return {
        id: chartId,
        type: 'bar',
        title: `Top ${data.products.length} Produk (${data.sorted_by === 'quantity' ? 'Jumlah' : 'Omzet'})`,
        data: data.products,
        xKey: 'name',
        yKeys: [
          data.sorted_by === 'quantity' 
            ? { key: 'quantity_sold', label: 'Terjual', color: '#ea580c' }
            : { key: 'revenue', label: 'Omzet', color: '#ea580c' }
        ],
        layout: 'horizontal',
        formatY: data.sorted_by === 'quantity' ? 'number' : 'currency'
      };

    case 'get_hourly_sales':
      if (!data.hourly_data || data.hourly_data.length === 0) return null;
      return {
        id: chartId,
        type: 'area',
        title: 'Tren Penjualan per Jam',
        data: data.hourly_data,
        xKey: 'hour',
        yKeys: [
          { key: 'transaction_count', label: 'Transaksi', color: '#ea580c' }
        ],
        formatY: 'number'
      };

    case 'get_payment_method_stats':
      if (!data.methods || data.methods.length === 0) return null;
      const colors = ['#ea580c', '#f97316', '#fdba74', '#fed7aa', '#ffedd5'];
      return {
        id: chartId,
        type: 'pie',
        title: 'Distribusi Metode Pembayaran',
        data: data.methods.map((m: any, i: number) => ({
          name: m.method.toUpperCase(),
          value: m.total,
          fill: colors[i % colors.length]
        })),
        xKey: 'name',
        yKeys: [{ key: 'value', label: 'Total', color: '#ea580c' }],
        formatY: 'currency'
      };

    case 'get_sales_forecast':
      if (!data.daily_forecast || data.daily_forecast.length === 0) return null;
      return {
        id: chartId,
        type: 'line',
        title: `Prediksi Penjualan ${data.days_to_predict} Hari Ke Depan`,
        data: data.daily_forecast.map((d: any) => ({
          ...d,
          dayLabel: `Hari +${d.day_from_now}`
        })),
        xKey: 'dayLabel',
        yKeys: [
          { key: 'forecasted_revenue', label: 'Prediksi Omzet', color: '#ea580c' }
        ],
        formatY: 'currency'
      };

    case 'get_profit_report':
      if (!data.top_profit_products || data.top_profit_products.length === 0) return null;
      return {
        id: chartId,
        type: 'bar',
        title: 'Produk Paling Menguntungkan',
        data: data.top_profit_products,
        xKey: 'name',
        yKeys: [
          { key: 'profit', label: 'Profit', color: '#16a34a' },
          { key: 'cost', label: 'Modal', color: '#ef4444' }
        ],
        layout: 'horizontal',
        formatY: 'currency'
      };

    case 'compare_periods':
      if (!data.current_period || !data.compare_period) return null;
      const metricKey = data.metric || 'revenue';
      let metricLabel = 'Nilai';
      let format: 'currency' | 'number' = 'number';
      
      if (metricKey === 'revenue') { metricLabel = 'Omzet'; format = 'currency'; }
      if (metricKey === 'profit') { metricLabel = 'Profit'; format = 'currency'; }
      if (metricKey === 'transactions') { metricLabel = 'Transaksi'; format = 'number'; }
      if (metricKey === 'avg_transaction') { metricLabel = 'Rata-rata'; format = 'currency'; }

      return {
        id: chartId,
        type: 'bar',
        title: `Perbandingan ${metricLabel}`,
        data: [
          { 
            period: 'Periode Lalu', 
            [metricKey]: data.compare_period[metricKey] 
          },
          { 
            period: 'Periode Sekarang', 
            [metricKey]: data.current_period[metricKey] 
          }
        ],
        xKey: 'period',
        yKeys: [
          { key: metricKey, label: metricLabel, color: '#ea580c' }
        ],
        formatY: format
      };

    case 'get_customer_stats':
      if (!data.top_by_spending || data.top_by_spending.length === 0) return null;
      return {
        id: chartId,
        type: 'bar',
        title: 'Pelanggan dengan Spending Tertinggi',
        data: data.top_by_spending,
        xKey: 'customer_name',
        yKeys: [
          { key: 'total_spending', label: 'Total Spending', color: '#ea580c' }
        ],
        layout: 'horizontal',
        formatY: 'currency'
      };

    case 'get_comprehensive_report':
      // Return multiple charts is ideally supported, but our mapping currently returns one chart per tool call.
      // We will map the payment distribution as a pie chart, and top products as a bar chart if we could.
      // For simplicity, we'll return the payment distribution pie chart.
      if (!data.payment_distribution || data.payment_distribution.length === 0) return null;
      const compColors = ['#ea580c', '#f97316', '#fdba74', '#fed7aa', '#ffedd5'];
      return {
        id: chartId,
        type: 'pie',
        title: 'Distribusi Metode Pembayaran',
        data: data.payment_distribution.map((m: any, i: number) => ({
          name: m.method.toUpperCase(),
          value: m.total_amount,
          fill: compColors[i % compColors.length]
        })),
        xKey: 'name',
        yKeys: [{ key: 'value', label: 'Total', color: '#ea580c' }],
        formatY: 'currency'
      };

    default:
      return null;
  }
}
