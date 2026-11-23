import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChartSpec, OutputNode, TableSpec } from '../../lib/types'
import { Icon } from '../Icons'
import { ChartEditorDialog } from './Dialogs'

function isNumeric(s: string) {
  return /^-?(\d+([.,]\d+)?|[.,]\d+)\**$/.test(s.trim()) || s.trim() === '.'
}

function PPPlotChart({ block }: { block: ChartSpec }) {
  const points = block.points ?? []
  const W = 460
  const H = 400
  const m = { top: 24, right: 30, bottom: 50, left: 54 }
  const iw = W - m.left - m.right
  const ih = H - m.top - m.bottom

  return (
    <figure className="spss-chart ppplot-chart">
      <figcaption>{block.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={block.title}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1.0].map((t, i) => {
          const y = m.top + ih - t * ih
          const x = m.left + t * iw
          return (
            <g key={i}>
              <line x1={m.left} x2={m.left + iw} y1={y} y2={y} stroke="#e4e4e4" strokeDasharray="3 3" />
              <line x1={x} x2={x} y1={m.top} y2={m.top + ih} stroke="#e4e4e4" strokeDasharray="3 3" />
              <text x={m.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#525252">{t.toFixed(2)}</text>
              <text x={x} y={m.top + ih + 16} textAnchor="middle" fontSize="10" fill="#525252">{t.toFixed(2)}</text>
            </g>
          )
        })}
        {/* Main axes */}
        <line x1={m.left} x2={m.left} y1={m.top} y2={m.top + ih} stroke="#161616" strokeWidth="1" />
        <line x1={m.left} x2={m.left + iw} y1={m.top + ih} y2={m.top + ih} stroke="#161616" strokeWidth="1" />
        {/* Diagonal reference line */}
        <line x1={m.left} y1={m.top + ih} x2={m.left + iw} y2={m.top} stroke="#0f62fe" strokeWidth="1.5" />
        {/* Plotted residual points */}
        {points.map((p, i) => {
          const cx = m.left + p.x * iw
          const cy = m.top + ih - p.y * ih
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3}
              fill="#0f62fe"
              stroke="#ffffff"
              strokeWidth="0.8"
              opacity={0.85}
            />
          )
        })}
        {/* Axis labels */}
        <text x={m.left + iw / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="#161616">
          {block.xLabel ?? 'Observed Cum Prob'}
        </text>
        <text x={16} y={m.top + ih / 2} textAnchor="middle" fontSize="11" fill="#161616" transform={`rotate(-90 16 ${m.top + ih / 2})`}>
          {block.yLabel ?? 'Expected Cum Prob'}
        </text>
      </svg>
      {block.footnote && <p className="chart-note">{block.footnote}</p>}
    </figure>
  )
}

function StandardChartBlock({ block }: { block: ChartSpec }) {
  const [chartTitle, setChartTitle] = useState(block.title)
  const [barColor, setBarColor] = useState('#0f62fe')
  const [showLabels, setShowLabels] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  if (block.chartType === 'ppplot') {
    return <PPPlotChart block={block} />
  }

  const values = block.values ?? []
  const labels = block.labels ?? []
  const max = Math.max(1, ...values)
  const W = 680
  const H = 300
  const m = { top: 18, right: 24, bottom: 76, left: 54 }
  const iw = W - m.left - m.right
  const ih = H - m.top - m.bottom
  const step = iw / Math.max(1, labels.length)
  const barW = Math.min(58, step * 0.62)
  const ticks = 4

  return (
    <figure className="spss-chart" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <figcaption style={{ margin: 0, fontWeight: 'bold', fontSize: 13 }}>{chartTitle}</figcaption>
        <button
          className="spss-tool-btn"
          onClick={() => setIsEditing(true)}
          style={{ padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          title="Klik untuk kustomisasi judul, warna batang, dan label nilai diagram"
        >
          <Icon name="edit" size={12} /> Edit Diagram
        </button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chartTitle} onDoubleClick={() => setIsEditing(true)}>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = m.top + (ih * i) / ticks
          const val = max - (max * i) / ticks
          return (
            <g key={i}>
              <line x1={m.left} x2={W - m.right} y1={y} y2={y} stroke="#e0e0e0" />
              <text x={m.left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#525252">{Math.round(val)}</text>
            </g>
          )
        })}
        <line x1={m.left} x2={m.left} y1={m.top} y2={m.top + ih} stroke="#8d8d8d" />
        <line x1={m.left} x2={W - m.right} y1={m.top + ih} y2={m.top + ih} stroke="#8d8d8d" />
        {values.map((v, i) => {
          const h = (v / max) * ih
          const x = m.left + step * i + (step - barW) / 2
          return (
            <g key={i}>
              <rect x={x} y={m.top + ih - h} width={barW} height={h} fill={barColor} />
              {showLabels && (
                <text x={x + barW / 2} y={m.top + ih - h - 5} textAnchor="middle" fontSize="10" fill="#161616">{v}</text>
              )}
              <text
                x={x + barW / 2} y={m.top + ih + 12} textAnchor="end" fontSize="9.5" fill="#525252"
                transform={`rotate(-28 ${x + barW / 2} ${m.top + ih + 12})`}
              >
                {labels[i]}
              </text>
            </g>
          )
        })}
        <text x={m.left + iw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#525252">{block.xLabel ?? ''}</text>
        <text x={14} y={m.top + ih / 2} textAnchor="middle" fontSize="10" fill="#525252" transform={`rotate(-90 14 ${m.top + ih / 2})`}>{block.yLabel ?? 'Frequency'}</text>
      </svg>
      {block.footnote && <p className="chart-note">{block.footnote}</p>}
      {isEditing && (
        <ChartEditorDialog
          title={chartTitle}
          onClose={() => setIsEditing(false)}
          onSaveChart={(newTitle, newColor, newLabels) => {
            setChartTitle(newTitle)
            setBarColor(newColor)
            setShowLabels(newLabels)
          }}
        />
      )}
    </figure>
  )
}

