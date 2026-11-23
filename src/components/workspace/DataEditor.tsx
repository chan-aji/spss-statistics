import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dataset, Variable } from '../../lib/types'
import { Icon, MeasureIcon } from '../Icons'

interface DataEditorProps {
  dataset: Dataset
  valueLabels: boolean
  showGridLines: boolean
  activeRow: number
  onActiveRow: (row: number) => void
  onCellChange: (row: number, col: number, value: number) => void
  onPasteBlock?: (startRow: number, startCol: number, grid: number[][]) => void
  onAddCase: () => void
  onDeleteCase?: (row: number) => void
  onInteract?: () => void
}

function displayColumns(v: Variable) {
  return v.columns ?? v.width
}

function columnWidth(v: Variable) {
  const chars = Math.max(4, Math.min(20, displayColumns(v)))
  return Math.max(64, Math.min(190, chars * 8 + 26))
}

function formatValue(value: number, decimals: number) {
  if (!Number.isFinite(value)) return '.'
  if (decimals <= 0) return String(Math.round(value))
  return value.toFixed(decimals).replace('.', ',')
}

function cellLabel(v: Variable, value: number) {
  return v.values?.[value] ?? formatValue(value, v.decimals)
}

type Cell = { r: number; c: number }

export default function DataEditor({
  dataset, valueLabels, showGridLines, activeRow, onActiveRow, onCellChange, onPasteBlock, onAddCase, onDeleteCase, onInteract,
}: DataEditorProps) {
  const [sel, setSel] = useState<Cell>({ r: 0, c: 0 })
  const [editing, setEditing] = useState<Cell | null>(null)
  const [draft, setDraft] = useState('')
  const gridRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const widths = useMemo(() => dataset.variables.map(columnWidth), [dataset.variables])
  const totalWidth = 50 + widths.reduce((a, b) => a + b, 0)

  const clampCell = (r: number, c: number): Cell => ({
    r: Math.max(0, Math.min(Math.max(0, dataset.rows.length - 1), r)),
    c: Math.max(0, Math.min(Math.max(0, dataset.variables.length - 1), c)),
  })

  const selectCell = (r: number, c: number) => {
    const next = clampCell(r, c)
    setSel(next)
    onActiveRow(next.r + 1)
    onInteract?.()
    gridRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    const row = Math.max(0, Math.min(dataset.rows.length - 1, activeRow - 1))
    setSel((prev) => (prev.r === row ? prev : { ...prev, r: row }))
  }, [activeRow, dataset.rows.length])

  useEffect(() => {
    if (!dataset.rows.length) return
    const node = gridRef.current?.querySelector<HTMLElement>('[data-cell="' + sel.r + '-' + sel.c + '"]')
    node?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [sel, dataset.rows.length])

  useEffect(() => {
    if (editing) inputRef.current?.focus({ preventScroll: true })
  }, [editing])

  const startEdit = (r: number, c: number, initial?: string) => {
    if (!dataset.rows.length) return
    const value = dataset.rows[r]?.[c]
    setSel({ r, c })
    onActiveRow(r + 1)
    setEditing({ r, c })
    setDraft(initial !== undefined ? initial : formatValue(value, dataset.variables[c].decimals))
  }

  const commitEdit = (moveTo?: Cell) => {
    if (!editing) return
    const { r, c } = editing
    const v = dataset.variables[c]
    const parsed = Number(draft.replace(',', '.'))
    if (draft.trim() !== '' && Number.isFinite(parsed)) {
      const factor = Math.pow(10, Math.min(6, v.decimals))
      const rounded = v.decimals > 0 ? Math.round(parsed * factor) / factor : Math.round(parsed)
      if (rounded !== dataset.rows[r]?.[c]) onCellChange(r, c, rounded)
    }
    setEditing(null)
    if (moveTo) selectCell(moveTo.r, moveTo.c)
    else gridRef.current?.focus({ preventScroll: true })
  }

  const cancelEdit = () => {
    setEditing(null)
    gridRef.current?.focus({ preventScroll: true })
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (editing) return // Let input handle paste if editing a single cell
    const clip = e.clipboardData.getData('text/plain')
    if (!clip || !clip.includes('\t') && !clip.includes('\n')) return

    e.preventDefault()
    const lines = clip.trim().split(/\r?\n/)
    const grid: number[][] = []
    for (const line of lines) {
      const parts = line.split('\t')
      const rowNums = parts.map((p) => {
        const n = Number(p.replace(',', '.').trim())
        return Number.isFinite(n) ? n : 0
      })
      grid.push(rowNums)
    }
    if (grid.length && onPasteBlock) {
      onPasteBlock(sel.r, sel.c, grid)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return
    if (!dataset.rows.length) return
    const { r, c } = sel
    const rows = dataset.rows.length
    const cols = dataset.variables.length

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); selectCell(r - 1, c); break
      case 'ArrowDown': e.preventDefault(); selectCell(r + 1, c); break
      case 'ArrowLeft': e.preventDefault(); selectCell(r, c - 1); break
      case 'ArrowRight': e.preventDefault(); selectCell(r, c + 1); break
      case 'Home': e.preventDefault(); selectCell(e.ctrlKey ? 0 : r, 0); break
      case 'End': e.preventDefault(); selectCell(e.ctrlKey ? rows - 1 : r, cols - 1); break
      case 'PageUp': e.preventDefault(); selectCell(r - 12, c); break
      case 'PageDown': e.preventDefault(); selectCell(r + 12, c); break
      case 'Tab': e.preventDefault(); selectCell(r, c + (e.shiftKey ? -1 : 1)); break
      case 'Enter': e.preventDefault(); startEdit(r, c); break
      case 'F2': e.preventDefault(); startEdit(r, c); break
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        onCellChange(r, c, 0)
        break
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /\d|,|\.|-/.test(e.key)) {
          e.preventDefault()
          startEdit(r, c, e.key)
        }
    }
  }

  const activeVar = dataset.variables[sel.c]
  const activeValue = dataset.rows[sel.r]?.[sel.c]

  return (
    <div className={'data-editor' + (showGridLines ? '' : ' no-grid')}>
      <div className="data-refbar">
        <span className="cell-ref" title="Sel aktif (baris : variabel)">
          {dataset.rows.length ? sel.r + 1 : 0} : {activeVar?.name ?? '—'}
        </span>
        <span className="refbar-value">
          {activeVar && activeValue !== undefined
            ? (valueLabels && activeVar.values ? cellLabel(activeVar, activeValue) : formatValue(activeValue, activeVar.decimals))
            : ''}
        </span>
        <span className="refbar-spacer" />
        <span className="refbar-meta">
          {dataset.rows.length} kasus &bull; {dataset.variables.length} variabel
          {dataset.filteredRows && dataset.filteredRows.some((f) => f === false) && (
            <span className="refbar-filter-badge">Filter: AKTIF</span>
          )}
        </span>
      </div>
      <div
        className="data-scroll"
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="Data View — klik sel lalu ketik angka, atau paste langsung dari Excel"
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
      >
        <table className="data-table" style={{ width: totalWidth }}>
          <colgroup>
            <col style={{ width: 50 }} />
            {dataset.variables.map((v) => <col key={v.id} style={{ width: columnWidth(v) }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="corner" scope="col"><span>#</span></th>
              {dataset.variables.map((v, c) => (
                <th
                  key={v.id}
                  scope="col"
                  className={'var-head' + (sel.c === c ? ' active-col' : '')}
                  onClick={() => selectCell(0, c)}
                  title={v.name + (v.label ? ' [' + v.label + ']' : '')}
                >
                  <div className="var-head-inner">
                    <MeasureIcon measure={v.measure} size={13} />
                    <span className="var-name">{v.name}</span>
                  </div>
                  <span className="var-label">{v.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.rows.map((row, r) => {
              const isFilteredOut = dataset.filteredRows && dataset.filteredRows[r] === false
              return (
                <tr key={r} className={(sel.r === r ? 'active-row' : '') + (isFilteredOut ? ' filtered-row' : '')}>
                  <th
                    scope="row"
                    className={'row-num' + (sel.r === r ? ' active' : '') + (isFilteredOut ? ' is-filtered' : '')}
                    onClick={() => selectCell(r, sel.c)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      if (window.confirm(`Hapus responden kasus baris ${r + 1}?`)) {
                        onDeleteCase?.(r)
                      }
                    }}
                    title={isFilteredOut ? 'Kasus ' + (r + 1) + ' terfilter keluar (Klik kanan untuk hapus baris)' : 'Pilih baris ' + (r + 1) + ' (Klik kanan untuk hapus baris)'}
                  >
                    {isFilteredOut ? <span className="slash-filtered">{r + 1}</span> : r + 1}
                  </th>
                  {dataset.variables.map((v, c) => {
                    const isSel = sel.r === r && sel.c === c
                    const isEditing = editing?.r === r && editing?.c === c
                    const value = row[c]
                    const showLabel = valueLabels && !!v.values
                    return (
                      <td
                        key={v.id}
                        data-cell={r + '-' + c}
                        className={'data-cell' + (isSel ? ' selected' : '') + (isEditing ? ' editing' : '')}
                        onClick={() => selectCell(r, c)}
                        onDoubleClick={() => startEdit(r, c)}
                        title={showLabel ? cellLabel(v, value) : formatValue(value, v.decimals)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            className="cell-input"
                            value={draft}
                            inputMode={v.decimals === 0 ? 'numeric' : 'decimal'}
                            aria-label={v.name}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={() => commitEdit()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); commitEdit({ r: r + 1, c }) }
                              else if (e.key === 'Tab') { e.preventDefault(); commitEdit({ r, c: c + (e.shiftKey ? -1 : 1) }) }
                              else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
                            }}
                          />
                        ) : (
                          <span className={'cell-value' + (showLabel ? ' labelled' : '')}>
                            {showLabel ? cellLabel(v, value) : formatValue(value, v.decimals)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            <tr className="new-case-row">
              <th className="row-num new-case-num" onClick={onAddCase} title="Klik untuk menambah kasus baru">
                <span className="new-case-star">*</span>
              </th>
              {dataset.variables.map((v) => (
                <td key={v.id} className="new-case-cell" onClick={onAddCase} title="Tambah kasus baru" />
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ================= VARIABLE VIEW ================= */

interface VariableViewProps {
  dataset: Dataset
  onVariableChange: (index: number, patch: Partial<Variable>) => void
  onAddVariable: () => void
  onDeleteVariable?: (index: number) => void
}

function TextField({ value, onCommit, className }: { value: string; onCommit: (v: string) => void; className?: string }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      className={'vv-input ' + (className || '')}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft.trim() && draft !== value) onCommit(draft.trim()); else setDraft(value) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(value); e.currentTarget.blur() } }}
    />
  )
}

function NumberField({ value, min, max, onCommit, className }: { value: number; min: number; max: number; onCommit: (v: number) => void; className?: string }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) { setDraft(String(value)); return }
    const next = Math.max(min, Math.min(max, Math.round(parsed)))
    setDraft(String(next))
    if (next !== value) onCommit(next)
  }
  return (
    <input
      className={'vv-input vv-num ' + (className || '')}
      value={draft}
      inputMode="numeric"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(String(value)); e.currentTarget.blur() } }}
    />
  )
}

const LIKERT: Record<number, string> = {
  1: 'Sangat tidak setuju', 2: 'Tidak setuju', 3: 'Netral', 4: 'Setuju', 5: 'Sangat setuju',
}

function ValuesDialog({ variable, onClose, onSave }: {
  variable: Variable
  onClose: () => void
  onSave: (values: Record<number, string> | null) => void
}) {
  const codes = useMemo(() => {
    const found = new Set<number>([1, 2, 3, 4, 5])
    Object.keys(variable.values ?? {}).forEach((k) => found.add(Number(k)))
    return [...found].sort((a, b) => a - b)
  }, [variable.values])
  const [rows, setRows] = useState(() => codes.map((code) => ({ code, label: variable.values?.[code] ?? '' })))

  const setLabel = (i: number, label: string) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, label } : r)))
  const save = () => {
    const next: Record<number, string> = {}
    rows.forEach((r) => { if (r.label.trim()) next[r.code] = r.label.trim() })
    onSave(Object.keys(next).length ? next : null)
    onClose()
  }

  return (
    <div className="dlg-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dlg values-dlg" role="dialog" aria-modal="true" aria-label={'Value Labels — ' + variable.name}>
        <div className="dlg-titlebar">
          <span className="dlg-app-icon"><i /><i /><i /></span>
          <span className="dlg-title">Value Labels</span>
          <button className="dlg-close" onClick={onClose} aria-label="Tutup"><Icon name="close" size={13} /></button>
        </div>
        <div className="dlg-subtitle">Beri arti pada kode angka (misal skala Likert 1 = Sangat tidak setuju, 5 = Sangat setuju).</div>
        <div className="dlg-body">
          <div className="values-head">
            <span>Value</span><span>Label</span>
          </div>
          <div className="values-rows">
            {rows.map((row, i) => (
              <div className="values-row" key={row.code}>
                <input className="dlg-input values-code" value={row.code} readOnly aria-label={'Kode ' + row.code} />
                <input
                  className="dlg-input"
                  value={row.label}
                  placeholder={LIKERT[row.code] ?? ''}
                  onChange={(e) => setLabel(i, e.target.value)}
                  aria-label={'Label untuk nilai ' + row.code}
                />
              </div>
            ))}
          </div>
          <div className="values-actions">
            <button
              className="dlg-btn"
              onClick={() => setRows(codes.map((code) => ({ code, label: LIKERT[code] ?? '' })))}
            >
              Isi label Likert 1–5
            </button>
            <button className="dlg-btn" onClick={() => setRows(codes.map((code) => ({ code, label: '' })))}>Kosongkan</button>
          </div>
          <div className="dlg-hint">Label akan tampil di Data View saat menu View &rarr; Value Labels aktif.</div>
        </div>
        <div className="dlg-footer">
          <span className="dlg-footer-spacer" />
          <button className="dlg-btn dlg-btn-primary" onClick={save}>OK</button>
          <button className="dlg-btn" onClick={onClose}>Batal</button>
        </div>
      </div>
    </div>
  )
}

export function VariableView({ dataset, onVariableChange, onAddVariable, onDeleteVariable }: VariableViewProps) {
  const [valuesFor, setValuesFor] = useState<number | null>(null)

  return (
    <div className="variable-view">
      <div className="data-refbar">
        <span className="cell-ref cell-ref-wide">Variable View</span>
        <span className="refbar-spacer" />
        <span className="refbar-meta">Klik sel untuk mengubah sifat variabel &bull; Name harus tanpa spasi</span>
      </div>
      <div className="data-scroll">
        <table className="variable-table">
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 68 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 230 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 74 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 84 }} />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="vv-corner" />
              {['Name', 'Type', 'Width', 'Decimals', 'Label', 'Values', 'Missing', 'Columns', 'Align', 'Measure', 'Role', 'Del'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.variables.map((v, i) => (
              <tr key={v.id}>
                <th className="vv-row-num">{i + 1}</th>
                <td><TextField value={v.name} onCommit={(name) => onVariableChange(i, { name: name.replace(/\s+/g, '_') })} className="vv-name" /></td>
                <td><span className="vv-static">Numeric</span></td>
                <td><NumberField value={v.width} min={1} max={40} onCommit={(width) => onVariableChange(i, { width })} /></td>
                <td><NumberField value={v.decimals} min={0} max={6} onCommit={(decimals) => onVariableChange(i, { decimals })} /></td>
                <td><TextField value={v.label} onCommit={(label) => onVariableChange(i, { label })} className="vv-label" /></td>
                <td>
                  <button
                    className={'vv-dots' + (v.values ? ' has-values' : '')}
                    onClick={() => setValuesFor(i)}
                    title={v.values ? Object.entries(v.values).map(([k, val]) => k + ' = ' + val).join('\n') : 'Belum ada label nilai'}
                  >
                    <span className="vv-dots-text">
                      {v.values ? Object.entries(v.values).map(([k, val]) => k + ' = ' + val).join(', ') : 'None'}
                    </span>
                    <span className="vv-dots-btn">…</span>
                  </button>
                </td>
                <td><span className="vv-static">{v.missing}</span></td>
                <td><NumberField value={displayColumns(v)} min={4} max={20} onCommit={(columns) => onVariableChange(i, { columns })} /></td>
                <td>
                  <select className="vv-select" value={v.align} onChange={(e) => onVariableChange(i, { align: e.target.value as Variable['align'] })}>
                    <option>Left</option><option>Right</option><option>Center</option>
                  </select>
                </td>
                <td>
                  <div className="vv-measure-cell">
                    <MeasureIcon measure={v.measure} size={14} />
                    <select className="vv-select" value={v.measure} onChange={(e) => onVariableChange(i, { measure: e.target.value as Variable['measure'] })}>
                      <option value="Scale">Scale</option>
                      <option value="Ordinal">Ordinal</option>
                      <option value="Nominal">Nominal</option>
                    </select>
                  </div>
                </td>
                <td>
                  <select className="vv-select" value={v.role} onChange={(e) => onVariableChange(i, { role: e.target.value as Variable['role'] })}>
                    <option>Input</option><option>Target</option><option>Both</option><option>None</option>
                  </select>
                </td>
                <td>
                  <button
                    className="vv-del-btn"
                    onClick={() => onDeleteVariable?.(i)}
                    title={'Hapus variabel ' + v.name}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#da1e28', padding: '2px 6px' }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="vv-new-row">
              <th className="vv-row-num">*</th>
              <td colSpan={12}>
                <button className="add-case-link" onClick={onAddVariable}><Icon name="plus" size={13} /> Tambah variabel baru</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="vv-note">
        <Icon name="info" size={14} />
        <span>Di Variable View, atur nama kolom, label deskripsi, skala pengukuran (Scale/Ordinal/Nominal), dan arti kode Likert pada kolom Values (klik tombol …).</span>
      </div>
      {valuesFor !== null && dataset.variables[valuesFor] && (
        <ValuesDialog
          variable={dataset.variables[valuesFor]}
          onClose={() => setValuesFor(null)}
          onSave={(values) => onVariableChange(valuesFor, { values })}
        />
      )}
    </div>
  )
}
