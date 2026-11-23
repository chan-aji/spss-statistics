import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, Dataset, OutputNode } from '../../lib/types'
import { cloneDataset, createSurveyDataset, emptyDataset, executeComputeVariable, executeRecode, type RecodeRule, exportSav, parseSav, isSavFile, datasetToExcelXML } from '../../lib/data'
import {
  DEFAULT_DESC_OPTIONS, runCorrelations, runCrosstabs, runDescriptives, runFrequencies,
  runIndependentT, runOneSample, runOneWayAnova, runPairedT, runRegression, runReliability,
  runValidity, runNormality, runClassicalAssumptions, runMannWhitney, runWilcoxon, runKruskalWallis,
  runLogisticRegression, runTwoWayAnova, runFactorAnalysis,
} from '../../lib/analyses'
import DataEditor, { VariableView } from './DataEditor'
import OutputViewer from './OutputViewer'
import { MenuBar, StatusBar, TitleBar, Toolbar } from './Chrome'
import {
  AboutDialog, CorrelationsDialog, CrosstabsDialog, DescriptivesDialog, FindDialog,
  FrequenciesDialog, IndependentDialog, InfoDialog, OneSampleDialog, OneWayAnovaDialog,
  PairedTDialog, RegressionDialog, ReliabilityDialog, ValidityDialog, NormalityDialog,
  ClassicalAssumptionsDialog, MannWhitneyDialog, WilcoxonDialog, KruskalWallisDialog,
  ComputeVariableDialog, RecodeDialog, SelectCasesDialog, SortDialog,
  PartialCorrelationDialog, PowerAnalysisDialog, SaveDataAsDialog, DataFileInfoDialog,
  BinaryLogisticDialog, TwoWayAnovaDialog, FactorAnalysisDialog, SaveLocationModal, ReplaceDialog,
} from './Dialogs'
import QuickGuide from './QuickGuide'
import { AIAgentPanel } from './AIAgentPanel'
import { Icon } from '../Icons'
import './workspace.css'

const STORAGE_KEY = 'spss-workspace-dataset-v3'

type View = 'data' | 'variable' | 'output' | 'syntax'
type DialogName =
  | 'descriptives' | 'frequencies' | 'correlation' | 'regression' | 'reliability' | 'validity'
  | 'onesample' | 'independent' | 'paired' | 'anova' | 'normality' | 'assumptions'
  | 'mannwhitney' | 'wilcoxon' | 'kruskalwallis' | 'crosstabs'
  | 'compute' | 'recode' | 'select' | 'sort' | 'find' | 'replace' | 'about'
  | 'partial' | 'power' | 'saveas' | 'datainfo' | 'logistic' | 'twowayanova' | 'factor' | null

function isValidDataset(value: unknown): value is Dataset {
  if (!value || typeof value !== 'object') return false
  const ds = value as Dataset
  return Array.isArray(ds.variables) && Array.isArray(ds.rows) &&
    ds.variables.length > 0 &&
    ds.rows.every((r) => Array.isArray(r) && r.length === ds.variables.length)
}

function loadDataset(): Dataset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (isValidDataset(parsed)) return parsed
    }
  } catch {
    // fallback
  }
  return createSurveyDataset()
}

function parseCSV(text: string): Dataset | null {
  const clean = text.replace(/^\uFEFF/, '').trim()
  if (!clean) return null
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length)
  if (lines.length < 2) return null
  const first = lines[0]
  const semi = (first.match(/;/g) || []).length
  const comma = (first.match(/,/g) || []).length
  const tab = (first.match(/\t/g) || []).length
  const delim = tab > semi && tab > comma ? '\t' : semi > comma ? ';' : ','

  const splitLine = (line: string) => {
    const out: string[] = []
    let cur = ''
    let quote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (quote && line[i + 1] === '"') { cur += '"'; i++ }
        else quote = !quote
      } else if (ch === delim && !quote) {
        out.push(cur.trim()); cur = ''
      } else cur += ch
    }
    out.push(cur.trim())
    return out
  }

  const headerCells = splitLine(lines[0])
  const numericHeader = headerCells.every((h) => h !== '' && Number.isFinite(Number(h.replace(',', '.'))))
  const names = numericHeader ? headerCells.map((_, i) => 'VAR' + String(i + 1).padStart(5, '0')) : headerCells
  const body = numericHeader ? lines : lines.slice(1)
  const rows: number[][] = []
  for (const line of body) {
    const cells = splitLine(line)
    const nums = cells.map((c) => Number(c.replace(',', '.')))
    if (nums.every((n) => Number.isFinite(n))) rows.push(nums)
  }
  if (!rows.length) return null
  const width = Math.min(names.length, ...rows.map((r) => r.length))
  const variables = names.slice(0, width).map((name, i) => {
    const safe = (name || 'VAR' + String(i + 1).padStart(5, '0')).replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, 'V$1')
    const hasDecimals = rows.some((r) => !Number.isInteger(r[i]))
    return {
      id: 'import-' + i,
      name: safe,
      label: name || safe,
      type: 'numeric' as const,
      width: 10,
      columns: 10,
      decimals: hasDecimals ? 2 : 0,
      values: null,
      measure: 'Scale' as const,
      role: 'Input' as const,
      align: 'Right' as const,
      missing: 'None',
    }
  })
  return {
    name: 'data_impor.sav',
    variables,
    rows: rows.map((r) => r.slice(0, width)),
  }
}

function csvEscape(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function outputToWordHTML(outputs: OutputNode[], dataset: Dataset) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const body = outputs.map((node) => {
    const blocks = node.blocks.map((b) => {
      if (b.kind === 'table') {
        const groupRow = b.groups ? '<tr>' + b.groups.map((g) => `<th colspan="${g.span}" bgcolor="#e8e8e8" style="border:1px solid #777;padding:5px;">${esc(g.label)}</th>`).join('') + '</tr>' : ''
        return '<h3 style="margin-top:16px;margin-bottom:4px;font-size:13px;font-weight:bold;">' + esc(b.title) + '</h3>' +
          '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-size:11px;font-family:Arial,sans-serif;margin-bottom:8px;">' +
          '<thead>' + groupRow + '<tr>' +
          b.columns.map((c) => `<th bgcolor="#e8e8e8" style="border:1px solid #777;padding:5px;font-weight:bold;">${esc(c)}</th>`).join('') +
          '</tr></thead><tbody>' +
          b.rows.map((r) => '<tr>' + r.map((c, ci) => `<td style="border:1px solid #777;padding:4px 8px;text-align:${ci === 0 ? 'left' : 'right'};">${esc(c)}</td>`).join('') + '</tr>').join('') +
          '</tbody></table>' +
          (b.notes ? '<p style="font-size:10px;color:#555;margin-top:2px;margin-bottom:12px;">' + b.notes.map(esc).join('<br>') + '</p>' : '')
      }
      return '<h3 style="margin-top:16px;">' + esc(b.title) + '</h3><p style="font-size:11px;color:#555;">[Diagram grafik statistik]</p>'
    }).join('')

    return '<section style="margin-bottom:28px;">' +
      '<h2 style="font-size:15px;border-bottom:2px solid #0f62fe;padding-bottom:4px;color:#161616;">' + esc(node.title) + '</h2>' +
      '<p style="font-size:11px;color:#666;font-style:italic;">' + esc(node.command) + '</p>' +
      (node.interpretation ? '<div style="background:#edf5ff;border-left:4px solid #0f62fe;padding:10px 14px;font-size:12px;line-height:1.6;margin:10px 0 16px;"><strong>Pedoman Pembahasan Bab IV Skripsi:</strong><br />' + esc(node.interpretation).replace(/\n/g, '<br />') + '</div>' : '') +
      blocks +
      '</section>'
  }).join('')

  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Output SPSS Statistics — ' +
    esc(dataset.name) + '</title><style>body{font-family:Arial,sans-serif;color:#161616;max-width:1200px;margin:30px auto;padding:0 20px}' +
    'h1{font-weight:bold;font-size:20px;border-bottom:3px solid #0f62fe;padding-bottom:8px}' +
    '</style></head><body><h1>IBM SPSS Statistics Output Document — ' +
    esc(dataset.name) + '</h1><p style="font-size:12px;color:#666;">Dicetak untuk Lampiran &amp; Pembahasan Hasil Penelitian Skripsi.</p>' +
    body + '<hr /><p style="font-size:10px;color:#777;">Dibuat dengan SPSS Statistics Recreation (100% Client-Side Engine).</p></body></html>'
}

