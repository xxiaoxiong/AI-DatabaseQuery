import ReactECharts from 'echarts-for-react'
import { useMemo } from 'react'

interface Props {
  chartType: string
  columns: string[]
  rows: Record<string, unknown>[]
}

function buildOption(chartType: string, columns: string[], rows: Record<string, unknown>[]) {
  if (!rows.length || !columns.length) return {}

  const firstCol = columns[0]
  const numericCols = columns.filter(col => {
    const val = rows[0]?.[col]
    return typeof val === 'number'
  })
  const textCols = columns.filter(col => {
    const val = rows[0]?.[col]
    return typeof val !== 'number'
  })

  const xData = rows.map(r => String(r[firstCol] ?? ''))
  const baseOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  }

  if (chartType === 'bar') {
    return {
      ...baseOption,
      xAxis: { type: 'category', data: xData, axisLabel: { rotate: xData.length > 8 ? 30 : 0 } },
      yAxis: { type: 'value' },
      series: numericCols.slice(0, 3).map(col => ({
        name: col,
        type: 'bar',
        data: rows.map(r => r[col]),
      })),
      legend: numericCols.length > 1 ? { top: 0 } : undefined,
    }
  }

  if (chartType === 'line') {
    return {
      ...baseOption,
      xAxis: { type: 'category', data: xData },
      yAxis: { type: 'value' },
      series: numericCols.slice(0, 5).map(col => ({
        name: col,
        type: 'line',
        data: rows.map(r => r[col]),
        smooth: true,
      })),
      legend: numericCols.length > 1 ? { top: 0 } : undefined,
    }
  }

  if (chartType === 'pie') {
    const labelCol = textCols[0] || columns[0]
    const valCol = numericCols[0] || columns[1]
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left' },
      series: [{
        type: 'pie',
        radius: '60%',
        data: rows.map(r => ({ name: String(r[labelCol] ?? ''), value: r[valCol] })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    }
  }

  if (chartType === 'scatter') {
    const xCol = numericCols[0] || columns[0]
    const yCol = numericCols[1] || columns[1]
    return {
      ...baseOption,
      xAxis: { type: 'value', name: xCol },
      yAxis: { type: 'value', name: yCol },
      series: [{
        type: 'scatter',
        data: rows.map(r => [r[xCol], r[yCol]]),
        symbolSize: 8,
      }],
    }
  }

  return {}
}

export default function ChartPanel({ chartType, columns, rows }: Props) {
  const option = useMemo(
    () => buildOption(chartType, columns, rows),
    [chartType, columns, rows]
  )

  if (!rows.length) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">暂无数据</div>
  }

  if (chartType === 'table' || !Object.keys(option).length) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">请切换到表格视图</div>
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      notMerge
      lazyUpdate
    />
  )
}