function TableBlock({ block }: { block: TableSpec }) {
  const [copied, setCopied] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const hasScroll = el.scrollWidth > el.clientWidth + 2
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(hasScroll && el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  const scrollTable = (dir: 'left' | 'right') => {
    wrapRef.current?.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' })
  }

  const copyTableAsHtml = () => {
    let html = '<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">'
    html += '<caption><strong>' + block.title + '</strong></caption><thead>'
    if (block.groups) {
      html += '<tr>' + block.groups.map((g) => `<th colspan="${g.span}" bgcolor="#e8e8e8">${g.label}</th>`).join('') + '</tr>'
    }
    html += '<tr>' + block.columns.map((c) => `<th bgcolor="#e8e8e8">${c}</th>`).join('') + '</tr></thead><tbody>'
    block.rows.forEach((r) => {
      html += '<tr>' + r.map((c, idx) => `<td align="${idx === 0 || !isNumeric(c) ? 'left' : 'right'}">${c}</td>`).join('') + '</tr>'
    })
    html += '</tbody></table>'
    if (block.notes) {
      html += '<p style="font-size:10px;color:#555;">' + block.notes.join('<br>') + '</p>'
    }

    const onDone = () => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }

    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([block.title + '\n' + block.columns.join('\t') + '\n' + block.rows.map((r) => r.join('\t')).join('\n')], { type: 'text/plain' }),
      }),
    ]).then(onDone).catch(() => {
      // Fallback
      navigator.clipboard.writeText(block.title + '\n' + block.columns.join('\t') + '\n' + block.rows.map((r) => r.join('\t')).join('\n'))
      onDone()
    })
  }

  return (
    <div className="spss-table-block">
      <div className="spss-table-header-bar">
        <div className="spss-table-title">{block.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(canScrollLeft || canScrollRight) && (
            <div className="table-scroll-controls" style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="scroll-table-btn"
                onClick={() => scrollTable('left')}
                disabled={!canScrollLeft}
                title="Geser tabel ke kiri"
              >
                ◀ Kiri
              </button>
              <button
                type="button"
                className="scroll-table-btn"
                onClick={() => scrollTable('right')}
                disabled={!canScrollRight}
                title="Geser tabel ke kanan untuk melihat sisa kolom"
              >
                Kanan ▶
              </button>
            </div>
          )}
          <button className={'copy-table-btn' + (copied ? ' copied' : '')} onClick={copyTableAsHtml} title="Salin tabel berformat untuk langsung di-paste ke Microsoft Word (Bab IV Skripsi)">
            <Icon name={copied ? 'check-circle' : 'copy'} size={13} /> {copied ? 'Tersalin untuk Word!' : 'Salin untuk Word'}
          </button>
        </div>
      </div>
      <div
        ref={wrapRef}
        className={'spss-table-wrap' + (canScrollRight ? ' can-scroll-right' : '')}
      >
        <table className={'spss-table' + (block.compact ? ' compact' : '')}>
          <thead>
            {block.groups && (
              <tr className="group-row">
                {block.groups.map((g, i) => (
                  <th key={i} colSpan={g.span} className={g.label ? '' : 'empty'}>{g.label}</th>
                ))}
              </tr>
            )}
            <tr>
              {block.columns.map((c, i) => <th key={i}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className={block.highlightRows?.includes(r) ? 'highlight' : ''}>
                {row.map((cell, c) => (
                  <td key={c} className={c === 0 || !isNumeric(cell) ? 'text' : 'num'}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.notes && (
        <div className="spss-notes">
          {block.notes.map((n, i) => <p key={i}>{n}</p>)}
        </div>
      )}
    </div>
  )
}

interface OutputViewerProps {
  outputs: OutputNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: () => void
  onExport: () => void
  onPrint: () => void
  onRunSample: (kind: string) => void
}

export default function OutputViewer({
  outputs, selectedId, onSelect, onDelete, onExport, onPrint, onRunSample,
}: OutputViewerProps) {
  const scrollTo = (nodeId: string, blockId?: string) => {
    onSelect(nodeId)
    const target = blockId ? document.getElementById('block-' + nodeId + '-' + blockId) : document.getElementById('node-' + nodeId)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="output-view">
      <aside className="output-tree">
        <div className="tree-head">
          <Icon name="window" size={14} /> Output Viewer
        </div>
        <div className="tree-root">
          <button className="tree-root-btn" onClick={() => scrollTo(outputs[0]?.id ?? '')}>
            <Icon name="chevron-down" size={12} /> Output [Document1]
          </button>
          <ul>
            {outputs.map((node) => (
              <li key={node.id} className={selectedId === node.id ? 'active' : ''}>
                <button className="tree-node" onClick={() => scrollTo(node.id)}>
                  <Icon name="table" size={12} /> {node.title}
                </button>
                <ul>
                  {node.blocks.filter((b) => b.kind === 'table').map((b) => (
                    <li key={b.id}>
                      <button className="tree-child" onClick={() => scrollTo(node.id, b.id)}>{b.title}</button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <div className="tree-footer">
          <span>{outputs.length} hasil analisis</span>
          <button onClick={onDelete} disabled={!outputs.length}>Hapus Semua</button>
        </div>
      </aside>

      <div className="output-main">
        <div className="output-toolbar">
          <div className="output-toolbar-title">
            <strong>IBM SPSS Statistics Viewer</strong>
            <span>Output1 [Document1]</span>
          </div>
          <div className="output-toolbar-actions">
            <button className="spss-tool-btn" onClick={onExport} title="Ekspor seluruh output ke Word / HTML untuk Bab IV Skripsi">
              <Icon name="download" size={14} /> Ekspor untuk Word/HTML
            </button>
            <button className="spss-tool-btn" onClick={onPrint} title="Cetak output langsung ke PDF atau printer">
              <Icon name="print" size={14} /> Cetak / PDF
            </button>
          </div>
        </div>

        <div className="output-scroll">
          {outputs.length === 0 ? (
            <div className="output-empty">
              <div className="empty-icon"><Icon name="chart" size={38} /></div>
              <h3>Belum ada output analisis</h3>
              <p>
                Jalankan analisis statistik dari menu <strong>Analyze</strong> di bagian atas, atau klik salah satu analisis skripsi di bawah ini:
              </p>
              <div className="empty-actions">
                <button className="btn-spss-primary" onClick={() => onRunSample('regression')}>Regresi Berganda</button>
                <button className="btn-spss" onClick={() => onRunSample('assumptions')}>Uji Asumsi Klasik</button>
                <button className="btn-spss" onClick={() => onRunSample('validity')}>Uji Validitas</button>
                <button className="btn-spss" onClick={() => onRunSample('reliability')}>Uji Reliabilitas</button>
                <button className="btn-spss" onClick={() => onRunSample('normality')}>Uji Normalitas</button>
                <button className="btn-spss" onClick={() => onRunSample('anova')}>One-Way ANOVA</button>
                <button className="btn-spss" onClick={() => onRunSample('paired')}>Paired T-Test</button>
                <button className="btn-spss" onClick={() => onRunSample('correlation')}>Korelasi</button>
              </div>
              <div className="empty-help">
                <Icon name="info" size={16} />
                <span>Dataset sampel sudah memuat 100 responden dengan variabel kuesioner X1, X2, X3, Y, Pre-Test, Post-Test, dan Wilayah Kota.</span>
              </div>
            </div>
          ) : (
            <>
              {outputs.map((node) => (
                <section className={'output-node' + (selectedId === node.id ? ' selected' : '')} key={node.id} id={'node-' + node.id}>
                  <div className="output-node-head">
                    <div>
                      <span className="output-command">{node.command}</span>
                      <h3>{node.title}</h3>
                    </div>
                    <span className="output-time">
                      {new Date(node.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {node.interpretation && (
                    <div className="output-interpret">
                      <Icon name="info" size={18} />
                      <div>
                        <strong>Pedoman Membaca Hasil &amp; Pembahasan Skripsi (Bab IV):</strong>
                        <p style={{ whiteSpace: 'pre-line' }}>{node.interpretation}</p>
                      </div>
                    </div>
                  )}
                  {node.blocks.map((b) => (
                    <div key={b.id} id={'block-' + node.id + '-' + b.id}>
                      {b.kind === 'table' ? <TableBlock block={b} /> : <StandardChartBlock block={b} />}
                    </div>
                  ))}
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