export default function Workspace() {
  const [dataset, setDataset] = useState<Dataset>(loadDataset)
  const [outputs, setOutputs] = useState<OutputNode[]>([])
  const [syntaxHistory, setSyntaxHistory] = useState<string[]>([
    '* SPSS Statistics Workspace — Siap untuk Olah Data Skripsi & Riset.',
    '* Gunakan menu Analyze atau Panduan Cepat untuk menjalankan analisis.',
  ])
  const [view, setView] = useState<View>('data')
  const [dialog, setDialog] = useState<DialogName>(null)
  const [info, setInfo] = useState<{ title: string; message: string } | null>(null)
  const [valueLabels, setValueLabels] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [activeRow, setActiveRow] = useState(1)
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<Dataset[]>([])
  const [redoStack, setRedoStack] = useState<Dataset[]>([])
  const [saveLocationModal, setSaveLocationModal] = useState<{ fileName: string; locationText: string; formatText: string } | null>(null)
  const [syntaxDraft, setSyntaxDraft] = useState<string>('')
  const [aiOpen, setAiOpen] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)) } catch { /* ignore */ }
  }, [dataset])

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current) }, [])

  const toast = (msg: string) => {
    setToastMsg(msg)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3800)
  }

  const pushUndo = () => {
    setUndoStack((u) => [...u.slice(-24), cloneDataset(dataset)])
    setRedoStack([])
  }

  const resetTo = (next: Dataset, message: string) => {
    pushUndo()
    setDataset(next)
    setActiveRow(1)
    toast(message)
  }

  const undo = () => {
    if (!undoStack.length) { toast('Tidak ada tindakan untuk dibatalkan (Undo).'); return }
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(undoStack.slice(0, -1))
    setRedoStack((r) => [...r, cloneDataset(dataset)])
    setDataset(prev)
    toast('Tindakan dibatalkan (Undo).')
  }

  const redo = () => {
    if (!redoStack.length) { toast('Tidak ada tindakan untuk diulang (Redo).'); return }
    const next = redoStack[redoStack.length - 1]
    setRedoStack(redoStack.slice(0, -1))
    setUndoStack((u) => [...u, cloneDataset(dataset)])
    setDataset(next)
    toast('Tindakan diulang (Redo).')
  }

  const onCellChange = (row: number, col: number, value: number) => {
    setShowHint(false)
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      next.rows[row][col] = value
      return next
    })
  }

  // Paste table grid directly from Excel
  const onPasteBlock = (startRow: number, startCol: number, grid: number[][]) => {
    setShowHint(false)
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      const needRows = startRow + grid.length
      const needCols = startCol + Math.max(...grid.map((r) => r.length))

      // Expand variables if pasted data has more columns
      while (next.variables.length < needCols) {
        const num = next.variables.length + 1
        next.variables.push({
          id: 'v-pasted-' + Date.now() + '-' + num,
          name: 'VAR' + String(num).padStart(5, '0'),
          label: 'Variabel ' + num,
          type: 'numeric',
          width: 8,
          columns: 8,
          decimals: 2,
          values: null,
          measure: 'Scale',
          role: 'Input',
          align: 'Right',
          missing: 'None',
        })
        for (let r = 0; r < next.rows.length; r++) {
          next.rows[r].push(0)
        }
      }

      // Expand rows if pasted data has more rows
      while (next.rows.length < needRows) {
        const newR = new Array(next.variables.length).fill(0)
        next.rows.push(newR)
      }

      // Fill cells
      for (let r = 0; r < grid.length; r++) {
        const targetR = startRow + r
        for (let c = 0; c < grid[r].length; c++) {
          const targetC = startCol + c
          next.rows[targetR][targetC] = grid[r][c]
        }
      }

      if (next.filteredRows) {
        next.filteredRows = new Array(next.rows.length).fill(true)
      }
      return next
    })
    toast(`Berhasil mem-paste ${grid.length} baris data dari Excel ke Data View!`)
  }

  const onVariableChange = (index: number, patch: Partial<Dataset['variables'][number]>) => {
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      const target = { ...next.variables[index], ...patch }
      if (patch.name) {
        const base = patch.name.replace(/\s+/g, '_') || next.variables[index].name
        let candidate = base
        let n = 2
        while (next.variables.some((v, i) => i !== index && v.name === candidate)) {
          candidate = base + '_' + n
          n++
        }
        target.name = candidate
      }
      next.variables[index] = target
      return next
    })
  }

  const addCase = () => {
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      const nextId = next.rows.length + 1
      const row = next.variables.map((v) => {
        if (v.name === 'ID') return nextId
        if (v.name === 'Usia') return 21
        if (v.name === 'JK') return 1
        if (v.name === 'Kelompok_Kota') return 1
        if (v.values) return 3
        return 0
      })
      next.rows.push(row)
      if (next.filteredRows) next.filteredRows.push(true)
      return next
    })
    setActiveRow(dataset.rows.length + 1)
    toast('Baris kasus baru ditambahkan. Klik sel untuk mengedit nilai.')
  }

  const addVariable = () => {
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      const num = next.variables.length + 1
      let name = 'VAR' + String(num).padStart(5, '0')
      while (next.variables.some((v) => v.name === name)) name = 'VAR' + String(num + 1).padStart(5, '0')
      next.variables.push({
        id: 'v-new-' + Date.now(),
        name,
        label: 'Variabel baru',
        type: 'numeric',
        width: 8,
        columns: 8,
        decimals: 2,
        values: null,
        measure: 'Scale',
        role: 'Input',
        align: 'Right',
        missing: 'None',
      })
      next.rows = next.rows.map((r) => [...r, 0])
      return next
    })
    toast('Variabel baru ditambahkan di Variable View.')
  }

  const deleteCase = (rowIndex?: number) => {
    const targetRow = rowIndex !== undefined ? rowIndex : activeRow - 1
    if (dataset.rows.length <= 1) {
      toast('Dataset minimal harus memiliki 1 baris kasus.')
      return
    }
    if (targetRow < 0 || targetRow >= dataset.rows.length) return
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      next.rows.splice(targetRow, 1)
      if (next.filteredRows) next.filteredRows.splice(targetRow, 1)
      return next
    })
    setActiveRow(Math.max(1, targetRow))
    toast(`Kasus baris ${targetRow + 1} berhasil dihapus (Clear Case).`)
  }

  const deleteVariable = (varIndex: number) => {
    if (dataset.variables.length <= 1) {
      toast('Dataset minimal harus memiliki 1 variabel.')
      return
    }
    pushUndo()
    setDataset((prev) => {
      const next = cloneDataset(prev)
      next.variables.splice(varIndex, 1)
      next.rows = next.rows.map((r) => r.filter((_, i) => i !== varIndex))
      return next
    })
    toast(`Variabel berhasil dihapus (Clear Variable).`)
  }

  const handleReplace = (findVal: string, replaceVal: string, varName?: string) => {
    const targetF = Number(findVal.replace(',', '.'))
    const targetR = Number(replaceVal.replace(',', '.'))
    if (!Number.isFinite(targetF) || !Number.isFinite(targetR)) {
      toast('Nilai cari dan ganti harus berupa angka numerik.')
      return
    }

    pushUndo()
    let replacedCount = 0
    setDataset((prev) => {
      const next = cloneDataset(prev)
      const targetCol = varName ? next.variables.findIndex((v) => v.name === varName) : -1

      next.rows = next.rows.map((r) => {
        return r.map((cell, c) => {
          if (targetCol >= 0 && c !== targetCol) return cell
          if (cell === targetF) {
            replacedCount++
            return targetR
          }
          return cell
        })
      })
      return next
    })

    toast(`Selesai: ${replacedCount} nilai berhasil diganti (${findVal} → ${replaceVal}).`)
  }

  const sortCases = (name: string, order: 'asc' | 'desc') => {
    const i = dataset.variables.findIndex((v) => v.name === name)
    if (i < 0) return
    pushUndo()
    const next = cloneDataset(dataset)
    next.rows.sort((a, b) => order === 'asc' ? a[i] - b[i] : b[i] - a[i])
    setDataset(next)
    toast('Data diurutkan berdasarkan ' + name + ' (' + (order === 'asc' ? 'Ascending' : 'Descending') + ').')
  }

  const handleCompute = (target: string, label: string, expression: string) => {
    pushUndo()
    const res = executeComputeVariable(dataset, target, label, expression)
    if (res.success) {
      setDataset(res.dataset)
      toast('Variabel ' + target + ' berhasil dihitung dan ditambahkan ke dataset!')
    } else {
      toast('Gagal menghitung: ' + (res.message || 'Periksa rumus Anda.'))
    }
  }

  const handleRecode = (src: string, target: string, rules: RecodeRule[], intoSame: boolean) => {
    pushUndo()
    const res = executeRecode(dataset, src, target, rules, intoSame)
    if (res.success) {
      setDataset(res.dataset)
      toast('Recode selesai. ' + (intoSame ? 'Variabel ' + src + ' telah diperbarui.' : 'Variabel baru ' + target + ' berhasil dibuat.'))
    } else {
      toast('Gagal recode: ' + (res.message || 'Periksa aturan recode.'))
    }
  }

  const handleSelectCases = (filterExp: string | null) => {
    pushUndo()
    const next = cloneDataset(dataset)
    if (!filterExp) {
      next.filteredRows = new Array(next.rows.length).fill(true)
      setDataset(next)
      toast('Filter dinonaktifkan: Seluruh responden diikutsertakan dalam analisis.')
      return
    }

    // Evaluate simple filter e.g. JK = 1 or Usia >= 20
    const m = filterExp.match(/^([A-Za-z0-9_]+)\s*(=|!=|>|<|>=|<=)\s*([0-9.,]+)$/)
    if (!m) {
      toast('Format filter tidak dikenali. Contoh: JK = 1 atau Usia >= 20')
      return
    }
    const varName = m[1]
    const op = m[2]
    const val = Number(m[3].replace(',', '.'))
    const colIdx = next.variables.findIndex((v) => v.name.toLowerCase() === varName.toLowerCase())
    if (colIdx < 0) {
      toast('Variabel ' + varName + ' tidak ditemukan di dataset.')
      return
    }

    next.filteredRows = next.rows.map((r) => {
      const v = r[colIdx]
      if (op === '=') return v === val
      if (op === '!=') return v !== val
      if (op === '>') return v > val
      if (op === '<') return v < val
      if (op === '>=') return v >= val
      if (op === '<=') return v <= val
      return true
    })

    const count = next.filteredRows.filter(Boolean).length
    setDataset(next)
    toast(`Filter aktif: ${count} dari ${next.rows.length} kasus terpilih untuk analisis.`)
  }

  const runResult = (result: AnalysisResult) => {
    setShowHint(false)
    const id = 'out-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    const node: OutputNode = {
      id,
      title: result.title,
      command: result.command,
      createdAt: Date.now(),
      blocks: result.blocks,
      interpretation: result.interpretation,
    }
    setOutputs((prev) => [node, ...prev])
    setSyntaxHistory((prev) => [...prev, result.syntax])
    setSelectedOutput(id)
    setView('output')
    setGuideOpen(false)
    toast(result.title + ' selesai! Hasil ditambahkan ke Output Viewer.')
  }

  const runSample = (kind: string) => {
    try {
      const numeric = dataset.variables.filter((v) => v.type === 'numeric' && v.name !== 'ID')
      const sampleScale = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi', 'Y_Keputusan']
        .filter((n) => dataset.variables.some((v) => v.name === n))
      const scaleVars = sampleScale.length ? sampleScale : numeric.map((v) => v.name)

      if (kind === 'regression') {
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : scaleVars[scaleVars.length - 1]
        const indeps = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n))
        runResult(runRegression(dataset, dep, indeps.length ? indeps : numeric.filter((v) => v.name !== dep).map((v) => v.name), { descriptives: true, collinearity: true, durbinWatson: true }))
      } else if (kind === 'assumptions') {
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : scaleVars[scaleVars.length - 1]
        const indeps = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n))
        runResult(runClassicalAssumptions(dataset, dep, indeps.length ? indeps : numeric.filter((v) => v.name !== dep).map((v) => v.name)))
      } else if (kind === 'validity') {
        runResult(runValidity(dataset, scaleVars, 0.05))
      } else if (kind === 'reliability') {
        const items = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n))
        runResult(runReliability(dataset, items.length >= 2 ? items : scaleVars.slice(0, 3), { scale: true, itemDeleted: true, itemStats: true }))
      } else if (kind === 'normality') {
        runResult(runNormality(dataset, scaleVars))
      } else if (kind === 'anova') {
        const factor = dataset.variables.some((v) => v.name === 'JK') ? 'JK' : dataset.variables[1]?.name
        runResult(runOneWayAnova(dataset, 'Y_Keputusan', factor))
      } else if (kind === 'paired') {
        const v1 = dataset.variables.some((v) => v.name === 'Pre_Test') ? 'Pre_Test' : (dataset.variables.some((v) => v.name === 'X1_Harga') ? 'X1_Harga' : scaleVars[0])
        const v2 = dataset.variables.some((v) => v.name === 'Post_Test') ? 'Post_Test' : (dataset.variables.some((v) => v.name === 'X2_Kualitas') ? 'X2_Kualitas' : scaleVars[1])
        runResult(runPairedT(dataset, v1, v2))
      } else if (kind === 'onesample') {
        runResult(runOneSample(dataset, ['Y_Keputusan'], 3.5))
      } else if (kind === 'independent') {
        runResult(runIndependentT(dataset, ['Y_Keputusan'], 'JK', 1, 2))
      } else if (kind === 'correlation') {
        runResult(runCorrelations(dataset, scaleVars, { method: 'pearson', tails: 2, flag: true }))
      } else if (kind === 'descriptives') {
        runResult(runDescriptives(dataset, scaleVars, DEFAULT_DESC_OPTIONS))
      } else if (kind === 'frequencies') {
        const freqVars = ['JK', 'X1_Harga'].filter((n) => dataset.variables.some((v) => v.name === n))
        runResult(runFrequencies(dataset, freqVars.length ? freqVars : [scaleVars[0]], { statistics: true, charts: 'bar' }))
      } else if (kind === 'crosstabs') {
        const row = dataset.variables.some((v) => v.name === 'JK') ? 'JK' : dataset.variables[1]?.name
        const col = dataset.variables.some((v) => v.name === 'X1_Harga') ? 'X1_Harga' : dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : dataset.variables[2]?.name
        runResult(runCrosstabs(dataset, row, col))
      }
    } catch (e) {
      toast('Tidak bisa dijalankan: ' + (e as Error).message)
    }
  }

  const downloadBlob = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleSaveAs = async (
    fileName: string,
    format: 'sav' | 'csv' | 'xlsx' | 'json',
    _saveLabels = true,
    usePicker = false
  ) => {
    const baseName = (fileName || dataset.name || 'Dataset').replace(/\.[^/.]+$/, '')
    let savedLocation = 'Folder Unduhan (Downloads) Komputer Anda'
    let formatDesc = 'SPSS Statistics Data File (*.sav)'

    if (format === 'sav') {
      formatDesc = 'IBM SPSS Statistics (*.sav) — 100% Asli Biner'
      const fullFileName = baseName + '.sav'
      const uint8 = exportSav({ ...dataset, name: fullFileName })
      if (usePicker && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fullFileName,
            types: [{ description: 'SPSS Statistics (*.sav)', accept: { 'application/x-spss-sav': ['.sav'] } }],
          })
          const writable = await handle.createWritable()
          await writable.write(uint8)
          await writable.close()
          savedLocation = `Folder Pilihan Komputer Anda (File: ${handle.name})`
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          downloadBlob(fullFileName, new Blob([uint8], { type: 'application/x-spss-sav' }))
        }
      } else {
        downloadBlob(fullFileName, new Blob([uint8], { type: 'application/x-spss-sav' }))
      }
      setDataset((prev) => ({ ...prev, name: fullFileName }))
      setSyntaxHistory((prev) => [...prev, `SAVE OUTFILE='${fullFileName}'.`])
      setSaveLocationModal({ fileName: fullFileName, locationText: savedLocation, formatText: formatDesc })
      toast(`File data SPSS "${fullFileName}" berhasil disimpan!`)
    } else if (format === 'xlsx') {
      formatDesc = 'Excel Workbook (*.xls / *.xlsx)'
      const fullFileName = baseName + '.xls'
      const xml = datasetToExcelXML(dataset)
      if (usePicker && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fullFileName,
            types: [{ description: 'Excel Spreadsheet (*.xls)', accept: { 'application/vnd.ms-excel': ['.xls'] } }],
          })
          const writable = await handle.createWritable()
          await writable.write(xml)
          await writable.close()
          savedLocation = `Folder Pilihan Komputer Anda (File: ${handle.name})`
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          downloadBlob(fullFileName, new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }))
        }
      } else {
        downloadBlob(fullFileName, new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' }))
      }
      setSaveLocationModal({ fileName: fullFileName, locationText: savedLocation, formatText: formatDesc })
      toast(`File Excel "${fullFileName}" berhasil disimpan!`)
    } else if (format === 'csv') {
      formatDesc = 'Comma Delimited (*.csv)'
      const fullFileName = baseName + '.csv'
      const header = dataset.variables.map((v) => csvEscape(v.name)).join(',')
      const rows = dataset.rows.map((r) => r.map(csvEscape).join(',')).join('\n')
      const text = header + '\n' + rows
      if (usePicker && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fullFileName,
            types: [{ description: 'CSV Data (*.csv)', accept: { 'text/csv': ['.csv'] } }],
          })
          const writable = await handle.createWritable()
          await writable.write(text)
          await writable.close()
          savedLocation = `Folder Pilihan Komputer Anda (File: ${handle.name})`
        } catch (e) {
          if ((e as Error).name === 'AbortError') return
          download(fullFileName, text, 'text/csv;charset=utf-8')
        }
      } else {
        download(fullFileName, text, 'text/csv;charset=utf-8')
      }
      setSaveLocationModal({ fileName: fullFileName, locationText: savedLocation, formatText: formatDesc })
      toast(`Data berhasil disimpan sebagai CSV ("${fullFileName}").`)
    } else if (format === 'json') {
      formatDesc = 'JSON Dataset (*.json)'
      const fullFileName = baseName + '.json'
      download(fullFileName, JSON.stringify(dataset, null, 2), 'application/json;charset=utf-8')
      setSaveLocationModal({ fileName: fullFileName, locationText: savedLocation, formatText: formatDesc })
      toast(`Backup JSON "${fullFileName}" berhasil disimpan!`)
    }
  }

  const saveSav = (name?: string) => {
    void handleSaveAs(name || dataset.name || 'Dataset.sav', 'sav', true, false)
  }

  const saveCSV = (name?: string) => {
    const baseName = (name || dataset.name || 'Dataset').replace(/\.[^/.]+$/, '')
    const fullFileName = baseName + '.csv'
    const header = dataset.variables.map((v) => csvEscape(v.name)).join(',')
    const rows = dataset.rows.map((r) => r.map(csvEscape).join(',')).join('\n')
    download(fullFileName, header + '\n' + rows, 'text/csv;charset=utf-8')
    if (name) {
      setDataset((prev) => ({ ...prev, name: baseName + '.sav' }))
    }
    toast(`Data berhasil disimpan sebagai CSV ("${fullFileName}").`)
  }

  const saveExcel = (name?: string) => {
    void handleSaveAs(name || dataset.name || 'Dataset.xls', 'xlsx', true, false)
  }

  const saveJSON = (name?: string) => {
    void handleSaveAs(name || dataset.name || 'Dataset.json', 'json', true, false)
  }

  const runSyntaxText = (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) { toast('Ketik sintaks SPSS terlebih dahulu.'); return }
    const upper = trimmed.toUpperCase()

    try {
      if (upper.includes('LOGISTIC')) {
        const binVar = dataset.variables.find((v) => {
          const vals = new Set(dataset.rows.map((r) => r[dataset.variables.indexOf(v)]))
          return vals.size === 2
        })?.name ?? dataset.variables[1]?.name
        const covars = dataset.variables.filter((v) => v.name !== binVar && v.name !== 'ID').map((v) => v.name)
        runResult(runLogisticRegression(dataset, binVar, covars.slice(0, 3)))
      } else if (upper.includes('UNIANOVA') || upper.includes('TWO-WAY') || upper.includes('TWOWAY')) {
        const dep = dataset.variables.find((v) => v.measure === 'Scale')?.name ?? dataset.variables[dataset.variables.length - 1].name
        const f1 = dataset.variables[1]?.name
        const f2 = dataset.variables[2]?.name
        runResult(runTwoWayAnova(dataset, dep, f1, f2))
      } else if (upper.includes('FACTOR')) {
        const vars = dataset.variables.filter((v) => v.name !== 'ID').map((v) => v.name)
        runResult(runFactorAnalysis(dataset, vars.slice(0, 4)))
      } else if (upper.includes('REGRESSION')) {
        runSample('regression')
      } else if (upper.includes('FREQUENCIES')) {
        runSample('frequencies')
      } else if (upper.includes('DESCRIPTIVES')) {
        runSample('descriptives')
      } else if (upper.includes('CORRELATIONS')) {
        runSample('correlation')
      } else if (upper.includes('T-TEST')) {
        runSample('independent')
      } else if (upper.includes('ONEWAY')) {
        runSample('anova')
      } else if (upper.includes('SAVE')) {
        saveSav()
      } else {
        toast('Sintaks dijalankan. Prosedur didukung: REGRESSION, LOGISTIC, UNIANOVA, FACTOR, FREQUENCIES, DESCRIPTIVES, CORRELATIONS, T-TEST, ONEWAY, SAVE.')
      }
    } catch (e) {
      toast('Gagal mengeksekusi sintaks: ' + (e as Error).message)
    }
  }

  const exportOutput = () => {
    if (!outputs.length) { toast('Belum ada output untuk diekspor.'); return }
    download('Output_SPSS_Skripsi_' + dataset.name.replace(/\.sav$/i, '') + '.html', outputToWordHTML(outputs, dataset), 'text/html;charset=utf-8')
    toast('Output diekspor! File dapat dibuka langsung di Microsoft Word untuk Bab IV Skripsi.')
  }

  const printOutput = () => {
    if (!outputs.length) { toast('Belum ada output untuk dicetak.'); return }
    setView('output')
    window.setTimeout(() => window.print(), 350)
  }

  const copyOutput = async () => {
    if (!outputs.length) { toast('Belum ada output untuk disalin.'); return }
    const text = outputs.map((node) => {
      const tables = node.blocks.filter((b) => b.kind === 'table').map((b) => {
        if (b.kind !== 'table') return ''
        return b.title + '\n' + b.columns.join('\t') + '\n' + b.rows.map((r) => r.join('\t')).join('\n')
      }).join('\n\n')
      return node.title + ' — ' + node.command + '\n' + (node.interpretation ? 'Pembahasan: ' + node.interpretation + '\n' : '') + tables
    }).join('\n\n===============\n\n')
    try {
      await navigator.clipboard.writeText(text)
      toast('Seluruh output teks berhasil disalin ke clipboard.')
    } catch {
      toast('Gunakan menu Ekspor untuk mengunduh dokumen Word / HTML.')
    }
  }

  const onImportFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const isSav = isSavFile(buffer) || file.name.toLowerCase().endsWith('.sav')
      if (isSav) {
        const parsed = parseSav(buffer, file.name)
        resetTo(parsed, `File data SPSS "${file.name}" berhasil dibuka (${parsed.rows.length} kasus, ${parsed.variables.length} variabel)!`)
        setSyntaxHistory((prev) => [...prev, `GET FILE='${file.name}'.`])
        setView('data')
        return
      }

      // Try CSV / text
      const dec = new TextDecoder('utf-8', { fatal: false })
      const text = dec.decode(buffer)
      const parsed = parseCSV(text)
      if (parsed) {
        parsed.name = file.name.replace(/\.[^/.]+$/, '') + '.sav'
        resetTo(parsed, `Data "${file.name}" berhasil diimpor (${parsed.rows.length} baris, ${parsed.variables.length} variabel).`)
        setSyntaxHistory((prev) => [...prev, `GET DATA /TYPE=TXT /FILE='${file.name}'.`])
        setView('data')
        return
      }

      throw new Error('File tidak dapat dikenali sebagai file SPSS (.sav) maupun CSV/Teks terstruktur.')
    } catch (e) {
      setInfo({
        title: 'Buka File SPSS / Data',
        message: `Gagal membuka file "${file.name}": ${(e as Error).message}\n\nPastikan file merupakan file asli IBM SPSS Statistics (*.sav) atau file tabel CSV dengan baris judul variabel.`,
      })
    }
  }

  const findTerm = (term: string) => {
    const t = term.trim()
    if (!t) return false
    const idIndex = dataset.variables.findIndex((v) => v.name === 'ID')
    const idMatch = dataset.rows.findIndex((r) => String(r[idIndex] ?? '') === t)
    let row = idMatch
    if (row < 0) {
      const num = Number(t.replace(',', '.'))
      row = dataset.rows.findIndex((r) => r.some((v) => Number.isFinite(num) && v === num))
    }
    if (row < 0) row = dataset.rows.findIndex((r) => r.some((v) => String(v).includes(t)))
    if (row < 0) return false
    setActiveRow(row + 1)
    setView('data')
    setDialog(null)
    toast('Ditemukan di baris ' + (row + 1) + '.')
    return true
  }

  const openDialog = (name: string) => {
    const map: Record<string, DialogName> = {
      descriptives: 'descriptives', frequencies: 'frequencies', correlation: 'correlation',
      regression: 'regression', reliability: 'reliability', validity: 'validity',
      onesample: 'onesample', independent: 'independent', paired: 'paired', anova: 'anova',
      normality: 'normality', assumptions: 'assumptions',
      mannwhitney: 'mannwhitney', wilcoxon: 'wilcoxon', kruskalwallis: 'kruskalwallis',
      crosstabs: 'crosstabs', compute: 'compute', recode: 'recode', select: 'select',
      sort: 'sort', find: 'find', about: 'about',
      partial: 'partial', power: 'power',
      saveas: 'saveas', datainfo: 'datainfo',
      logistic: 'logistic', twowayanova: 'twowayanova', factor: 'factor',
      replace: 'replace',
    }
    setGuideOpen(false)
    setDialog(map[name] ?? null)
  }

  const handleAction = (action: string) => {
    switch (action) {
      case 'file.new.sample':
      case 'file.open.sample':
      case 'file.reset':
        resetTo(createSurveyDataset(), 'Data contoh 100 responden dimuat ulang.')
        setView('data')
        break
      case 'file.new.empty':
        resetTo(emptyDataset(), 'Dataset kosong dibuat. Paste data dari Excel atau ketik langsung di Data View.')
        setView('data')
        break
      case 'file.new.syntax':
      case 'file.open.syntax':
        setView('syntax')
        toast('Membuka SPSS Syntax Editor.')
        break
      case 'file.new.output':
        setOutputs([])
        setSelectedOutput(null)
        setView('output')
        toast('Lembar Output baru dibuat.')
        break
      case 'file.open.output':
        setView('output')
        toast('Membuka SPSS Output Viewer.')
        break
      case 'file.open.data':
      case 'file.open.csv':
        fileRef.current?.click()
        break
      case 'file.save':
        saveSav()
        break
      case 'file.saveas':
        setDialog('saveas')
        break
      case 'file.export.sav':
        saveSav()
        break
      case 'file.export.excel':
        saveExcel()
        break
      case 'file.export.csv':
        saveCSV()
        break
      case 'file.export':
      case 'file.export.output':
        exportOutput()
        break
      case 'file.info.working':
        setDialog('datainfo')
        break
      case 'file.print': printOutput(); break
      case 'file.exit': window.location.hash = '#/'; break
      case 'edit.undo': undo(); break
      case 'edit.redo': redo(); break
      case 'edit.find':
      case 'edit.goto': setDialog('find'); break
      case 'edit.replace': setDialog('replace'); break
      case 'edit.clearcase': deleteCase(); break
      case 'data.deletevar': setView('variable'); toast('Di Variable View, klik tombol sampah merah pada variabel yang ingin dihapus.'); break
      case 'edit.copyoutput': void copyOutput(); break
      case 'view.data': setView('data'); break
      case 'view.variable': setView('variable'); break
      case 'view.output': setView('output'); break
      case 'view.syntax': setView('syntax'); break
      case 'view.labels': {
        const next = !valueLabels
        setValueLabels(next)
        setShowHint(false)
        toast(next ? 'Menampilkan label teks nilai (Value Labels).' : 'Menampilkan angka numerik.')
        break
      }
      case 'view.grid': setShowGrid((v) => !v); break
      case 'view.statusbar': setShowStatusBar((v) => !v); break
      case 'data.insertcase': addCase(); break
      case 'data.insertvar': addVariable(); setView('variable'); break
      case 'data.sort': setDialog('sort'); break
      case 'data.select': setDialog('select'); break
      case 'data.resetfilter': handleSelectCases(null); break
      case 'transform.compute': setDialog('compute'); break
      case 'transform.recode': setDialog('recode'); break
      case 'analyze.descriptives': setDialog('descriptives'); break
      case 'analyze.frequencies': setDialog('frequencies'); break
      case 'analyze.crosstabs': setDialog('crosstabs'); break
      case 'analyze.onesample': setDialog('onesample'); break
      case 'analyze.independent': setDialog('independent'); break
      case 'analyze.paired': setDialog('paired'); break
      case 'analyze.anova': setDialog('anova'); break
      case 'analyze.correlation': setDialog('correlation'); break
      case 'analyze.validity': setDialog('validity'); break
      case 'analyze.regression': setDialog('regression'); break
      case 'analyze.assumptions': setDialog('assumptions'); break
      case 'analyze.reliability': setDialog('reliability'); break
      case 'analyze.normality': setDialog('normality'); break
      case 'analyze.mannwhitney': setDialog('mannwhitney'); break
      case 'analyze.wilcoxon': setDialog('wilcoxon'); break
      case 'analyze.kruskalwallis': setDialog('kruskalwallis'); break
      case 'analyze.partial': setDialog('partial'); break
      case 'analyze.power': setDialog('power'); break
      case 'analyze.logistic': setDialog('logistic'); break
      case 'analyze.twowayanova': setDialog('twowayanova'); break
      case 'analyze.factor': setDialog('factor'); break
      case 'graph.bar':
      case 'graph.histogram':
        setDialog('frequencies')
        toast('Pilih variabel, lalu pilih diagram pada opsi Charts.')
        break
      case 'utilities.variables': setView('variable'); break
      case 'help.guide': setGuideOpen(true); break
      case 'help.reading':
        setInfo({
          title: 'Pedoman Membaca Output Skripsi (Bab IV)',
          message: 'Ringkasan standar kelulusan statistik skripsi kuantitatif:\n\n' +
            '1. Uji Validitas: Butir valid jika r hitung > r tabel dan Sig. < 0,05.\n' +
            '2. Uji Reliabilitas: Kuesioner reliabel jika Cronbach\'s Alpha >= 0,70 (atau >= 0,60).\n' +
            '3. Uji Normalitas: Data normal jika Sig. Kolmogorov-Smirnov atau Shapiro-Wilk > 0,05.\n' +
            '4. Multikolinearitas: Bebas multikolinearitas jika Tolerance >= 0,10 dan VIF <= 10,00.\n' +
            '5. Heteroskedastisitas: Bebas heteroskedastisitas jika Uji Glejser seluruh Sig. > 0,05.\n' +
            '6. Autokorelasi: Nilai Durbin-Watson sekitar 1,5–2,5 menandakan tidak ada autokorelasi.\n' +
            '7. Uji F (Simultan): Variabel X berpengaruh bersama-sama jika Sig. < 0,05.\n' +
            '8. Uji t (Parsial): Variabel X berpengaruh nyata terhadap Y jika Sig. < 0,05.\n' +
            '9. Koefisien Determinasi: R Square (0–1) menunjukkan proporsi pengaruh variabel X terhadap Y.',
        })
        break
      case 'help.about': setDialog('about'); break
      case 'agent.toggle':
        setAiOpen((prev) => !prev)
        break
      case 'agent.auto.thesis':
        setAiOpen(true)
        runSample('descriptives')
        runSample('validity')
        runSample('reliability')
        runSample('assumptions')
        runSample('regression')
        setView('output')
        toast('Analisis Skripsi Lengkap selesai dijalankan oleh Agent AI!')
        break
      case 'agent.auto.validity':
        setAiOpen(true)
        runSample('validity')
        runSample('reliability')
        setView('output')
        toast('Uji Validitas dan Reliabilitas selesai!')
        break
      case 'agent.auto.assumptions':
        setAiOpen(true)
        runSample('assumptions')
        setView('output')
        toast('Uji 4 Asumsi Klasik selesai!')
        break
      case 'agent.auto.regression':
        setAiOpen(true)
        runSample('regression')
        setView('output')
        toast('Regresi Linier Berganda selesai!')
        break
      case 'agent.mcp.guide':
        setInfo({
          title: 'Integrasi MCP (Model Context Protocol) & AI Agent',
          message: 'IBM SPSS Statistics Recreation ini telah dilengkapi dua jalur AI Agent:\n\n' +
            '1. AI Co-Pilot In-Page (Panel Kanan): Anda dapat mengetik instruksi langsung, mengklik tombol aksi cepat 1-klik, dan membiarkan agent menjalankan analisis statistik serta menyusun pembahasan Bab IV secara otomatis.\n\n' +
            '2. Global Programmatic API (window.__SPSS_AGENT_API__): AI Agent eksternal (seperti Antigravity, Puppeteer, Playwright, atau Chrome DevTools) dapat membaca dataset, memicu kalkulasi regresi/t-test/validitas, dan mengekspor dokumen Word secara instan.\n\n' +
            '3. Dedicated MCP Server: Terletak di d:\\spss\\mcp-server dengan protokol JSON-RPC stdio standar untuk dihubungkan ke Claude Desktop, Cursor, atau Antigravity.',
        })
        break
      default:
        if (action.startsWith('placeholder:')) {
          const name = action.replace('placeholder:', '')
          setInfo({
            title: 'IBM SPSS Statistics — ' + name,
            message: `Prosedur "${name}" merupakan fitur spesifik modul IBM SPSS Statistics Enterprise.\n\nUntuk analisis skripsi kuantitatif utama (Uji Kualitas Data, Prasyarat Regresi, Hipotesis, dan Komparasi), Anda dapat langsung menggunakan menu aktif:\n• Descriptive Statistics (Frequencies, Descriptives, Explore/Normalitas, Crosstabs)\n• Compare Means (One-Sample, Independent T, Paired T, One-Way ANOVA Tukey)\n• Correlate (Bivariate Pearson/Spearman/Kendall, Validitas Butir r-tabel)\n• Regression (Linear Regression, Uji Asumsi Klasik Lengkap)\n• Scale (Reliability Analysis Cronbach's Alpha)\n• Nonparametric Tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis).`,
          })
        } else if (action.startsWith('search.term:')) {
          const t = action.replace('search.term:', '')
          findTerm(t)
        } else {
          toast('Perintah siap digunakan.')
        }
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'z') { e.preventDefault(); undo() }
      else if (key === 'y') { e.preventDefault(); redo() }
      else if (key === 'f') { e.preventDefault(); setDialog('find') }
      else if (key === 'h') { e.preventDefault(); setDialog('replace') }
      else if (key === 's') {
        e.preventDefault()
        if (e.shiftKey) {
          setDialog('saveas')
        } else {
          saveSav()
        }
      }
      else if (key === 'o') { e.preventDefault(); fileRef.current?.click() }
      else if (key === 'r') { e.preventDefault(); runSyntaxText(syntaxDraft || syntaxHistory.join('\n\n')) }
      else if (key === 'n') { e.preventDefault(); resetTo(emptyDataset(), 'Dataset kosong dibuat.') }
      else if (key === 'p') { e.preventDefault(); printOutput() }
      else if (e.shiftKey && key === 'a') { e.preventDefault(); setAiOpen((prev) => !prev) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    (window as any).__SPSS_AGENT_API__ = {
      version: '1.0.0',
      getDataset: () => dataset,
      setDataset: (next: Dataset) => {
        pushUndo()
        setDataset(next)
      },
      getVariables: () => dataset.variables,
      getOutputs: () => outputs,
      getView: () => view,
      setView: (v: View) => setView(v),
      runAnalysis: (kind: string) => {
        runSample(kind)
      },
      runCustomResult: (res: AnalysisResult) => {
        runResult(res)
      },
      computeVariable: (target: string, label: string, expression: string) => {
        handleCompute(target, label, expression)
      },
      exportWord: () => exportOutput(),
      exportPdf: () => printOutput(),
      toggleAIPanel: (open?: boolean) => {
        setAiOpen((prev) => (open !== undefined ? open : !prev))
      },
      executeInstruction: (query: string) => {
        const q = query.toLowerCase()
        if (q.includes('skripsi') || q.includes('lengkap') || q.includes('semua uji')) {
          runSample('descriptives')
          runSample('validity')
          runSample('reliability')
          runSample('assumptions')
          runSample('regression')
          setView('output')
          return { success: true, message: 'Analisis skripsi lengkap dieksekusi.' }
        }
        if (q.includes('validitas') || q.includes('reliabilitas')) {
          runSample('validity')
          runSample('reliability')
          setView('output')
          return { success: true, message: 'Uji validitas & reliabilitas dieksekusi.' }
        }
        if (q.includes('asumsi') || q.includes('normalitas') || q.includes('hetero') || q.includes('kolin')) {
          runSample('assumptions')
          setView('output')
          return { success: true, message: 'Uji asumsi klasik dieksekusi.' }
        }
        if (q.includes('regresi') || q.includes('pengaruh') || q.includes('prediktor')) {
          runSample('regression')
          setView('output')
          return { success: true, message: 'Regresi linier berganda dieksekusi.' }
        }
        if (q.includes('t test') || q.includes('t-test') || q.includes('uji beda')) {
          runSample('independent')
          setView('output')
          return { success: true, message: 'Independent Samples T-Test dieksekusi.' }
        }
        if (q.includes('anova')) {
          runSample('anova')
          setView('output')
          return { success: true, message: 'One-Way ANOVA dieksekusi.' }
        }
        if (q.includes('word') || q.includes('ekspor') || q.includes('salin')) {
          exportOutput()
          return { success: true, message: 'Ekspor Word dieksekusi.' }
        }
        return { success: false, message: 'Instruksi tidak dikenali.' }
      },
    }
    return () => {
      delete (window as any).__SPSS_AGENT_API__
    }
  }, [dataset, outputs, view])

  const viewTitle = view === 'output' ? 'SPSS Statistics Viewer' : view === 'syntax' ? 'SPSS Syntax Editor' : 'IBM SPSS Statistics Data Editor'
  const activeVar = dataset.variables[0]
  const hasFilter = !!dataset.filteredRows?.some((f) => f === false)

  return (
    <div className="spss-app">
      <TitleBar
        title={viewTitle}
        datasetName={dataset.name}
        onExit={() => { window.location.hash = '#/' }}
        onNote={toast}
      />
      <MenuBar
        onAction={handleAction}
        valueLabels={valueLabels}
        showGridLines={showGrid}
        showStatusBar={showStatusBar}
        hasFilter={hasFilter}
      />
      <Toolbar onAction={handleAction} />

      <div className="spss-workspace-layout">
        <div className="spss-main">
        {view === 'data' && (
          <>
            {showHint && (
              <div className="spss-hint">
                <Icon name="info" size={15} />
                <span>
                  <strong>Siap untuk Skripsi:</strong> Data 100 responden sudah dimuat. Anda juga bisa <strong>copy-paste tabel data langsung dari Microsoft Excel</strong> ke sel Data View!
                </span>
                <button className="hint-action" onClick={() => setGuideOpen(true)}>Buka Panduan Skripsi</button>
                <button className="hint-close" onClick={() => setShowHint(false)} aria-label="Tutup petunjuk"><Icon name="close" size={12} /></button>
              </div>
            )}
            <DataEditor
              dataset={dataset}
              valueLabels={valueLabels}
              showGridLines={showGrid}
              activeRow={activeRow}
              onActiveRow={setActiveRow}
              onCellChange={onCellChange}
              onPasteBlock={onPasteBlock}
              onAddCase={addCase}
              onDeleteCase={deleteCase}
              onInteract={() => setShowHint(false)}
            />
          </>
        )}
        {view === 'variable' && (
          <VariableView
            dataset={dataset}
            onVariableChange={onVariableChange}
            onAddVariable={addVariable}
            onDeleteVariable={deleteVariable}
          />
        )}
        {view === 'output' && (
          <OutputViewer
            outputs={outputs}
            selectedId={selectedOutput}
            onSelect={setSelectedOutput}
            onDelete={() => { setOutputs([]); setSelectedOutput(null); toast('Semua output dibersihkan.') }}
            onExport={exportOutput}
            onPrint={printOutput}
            onRunSample={runSample}
          />
        )}
        {view === 'syntax' && (
          <div className="syntax-view">
            <div className="syntax-toolbar">
              <div>
                <strong>IBM SPSS Statistics Syntax Editor</strong>
                <span>Ketik perintah atau jalankan sintaks otomatis SPSS (Tekan Ctrl+R untuk eksekusi).</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="spss-tool-btn"
                  style={{ backgroundColor: '#0f62fe', color: '#fff', border: 'none', fontWeight: 'bold' }}
                  onClick={() => runSyntaxText(syntaxDraft || syntaxHistory.join('\n\n'))}
                >
                  <Icon name="check-circle" size={14} /> ▶ Run Syntax (Ctrl+R)
                </button>
                <button className="spss-tool-btn" onClick={() => {
                  navigator.clipboard.writeText(syntaxDraft || syntaxHistory.join('\n\n'))
                    .then(() => toast('Sintaks berhasil disalin ke clipboard.'))
                    .catch(() => toast('Browser memblokir clipboard.'))
                }}><Icon name="copy" size={14} /> Salin Sintaks</button>
              </div>
            </div>
            <div className="syntax-editor">
              <div className="syntax-gutter">
                {(syntaxDraft || syntaxHistory.join('\n')).split('\n').map((_, i) => <span key={i}>{i + 1}</span>)}
              </div>
              <textarea
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  padding: '8px 12px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  color: '#161616',
                  background: 'transparent',
                }}
                value={syntaxDraft || syntaxHistory.join('\n\n')}
                onChange={(e) => setSyntaxDraft(e.target.value)}
                placeholder="Ketik sintaks SPSS di sini, contoh: REGRESSION /DEPENDENT=Y_Keputusan /METHOD=ENTER X1_Harga X2_Kualitas."
              />
            </div>
          </div>
        )}
        </div>

        {aiOpen && (
          <AIAgentPanel
            dataset={dataset}
            setDataset={setDataset}
            runResult={runResult}
            outputs={outputs}
            setView={setView}
            onExportWord={exportOutput}
            onClose={() => setAiOpen(false)}
          />
        )}
      </div>

      <div className="spss-tabbar">
        <div className="spss-tabs" role="tablist" aria-label="Tab SPSS">
          <button role="tab" aria-selected={view === 'data'} className={'spss-tab' + (view === 'data' ? ' active' : '')} onClick={() => setView('data')}>
            <Icon name="table" size={14} /> Data View
          </button>
          <button role="tab" aria-selected={view === 'variable'} className={'spss-tab' + (view === 'variable' ? ' active' : '')} onClick={() => setView('variable')}>
            <Icon name="grid" size={14} /> Variable View
          </button>
          <button role="tab" aria-selected={view === 'output'} className={'spss-tab' + (view === 'output' ? ' active' : '')} onClick={() => setView('output')}>
            <Icon name="window" size={14} /> Output {outputs.length > 0 && <span className="tab-count">{outputs.length}</span>}
          </button>
          <button role="tab" aria-selected={view === 'syntax'} className={'spss-tab' + (view === 'syntax' ? ' active' : '')} onClick={() => setView('syntax')}>
            <Icon name="chart" size={14} /> Syntax
          </button>
        </div>
        <div className="spss-tab-meta">
          <span>{activeVar?.name ?? '—'} &bull; {dataset.rows.length} kasus {hasFilter ? '(Filter Aktif)' : ''}</span>
          <button className="tab-home" onClick={() => { window.location.hash = '#/' }}><Icon name="arrow-left" size={13} /> Landing Page</button>
        </div>
      </div>

      {showStatusBar && (
        <StatusBar
          activeRow={Math.min(activeRow, Math.max(1, dataset.rows.length))}
          totalRows={dataset.rows.length}
          vars={dataset.variables.length}
          view={view === 'output' ? 'Output Viewer' : view === 'syntax' ? 'Syntax Editor' : view === 'variable' ? 'Variable View' : 'Data View'}
          hasFilter={hasFilter}
        />
      )}

      {guideOpen && (
        <QuickGuide
          rows={dataset.rows.length}
          onClose={() => setGuideOpen(false)}
          onRun={runSample}
          onOpenDialog={openDialog}
          onReset={() => { resetTo(createSurveyDataset(), 'Data contoh skripsi dipulihkan.'); setGuideOpen(false) }}
        />
      )}

      {/* Analysis Dialogs */}
      {dialog === 'descriptives' && <DescriptivesDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'frequencies' && <FrequenciesDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'correlation' && <CorrelationsDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'regression' && <RegressionDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'reliability' && <ReliabilityDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'validity' && <ValidityDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'onesample' && <OneSampleDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'independent' && <IndependentDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'paired' && <PairedTDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'anova' && <OneWayAnovaDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'normality' && <NormalityDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'assumptions' && <ClassicalAssumptionsDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'mannwhitney' && <MannWhitneyDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'wilcoxon' && <WilcoxonDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'kruskalwallis' && <KruskalWallisDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'crosstabs' && <CrosstabsDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'partial' && <PartialCorrelationDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'power' && <PowerAnalysisDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'logistic' && <BinaryLogisticDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'twowayanova' && <TwoWayAnovaDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}
      {dialog === 'factor' && <FactorAnalysisDialog dataset={dataset} onClose={() => setDialog(null)} onRun={runResult} />}

      {/* Data Management Dialogs */}
      {dialog === 'compute' && <ComputeVariableDialog dataset={dataset} onClose={() => setDialog(null)} onCompute={handleCompute} />}
      {dialog === 'recode' && <RecodeDialog dataset={dataset} onClose={() => setDialog(null)} onRecode={handleRecode} />}
      {dialog === 'select' && <SelectCasesDialog dataset={dataset} onClose={() => setDialog(null)} onSelectCases={handleSelectCases} />}
      {dialog === 'sort' && <SortDialog dataset={dataset} onClose={() => setDialog(null)} onSort={sortCases} />}
      {dialog === 'find' && <FindDialog onClose={() => setDialog(null)} onFind={findTerm} />}
      {dialog === 'replace' && <ReplaceDialog dataset={dataset} onClose={() => setDialog(null)} onReplace={handleReplace} />}
      {dialog === 'about' && <AboutDialog onClose={() => setDialog(null)} />}
      {dialog === 'saveas' && <SaveDataAsDialog dataset={dataset} onClose={() => setDialog(null)} onSave={handleSaveAs} />}
      {dialog === 'datainfo' && <DataFileInfoDialog dataset={dataset} onClose={() => setDialog(null)} />}
      {saveLocationModal && (
        <SaveLocationModal
          fileName={saveLocationModal.fileName}
          locationText={saveLocationModal.locationText}
          formatText={saveLocationModal.formatText}
          onClose={() => setSaveLocationModal(null)}
        />
      )}
      {info && <InfoDialog title={info.title} message={info.message} onClose={() => setInfo(null)} />}

      {toastMsg && (
        <div className="spss-toast" role="status">
          <Icon name="check-circle" size={15} />
          <span>{toastMsg}</span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".sav,.csv,.txt,.xlsx,.xls,application/x-spss-sav,application/octet-stream,text/csv,text/plain,*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onImportFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
