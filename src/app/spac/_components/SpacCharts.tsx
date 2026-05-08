'use client'

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SpacTableRow } from '../_lib/types';
import { useAtomValue } from 'jotai';
import { themeAtom } from '@/lib/theme';

interface SpacChartsProps {
  data: SpacTableRow[];
  onItemClick?: (item: SpacTableRow) => void;
}

export function SpacTop8Chart({ data, onItemClick }: SpacChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = useAtomValue(themeAtom);

  const top8 = [...data]
    .sort((a, b) => b.annualYield - a.annualYield)
    .slice(0, 8)
    .reverse(); // ECharts vertical bar starts from bottom

  useEffect(() => {
    if (!chartRef.current || top8.length === 0) return;

    const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined, {
      renderer: 'canvas'
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '8%',
        bottom: '3%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            opacity: 0.1
          }
        }
      },
      yAxis: {
        type: 'category',
        data: top8.map(item => item.name),
        axisLabel: {
          fontSize: 10,
          fontWeight: 'bold',
          width: 100,
          overflow: 'break'
        },
        axisTick: { show: false },
        axisLine: { show: false }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        padding: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
        formatter: (params: unknown) => {
          const axisParams = params as { dataIndex: number }[];
          const item = top8[axisParams[0].dataIndex];
          return `
            <div class="bg-background/95 border shadow-xl p-3 rounded-xl backdrop-blur-md border-border">
              <p class="font-black text-sm mb-1 text-foreground">${item.name}</p>
              <p class="text-[11px] text-primary font-bold">연이율: +${item.annualYield.toFixed(2)}%</p>
              <p class="text-[11px] text-muted-foreground font-bold">잔여기간: ${item.remainingDays}일</p>
            </div>
          `;
        }
      },
      series: [
        {
          type: 'bar',
          data: top8.map((item, index) => ({
            value: parseFloat(item.annualYield.toFixed(2)),
            itemStyle: {
              color: 'hsl(221.2 83.2% 53.3%)', // primary color
              opacity: 0.4 + (index / top8.length) * 0.6,
              borderRadius: [0, 4, 4, 0]
            }
          })),
          barWidth: '60%',
          emphasis: {
            itemStyle: {
              opacity: 1
            }
          }
        }
      ]
    };

    chart.setOption(option);
    
    chart.on('click', (params) => {
      const item = top8[params.dataIndex];
      onItemClick?.(item);
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [top8, theme, onItemClick]);

  return (
    <Card className="w-full shadow-md border-none bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">연이율 상위 8개 종목</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] pt-0">
        <div ref={chartRef} className="w-full h-full" />
      </CardContent>
    </Card>
  );
}

export function SpacScatterChart({ data, onItemClick }: SpacChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const theme = useAtomValue(themeAtom);
  const [isFiltered, setIsFiltered] = useState(true);

  // Filter: yield 0-10%, days < 300 (as per spec)
  const chartData = isFiltered 
    ? data.filter(item => item.annualYield >= 0 && item.annualYield <= 10 && item.remainingDays <= 300)
    : data.filter(item => item.annualYield >= -5); // Show reasonable range for 'All'

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined, {
      renderer: 'canvas'
    });

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: '3%',
        right: '8%',
        bottom: '12%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '잔여기간(일)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { fontSize: 10, fontWeight: 'bold' },
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', opacity: 0.1 } }
      },
      yAxis: {
        type: 'value',
        name: '연이율(%)',
        nameTextStyle: { fontSize: 10, fontWeight: 'bold' },
        axisLabel: { fontSize: 10 },
        splitLine: { lineStyle: { type: 'dashed', opacity: 0.1 } }
      },
      tooltip: {
        padding: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
        formatter: (params: unknown) => {
          const scatterParams = params as { dataIndex: number };
          const item = chartData[scatterParams.dataIndex];
          return `
            <div class="bg-background/95 border shadow-xl p-3 rounded-xl backdrop-blur-md border-border">
              <p class="font-black text-sm mb-1 text-foreground">${item.name}</p>
              <p class="text-[11px] text-primary font-bold">연이율: +${item.annualYield.toFixed(2)}%</p>
              <p class="text-[11px] text-muted-foreground font-bold">잔여기간: ${item.remainingDays}일</p>
            </div>
          `;
        }
      },
      series: [
        {
          type: 'scatter',
          data: chartData.map(item => [item.remainingDays, parseFloat(item.annualYield.toFixed(2))]),
          symbolSize: (data: unknown) => {
            const val = data as number[];
            // Larger symbols for better yields
            return 8 + (val[1] > 0 ? val[1] : 0);
          },
          itemStyle: {
            color: 'hsl(221.2 83.2% 53.3%)', // primary color
            opacity: 0.6
          },
          emphasis: {
            scale: true,
            itemStyle: {
              opacity: 1
            }
          }
        }
      ]
    };

    chart.setOption(option);

    chart.on('click', (params) => {
      const item = chartData[params.dataIndex];
      onItemClick?.(item);
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [chartData, theme, onItemClick]);

  return (
    <Card className="w-full shadow-md border-none bg-card/60 backdrop-blur-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">스팩 잔여기간 · 연이율 산점도</CardTitle>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
          <button 
            onClick={() => setIsFiltered(true)}
            className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${isFiltered ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            타겟
          </button>
          <button 
            onClick={() => setIsFiltered(false)}
            className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${!isFiltered ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
          >
            전체
          </button>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] pt-0">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs font-bold">
            데이터가 없습니다
          </div>
        ) : (
          <div ref={chartRef} className="w-full h-full" />
        )}
      </CardContent>
    </Card>
  );
}
