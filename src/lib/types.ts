export type VarType = 'numeric' | 'string'

export interface Variable {
  id: string
  name: string
  label: string
  type: VarType
  width: number
  columns?: number
  decimals: number
  values: Record<number, string> | null
  measure: 'Nominal' | 'Ordinal' | 'Scale'
  role: 'Input' | 'Target' | 'Both' | 'None'
  align: 'Left' | 'Right' | 'Center'
  missing: string
}

export interface Dataset {
  name: string
  variables: Variable[]
  rows: number[][]
  filteredRows?: boolean[] // true if row is active/included, false if filtered out
}

export interface TableSpec {
  kind: 'table'
  id: string
  title: string
  groups?: { label: string; span: number }[]
  columns: string[]
  rows: string[][]
  notes?: string[]
  compact?: boolean
  highlightRows?: number[]
}

export interface ChartSpec {
  kind: 'chart'
  id: string
  title: string
  chartType: 'bar' | 'histogram' | 'scatter' | 'ppplot'
  labels?: string[]
  values?: number[]
  xLabel?: string
  yLabel?: string
  points?: { x: number; y: number; label?: string }[]
  footnote?: string
}

export type OutputBlock = TableSpec | ChartSpec

export interface OutputNode {
  id: string
  title: string
  command: string
  createdAt: number
  blocks: OutputBlock[]
  interpretation?: string
}

export interface AnalysisResult {
  title: string
  command: string
  blocks: OutputBlock[]
  syntax: string
  interpretation?: string
}
