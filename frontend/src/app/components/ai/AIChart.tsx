import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/app/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

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

interface AIChartProps {
  config: ChartConfig;
}

export function AIChart({ config }: AIChartProps) {
  const formatValue = (val: number) => {
    if (config.formatY === 'currency') return `Rp ${val.toLocaleString('id-ID')}`;
    if (config.formatY === 'percent') return `${val}%`;
    return val.toLocaleString('id-ID');
  };

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={config.data} 
              layout={config.layout === 'horizontal' ? 'vertical' : 'horizontal'}
              margin={{ top: 10, right: 10, left: config.layout === 'horizontal' ? 60 : 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              {config.layout === 'horizontal' ? (
                <>
                  <XAxis type="number" tickFormatter={(v) => v > 1000 ? `${v/1000}k` : v} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey={config.xKey} fontSize={12} tickLine={false} axisLine={false} />
                </>
              ) : (
                <>
                  <XAxis dataKey={config.xKey} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => v > 1000 ? `${v/1000}k` : v} fontSize={12} tickLine={false} axisLine={false} />
                </>
              )}
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {config.yKeys.map((y, i) => (
                <Bar 
                  key={y.key} 
                  dataKey={y.key} 
                  name={y.label} 
                  fill={y.color || '#ea580c'} 
                  radius={[4, 4, 4, 4]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={config.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey={config.xKey} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => v > 1000 ? `${v/1000}k` : v} fontSize={12} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {config.yKeys.map((y, i) => (
                <Line 
                  key={y.key} 
                  type="monotone" 
                  dataKey={y.key} 
                  name={y.label} 
                  stroke={y.color || '#ea580c'} 
                  strokeWidth={3}
                  activeDot={{ r: 6 }} 
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={config.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey={config.xKey} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(v) => v > 1000 ? `${v/1000}k` : v} fontSize={12} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {config.yKeys.map((y, i) => (
                <Area 
                  key={y.key} 
                  type="monotone" 
                  dataKey={y.key} 
                  name={y.label} 
                  fill={y.color || '#fdba74'} 
                  stroke={y.color || '#ea580c'} 
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Pie
                data={config.data}
                dataKey={config.yKeys[0].key}
                nameKey={config.xKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={50} // donut shape
                paddingAngle={2}
              >
                {config.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || '#ea580c'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  // Convert generic chart config to the config format expected by ChartContainer
  const uiChartConfig = config.yKeys.reduce((acc, y) => {
    acc[y.key] = { label: y.label, color: y.color };
    return acc;
  }, {} as any);

  return (
    <Card className="mt-4 overflow-hidden border-orange-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardHeader className="py-3 px-4 bg-orange-50/50 border-b border-orange-50">
        <CardTitle className="text-sm font-black uppercase text-orange-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 bg-white">
        <ChartContainer config={uiChartConfig} className="w-full">
          {renderChart()}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
