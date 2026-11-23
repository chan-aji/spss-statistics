import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { AnalysisResult, Dataset, Variable } from '../../lib/types'
import {
  runCorrelations, runCrosstabs, runDescriptives, runFrequencies, runIndependentT,
  runOneSample, runOneWayAnova, runPairedT, runRegression, runReliability, runValidity,
  runNormality, runClassicalAssumptions, runMannWhitney, runWilcoxon, runKruskalWallis,
  runPowerAnalysis, runPartialCorrelation,
  runLogisticRegression, runTwoWayAnova, runFactorAnalysis,
  DEFAULT_DESC_OPTIONS, type DescOptions,
} from '../../lib/analyses'
import { executeComputeVariable, executeRecode, type RecodeRule } from '../../lib/data'
import { Icon, MeasureIcon } from '../Icons'

export interface DialogProps {
  dataset: Dataset
  onClose: () => void
  onRun: (result: AnalysisResult) => void
}

function DialogShell({
  title, subtitle, children, footer, onClose, width = 720,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer: ReactNode
  onClose: () => void
  width?: number
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="dlg-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dlg" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dlg-titlebar">
          <span className="dlg-app-icon"><i /><i /><i /></span>
          <span className="dlg-title">{title}</span>
          <button className="dlg-close" onClick={onClose} aria-label="Tutup"><Icon name="close" size={13} /></button>
        </div>
        {subtitle && <div className="dlg-subtitle">{subtitle}</div>}
        <div className="dlg-body">{children}</div>
        <div className="dlg-footer">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}

function DlgButtons({ onReset, onClose, onOk, okLabel = 'OK' }: { onReset?: () => void; onClose: () => void; onOk: () => void; okLabel?: string }) {
  return (
    <>
      {onReset && <button className="dlg-btn" onClick={onReset}>Reset</button>}
      <span className="dlg-footer-spacer" />
      <button className="dlg-btn dlg-btn-primary" onClick={onOk}>{okLabel}</button>
      <button className="dlg-btn" onClick={onClose}>Batal</button>
    </>
  )
}

function ErrorLine({ error }: { error: string }) {
  return error ? <div className="dlg-error"><Icon name="info" size={14} /> {error}</div> : null
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="dlg-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function Radio({ label, checked, onChange, name }: { label: string; checked: boolean; onChange: () => void; name: string }) {
  return (
    <label className="dlg-check">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

export function TransferList({
  variables, selected, onChange, single = false, height = 200, titleTarget = 'Variabel yang dipilih',
}: {
  variables: Dataset['variables']
  selected: string[]
  onChange: (names: string[]) => void
  single?: boolean
  height?: number
  titleTarget?: string
}) {
  const [highlight, setHighlight] = useState<string | null>(null)
  const source = variables.filter((v) => !selected.includes(v.name))
  const target = selected.map((n) => variables.find((v) => v.name === n)).filter(Boolean) as Dataset['variables']

  const add = () => {
    if (!highlight) return
    onChange(single ? [highlight] : [...selected, highlight])
    setHighlight(null)
  }
  const remove = (name: string) => onChange(selected.filter((n) => n !== name))

  return (
    <div className="transfer">
      <div className="transfer-side">
        <div className="transfer-label">Variabel:</div>
        <div className="transfer-list" style={{ height }}>
          {source.map((v) => (
            <button
              key={v.id}
              className={'transfer-item' + (highlight === v.name ? ' highlighted' : '')}
              onClick={() => setHighlight(v.name)}
              onDoubleClick={() => { onChange(single ? [v.name] : [...selected, v.name]); setHighlight(null) }}
              title={v.name + (v.label ? ' [' + v.label + ']' : '')}
            >
              <MeasureIcon measure={v.measure} size={14} />
              <span className="transfer-name">{v.name}</span>
              <span className="transfer-desc">{v.label}</span>
            </button>
          ))}
          {!source.length && <div className="transfer-empty">Semua variabel telah dipilih</div>}
        </div>
      </div>
      <div className="transfer-arrows">
        <button className="dlg-btn dlg-arrow" onClick={add} disabled={!highlight} title="Pindahkan ke daftar terpilih">
          <Icon name="arrow-right" size={14} />
        </button>
        <button
          className="dlg-btn dlg-arrow"
          onClick={() => { if (target.length) remove(target[target.length - 1].name) }}
          disabled={!target.length}
          title="Keluarkan dari daftar terpilih"
        >
          <Icon name="arrow-left" size={14} />
        </button>
      </div>
      <div className="transfer-side">
        <div className="transfer-label">{titleTarget}:</div>
        <div className="transfer-list" style={{ height }}>
          {target.map((v) => (
            <button key={v.id} className="transfer-item chosen" onClick={() => remove(v.name)} title="Klik untuk mengeluarkan">
              <MeasureIcon measure={v.measure} size={14} />
              <span className="transfer-name">{v.name}</span>
              <span className="transfer-desc">{v.label}</span>
              <Icon name="close" size={11} />
            </button>
          ))}
          {!target.length && <div className="transfer-empty">Belum ada variabel dipilih</div>}
        </div>
      </div>
    </div>
  )
}

/* ================= 1. DESCRIPTIVES ================= */

export function DescriptivesDialog({ dataset, onClose, onRun }: DialogProps) {
  const scale = dataset.variables.filter((v) => v.name !== 'ID').map((v) => v.name)
  const [selected, setSelected] = useState<string[]>(scale)
  const [opts, setOpts] = useState<DescOptions>({ ...DEFAULT_DESC_OPTIONS })
  const [error, setError] = useState('')
  const setOpt = (k: keyof DescOptions) => (v: boolean) => setOpts((o) => ({ ...o, [k]: v }))

  const run = () => {
    try { onRun(runDescriptives(dataset, selected, opts)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Descriptives"
      subtitle="Menghitung statistik deskriptif: mean, standar deviasi, min, max, varians, dan sebaran."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(scale); setOpts({ ...DEFAULT_DESC_OPTIONS }); setError('') }} onClose={onClose} onOk={run} />}
    >
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} titleTarget="Variable(s)" />
      <fieldset className="dlg-fieldset">
        <legend>Options — Statistik yang Dihitung</legend>
        <div className="dlg-grid-3">
          <Check label="Mean" checked={opts.mean} onChange={setOpt('mean')} />
          <Check label="Std. deviation" checked={opts.stddev} onChange={setOpt('stddev')} />
          <Check label="Minimum" checked={opts.min} onChange={setOpt('min')} />
          <Check label="Maximum" checked={opts.max} onChange={setOpt('max')} />
          <Check label="Variance" checked={opts.variance} onChange={setOpt('variance')} />
          <Check label="Range" checked={opts.range} onChange={setOpt('range')} />
          <Check label="Sum" checked={opts.sum} onChange={setOpt('sum')} />
          <Check label="Skewness" checked={opts.skewness} onChange={setOpt('skewness')} />
          <Check label="Kurtosis" checked={opts.kurtosis} onChange={setOpt('kurtosis')} />
          <Check label="S.E. mean" checked={opts.seMean} onChange={setOpt('seMean')} />
        </div>
      </fieldset>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 2. FREQUENCIES ================= */

export function FrequenciesDialog({ dataset, onClose, onRun }: DialogProps) {
  const initial = ['JK', 'Y_Keputusan'].filter((n) => dataset.variables.some((v) => v.name === n))
  const [selected, setSelected] = useState<string[]>(initial)
  const [statistics, setStatistics] = useState(true)
  const [charts, setCharts] = useState<'none' | 'bar' | 'histogram'>('bar')
  const [error, setError] = useState('')
  const run = () => {
    try { onRun(runFrequencies(dataset, selected, { statistics, charts })); onClose() }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <DialogShell
      title="Frequencies"
      subtitle="Menghitung tabel frekuensi dan persentase kategori data responden."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(initial); setStatistics(true); setCharts('bar'); setError('') }} onClose={onClose} onOk={run} />}
    >
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} titleTarget="Variable(s)" />
      <div className="dlg-row">
        <fieldset className="dlg-fieldset half">
          <legend>Statistics</legend>
          <Check label="Tampilkan ringkasan statistik (Mean, SD, Min, Max)" checked={statistics} onChange={setStatistics} />
        </fieldset>
        <fieldset className="dlg-fieldset half">
          <legend>Charts</legend>
          <Radio name="freqchart" label="None" checked={charts === 'none'} onChange={() => setCharts('none')} />
          <Radio name="freqchart" label="Bar charts" checked={charts === 'bar'} onChange={() => setCharts('bar')} />
          <Radio name="freqchart" label="Histograms" checked={charts === 'histogram'} onChange={() => setCharts('histogram')} />
        </fieldset>
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 3. CORRELATIONS ================= */

export function CorrelationsDialog({ dataset, onClose, onRun }: DialogProps) {
  const all = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi', 'Y_Keputusan'].filter((n) => dataset.variables.some((v) => v.name === n))
  const [selected, setSelected] = useState<string[]>(all)
  const [method, setMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson')
  const [tails, setTails] = useState<1 | 2>(2)
  const [flag, setFlag] = useState(true)
  const [error, setError] = useState('')
  const run = () => {
    try { onRun(runCorrelations(dataset, selected, { method, tails, flag })); onClose() }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <DialogShell
      title="Bivariate Correlations"
      subtitle="Menguji kekuatan dan arah korelasi linier antar variabel (Pearson, Spearman, atau Kendall)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(all); setMethod('pearson'); setTails(2); setFlag(true); setError('') }} onClose={onClose} onOk={run} />}
    >
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} titleTarget="Variables" />
      <div className="dlg-row">
        <fieldset className="dlg-fieldset half">
          <legend>Correlation Coefficients</legend>
          <Radio name="corrmethod" label="Pearson (interval / rasio)" checked={method === 'pearson'} onChange={() => setMethod('pearson')} />
          <Radio name="corrmethod" label="Kendall's tau-b (ordinal)" checked={method === 'kendall'} onChange={() => setMethod('kendall')} />
          <Radio name="corrmethod" label="Spearman (ordinal rank)" checked={method === 'spearman'} onChange={() => setMethod('spearman')} />
        </fieldset>
        <fieldset className="dlg-fieldset half">
          <legend>Test of Significance</legend>
          <Radio name="corrtail" label="Two-tailed (dua arah)" checked={tails === 2} onChange={() => setTails(2)} />
          <Radio name="corrtail" label="One-tailed (satu arah)" checked={tails === 1} onChange={() => setTails(1)} />
          <Check label="Flag significant correlations (* / **)" checked={flag} onChange={setFlag} />
        </fieldset>
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 4. REGRESSION ================= */

export function RegressionDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const defaultDep = vars.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : (vars[vars.length - 1]?.name ?? '')
  const sampleIndeps = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => vars.some((v) => v.name === n))
  const defaultIndeps = sampleIndeps.length ? sampleIndeps : vars.filter((v) => v.name !== defaultDep).map((v) => v.name)
  const [dep, setDep] = useState(defaultDep)
  const [indeps, setIndeps] = useState<string[]>(defaultIndeps)
  const [descriptives, setDescriptives] = useState(true)
  const [collinearity, setCollinearity] = useState(true)
  const [durbinWatson, setDurbinWatson] = useState(true)
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runRegression(dataset, dep, indeps, { descriptives, collinearity, durbinWatson })); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Linear Regression"
      subtitle="Regresi linear sederhana & berganda: koefisien determinasi R², uji simultan F, uji parsial t, dan multikolinearitas."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setDep(defaultDep); setIndeps(defaultIndeps); setDescriptives(true); setCollinearity(true); setDurbinWatson(true); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label htmlFor="dep-var">Dependent:</label>
        <select
          id="dep-var" className="dlg-select" value={dep}
          onChange={(e) => { setDep(e.target.value); setIndeps((prev) => prev.filter((n) => n !== e.target.value)) }}
        >
          {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <TransferList variables={vars.filter((v) => v.name !== dep)} selected={indeps} onChange={setIndeps} height={150} titleTarget="Independent(s)" />
      <fieldset className="dlg-fieldset">
        <legend>Statistics</legend>
        <div className="dlg-grid-3">
          <Check label="Estimates & Model fit" checked onChange={() => undefined} />
          <Check label="Descriptives" checked={descriptives} onChange={setDescriptives} />
          <Check label="Collinearity diagnostics (VIF/Tol)" checked={collinearity} onChange={setCollinearity} />
          <Check label="Durbin-Watson (Autokorelasi)" checked={durbinWatson} onChange={setDurbinWatson} />
        </div>
      </fieldset>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 5. RELIABILITY ================= */

export function ReliabilityDialog({ dataset, onClose, onRun }: DialogProps) {
  const initial = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n))
  const [selected, setSelected] = useState<string[]>(initial)
  const [scale, setScale] = useState(true)
  const [itemDeleted, setItemDeleted] = useState(true)
  const [itemStats, setItemStats] = useState(true)
  const [error, setError] = useState('')
  const run = () => {
    try { onRun(runReliability(dataset, selected, { scale, itemDeleted, itemStats })); onClose() }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <DialogShell
      title="Reliability Analysis"
      subtitle="Menguji konsistensi internal kuesioner penelitian dengan Cronbach's Alpha dan item-total."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(initial); setScale(true); setItemDeleted(true); setItemStats(true); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Model:</label>
        <select className="dlg-select" value="alpha" onChange={() => undefined}>
          <option value="alpha">Alpha (Cronbach's Alpha)</option>
        </select>
      </div>
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} height={150} titleTarget="Items" />
      <fieldset className="dlg-fieldset">
        <legend>Descriptives for</legend>
        <div className="dlg-grid-3">
          <Check label="Item" checked={itemStats} onChange={setItemStats} />
          <Check label="Scale" checked={scale} onChange={setScale} />
          <Check label="Scale if item deleted" checked={itemDeleted} onChange={setItemDeleted} />
        </div>
      </fieldset>
      <div className="dlg-hint">Standar skripsi: Cronbach's Alpha ≥ 0,70 menandakan kuesioner konsisten dan reliabel.</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 6. VALIDITAS BUTIR (R-TABEL) ================= */

export function ValidityDialog({ dataset, onClose, onRun }: DialogProps) {
  const initial = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi', 'Y_Keputusan'].filter((n) => dataset.variables.some((v) => v.name === n))
  const [selected, setSelected] = useState<string[]>(initial)
  const [alpha, setAlpha] = useState('0.05')
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runValidity(dataset, selected, Number(alpha))); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Uji Validitas Butir Pertanyaan (r hitung vs r tabel)"
      subtitle="Membandingkan korelasi Pearson setiap butir dengan r-tabel pada taraf signifikansi 5% (atau 1%)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(initial); setAlpha('0.05'); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Taraf Signifikansi (α):</label>
        <select className="dlg-select" value={alpha} onChange={(e) => setAlpha(e.target.value)}>
          <option value="0.05">α = 0,05 (Standar Skripsi)</option>
          <option value="0.01">α = 0,01 (Ketat)</option>
        </select>
      </div>
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} height={160} titleTarget="Butir Kuesioner" />
      <div className="dlg-hint">Kriteria: Butir instrumen dinyatakan VALID jika nilai r hitung &gt; r tabel dan Sig. &lt; 0,05.</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 7. ONE-SAMPLE T TEST ================= */

export function OneSampleDialog({ dataset, onClose, onRun }: DialogProps) {
  const [selected, setSelected] = useState<string[]>(['Y_Keputusan'])
  const [testValue, setTestValue] = useState('3')
  const [error, setError] = useState('')
  const run = () => {
    const tv = Number(testValue.replace(',', '.'))
    if (!Number.isFinite(tv)) { setError('Nilai uji harus berupa angka.'); return }
    try { onRun(runOneSample(dataset, selected, tv)); onClose() }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <DialogShell
      title="One-Sample T Test"
      subtitle="Membandingkan rata-rata sampel dengan nilai acuan populasi (Test Value)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(['Y_Keputusan']); setTestValue('3'); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label htmlFor="test-value">Test Value:</label>
        <input id="test-value" className="dlg-input" value={testValue} onChange={(e) => setTestValue(e.target.value)} inputMode="decimal" />
      </div>
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} height={160} titleTarget="Test Variable(s)" />
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 8. INDEPENDENT T TEST ================= */

export function IndependentDialog({ dataset, onClose, onRun }: DialogProps) {
  const candidates = dataset.variables.filter((v) => v.name !== 'ID')
  const groupCandidates = dataset.variables.filter((v) => {
    const uniq = new Set(dataset.rows.map((r) => r[dataset.variables.indexOf(v)]))
    return uniq.size >= 2 && uniq.size <= 4
  })
  const [testVars, setTestVars] = useState<string[]>(['Y_Keputusan'])
  const [groupVar, setGroupVar] = useState(groupCandidates[0]?.name ?? 'JK')
  const groupIndex = dataset.variables.findIndex((v) => v.name === groupVar)
  const uniq = [...new Set(dataset.rows.map((r) => r[groupIndex]))].sort((a, b) => a - b)
  const [g1, setG1] = useState(String(uniq[0] ?? 1))
  const [g2, setG2] = useState(String(uniq[1] ?? 2))
  const [error, setError] = useState('')
  const labels = dataset.variables.find((v) => v.name === groupVar)?.values

  const changeGroup = (name: string) => {
    setGroupVar(name)
    const i = dataset.variables.findIndex((v) => v.name === name)
    const u = [...new Set(dataset.rows.map((r) => r[i]))].sort((a, b) => a - b)
    setG1(String(u[0] ?? 1))
    setG2(String(u[1] ?? 2))
  }

  const run = () => {
    const a = Number(g1)
    const b = Number(g2)
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) { setError('Isi dua nilai grup yang berbeda.'); return }
    try { onRun(runIndependentT(dataset, testVars, groupVar, a, b)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Independent-Samples T Test"
      subtitle="Membandingkan perbedaan rata-rata antara dua kelompok independen (misal: Laki-laki vs Perempuan)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setTestVars(['Y_Keputusan']); changeGroup(groupCandidates[0]?.name ?? 'JK'); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label htmlFor="group-var">Grouping Variable:</label>
        <select id="group-var" className="dlg-select" value={groupVar} onChange={(e) => changeGroup(e.target.value)}>
          {groupCandidates.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-group-values">
        <span>Define Groups:</span>
        <label>Group 1: <input className="dlg-input sm" value={g1} onChange={(e) => setG1(e.target.value)} /></label>
        <span className="dlg-group-label">{labels?.[Number(g1)] ?? ''}</span>
        <label>Group 2: <input className="dlg-input sm" value={g2} onChange={(e) => setG2(e.target.value)} /></label>
        <span className="dlg-group-label">{labels?.[Number(g2)] ?? ''}</span>
      </div>
      <TransferList variables={candidates.filter((v) => v.name !== groupVar)} selected={testVars} onChange={setTestVars} height={140} titleTarget="Test Variable(s)" />
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 9. PAIRED T TEST ================= */

export function PairedTDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const defaultV1 = vars.some((v) => v.name === 'Pre_Test') ? 'Pre_Test' : vars[0]?.name
  const defaultV2 = vars.some((v) => v.name === 'Post_Test') ? 'Post_Test' : (vars[1]?.name ?? vars[0]?.name)
  const [var1, setVar1] = useState(defaultV1)
  const [var2, setVar2] = useState(defaultV2)
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runPairedT(dataset, var1, var2)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Paired-Samples T Test"
      subtitle="Membandingkan dua pengukuran berpasangan pada subjek yang sama (mis. Pre-test vs Post-test)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setVar1(defaultV1); setVar2(defaultV2); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-row">
        <div className="dlg-inline-field half">
          <label>Variable 1 (Sebelum / Pre):</label>
          <select className="dlg-select" value={var1} onChange={(e) => setVar1(e.target.value)}>
            {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
          </select>
        </div>
        <div className="dlg-inline-field half">
          <label>Variable 2 (Sesudah / Post):</label>
          <select className="dlg-select" value={var2} onChange={(e) => setVar2(e.target.value)}>
            {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
          </select>
        </div>
      </div>
      <div className="dlg-hint">Cocok untuk skripsi kuasi-eksperimen atau uji pengaruh intervensi (Before-After).</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 10. ONE-WAY ANOVA ================= */

export function OneWayAnovaDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const defaultDep = vars.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : vars[0]?.name
  const defaultFactor = vars.some((v) => v.name === 'Kelompok_Kota') ? 'Kelompok_Kota' : vars.some((v) => v.name === 'JK') ? 'JK' : vars[1]?.name
  const [depVar, setDepVar] = useState(defaultDep)
  const [factorVar, setFactorVar] = useState(defaultFactor)
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runOneWayAnova(dataset, depVar, factorVar)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="One-Way ANOVA"
      subtitle="Menguji perbedaan rata-rata antara 3 kelompok atau lebih dengan Post-Hoc Tukey HSD."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setDepVar(defaultDep); setFactorVar(defaultFactor); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Dependent List:</label>
        <select className="dlg-select" value={depVar} onChange={(e) => setDepVar(e.target.value)}>
          {vars.filter((v) => v.name !== factorVar).map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-inline-field">
        <label>Factor (Grouping &gt; 2 kelompok):</label>
        <select className="dlg-select" value={factorVar} onChange={(e) => setFactorVar(e.target.value)}>
          {vars.filter((v) => v.name !== depVar).map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-hint">Menghasilkan tabel ANOVA (uji F) dan Multiple Comparisons Tukey HSD untuk melihat beda nyata antar kelompok.</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 11. NORMALITY TEST ================= */

export function NormalityDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID' && v.measure === 'Scale').map((v) => v.name)
  const [selected, setSelected] = useState<string[]>(vars.slice(0, 4))
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runNormality(dataset, selected)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Tests of Normality (Kolmogorov-Smirnov & Shapiro-Wilk)"
      subtitle="Uji syarat parametrik: membuktikan apakah sebaran data penelitian berdistribusi normal (Sig. > 0,05)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelected(vars.slice(0, 4)); setError('') }} onClose={onClose} onOk={run} />}
    >
      <TransferList variables={dataset.variables.filter((v) => v.name !== 'ID')} selected={selected} onChange={setSelected} height={160} titleTarget="Variable(s)" />
      <div className="dlg-hint">Pedoman skripsi: Data berdistribusi NORMAL jika nilai Sig. Kolmogorov-Smirnov atau Shapiro-Wilk &gt; 0,05.</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 12. CLASSICAL ASSUMPTIONS ================= */

export function ClassicalAssumptionsDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const defaultDep = vars.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : (vars[vars.length - 1]?.name ?? '')
  const sampleIndeps = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => vars.some((v) => v.name === n))
  const defaultIndeps = sampleIndeps.length ? sampleIndeps : vars.filter((v) => v.name !== defaultDep).map((v) => v.name)
  const [dep, setDep] = useState(defaultDep)
  const [indeps, setIndeps] = useState<string[]>(defaultIndeps)
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runClassicalAssumptions(dataset, dep, indeps)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Uji Asumsi Klasik Regresi (Paket Lengkap Skripsi Bab IV)"
      subtitle="Menjalankan 4 uji prasyarat sekaligus: Normalitas Residual (K-S & P-P Plot), Multikolinearitas (VIF), Heteroskedastisitas (Glejser), dan Autokorelasi (D-W)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setDep(defaultDep); setIndeps(defaultIndeps); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label htmlFor="ca-dep">Dependent Variable (Y):</label>
        <select id="ca-dep" className="dlg-select" value={dep} onChange={(e) => setDep(e.target.value)}>
          {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <TransferList variables={vars.filter((v) => v.name !== dep)} selected={indeps} onChange={setIndeps} height={140} titleTarget="Independent Variables (X)" />
      <div className="dlg-hint">
        Kriteria kelulusan asumsi regresi skripsi:<br />
        • Normalitas: Sig. &gt; 0,05 &bull; Multikolinearitas: VIF &lt; 10 &bull; Heteroskedastisitas: Glejser Sig. &gt; 0,05 &bull; Autokorelasi: D-W 1,5–2,5.
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 13. NON-PARAMETRIC TESTS ================= */

export function MannWhitneyDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const groupCandidates = dataset.variables.filter((v) => {
    const uniq = new Set(dataset.rows.map((r) => r[dataset.variables.indexOf(v)]))
    return uniq.size === 2
  })
  const [testVar, setTestVar] = useState(vars.find((v) => v.measure === 'Scale')?.name ?? vars[0]?.name)
  const [groupVar, setGroupVar] = useState(groupCandidates[0]?.name ?? 'JK')
  const groupIdx = dataset.variables.findIndex((v) => v.name === groupVar)
  const uniq = [...new Set(dataset.rows.map((r) => r[groupIdx]))].sort((a, b) => a - b)
  const [g1, setG1] = useState(String(uniq[0] ?? 1))
  const [g2, setG2] = useState(String(uniq[1] ?? 2))
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runMannWhitney(dataset, testVar, groupVar, Number(g1), Number(g2))); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Mann-Whitney U Test (2 Independent Samples)"
      subtitle="Uji non-parametrik komparatif 2 kelompok independen (alternatif uji Independent T jika data tidak normal/ordinal)."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Test Variable:</label>
        <select className="dlg-select" value={testVar} onChange={(e) => setTestVar(e.target.value)}>
          {vars.filter((v) => v.name !== groupVar).map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-inline-field">
        <label>Grouping Variable:</label>
        <select className="dlg-select" value={groupVar} onChange={(e) => setGroupVar(e.target.value)}>
          {groupCandidates.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-group-values">
        <span>Define Groups:</span>
        <label>Group 1: <input className="dlg-input sm" value={g1} onChange={(e) => setG1(e.target.value)} /></label>
        <label>Group 2: <input className="dlg-input sm" value={g2} onChange={(e) => setG2(e.target.value)} /></label>
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



export function WilcoxonDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const [var1, setVar1] = useState('Pre_Test')
  const [var2, setVar2] = useState('Post_Test')
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runWilcoxon(dataset, var1, var2)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Wilcoxon Signed Ranks Test (2 Related Samples)"
      subtitle="Uji non-parametrik 2 sampel berpasangan (alternatif Paired T-test jika asumsi normalitas tidak terpenuhi)."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-row">
        <div className="dlg-inline-field half">
          <label>Variable 1:</label>
          <select className="dlg-select" value={var1} onChange={(e) => setVar1(e.target.value)}>
            {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
          </select>
        </div>
        <div className="dlg-inline-field half">
          <label>Variable 2:</label>
          <select className="dlg-select" value={var2} onChange={(e) => setVar2(e.target.value)}>
            {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
          </select>
        </div>
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



export function KruskalWallisDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const defaultTest = vars.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : (vars[vars.length - 1]?.name ?? '')
  const defaultGroup = vars.some((v) => v.name === 'JK') ? 'JK' : (vars[0]?.name ?? '')
  const [testVar, setTestVar] = useState(defaultTest)
  const [groupVar, setGroupVar] = useState(defaultGroup)
  const [error, setError] = useState('')

  const run = () => {
    try { onRun(runKruskalWallis(dataset, testVar, groupVar)); onClose() }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <DialogShell
      title="Kruskal-Wallis Test (K Independent Samples)"
      subtitle="Uji non-parametrik perbandingan 3 kelompok atau lebih (alternatif One-Way ANOVA jika data tidak normal)."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Test Variable:</label>
        <select className="dlg-select" value={testVar} onChange={(e) => setTestVar(e.target.value)}>
          {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-inline-field">
        <label>Grouping Variable:</label>
        <select className="dlg-select" value={groupVar} onChange={(e) => setGroupVar(e.target.value)}>
          {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 14. CROSSTABS ================= */

export function CrosstabsDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const defaultRow = vars.some((v) => v.name === 'JK') ? 'JK' : (vars[0]?.name ?? '')
  const defaultCol = vars.some((v) => v.name === 'X1_Harga') ? 'X1_Harga' : (vars.find((v) => v.name !== defaultRow)?.name ?? vars[1]?.name ?? '')
  const [rowVar, setRowVar] = useState(defaultRow)
  const [colVar, setColVar] = useState(defaultCol)
  const [error, setError] = useState('')
  const run = () => {
    try { onRun(runCrosstabs(dataset, rowVar, colVar)); onClose() }
    catch (e) { setError((e as Error).message) }
  }
  return (
    <DialogShell
      title="Crosstabs"
      subtitle="Membuat tabulasi silang dan uji independensi Chi-Square antar dua variabel kategorikal."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setRowVar(defaultRow); setColVar(defaultCol); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Row(s):</label>
        <select className="dlg-select" value={rowVar} onChange={(e) => setRowVar(e.target.value)}>
          {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-inline-field">
        <label>Column(s):</label>
        <select className="dlg-select" value={colVar} onChange={(e) => setColVar(e.target.value)}>
          {vars.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <div className="dlg-hint">Chi-Square memeriksa ada tidaknya keterikatan antar baris dan kolom. Sig. &lt; 0,05 membuktikan ada hubungan signifikan.</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 15. COMPUTE VARIABLE ================= */

export function ComputeVariableDialog({ dataset, onClose, onCompute }: {
  dataset: Dataset
  onClose: () => void
  onCompute: (target: string, label: string, expression: string) => void
}) {
  const [target, setTarget] = useState('X_Total')
  const [label, setLabel] = useState('Total Skor Variabel X')
  const [expression, setExpression] = useState('X1_Harga + X2_Kualitas + X3_Promosi')
  const [error, setError] = useState('')

  const insertText = (str: string) => {
    setExpression((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + str + ' ')
  }

  const ok = () => {
    if (!target.trim()) { setError('Nama variabel target harus diisi.'); return }
    if (!expression.trim()) { setError('Rumus ekspresi numerik harus diisi.'); return }
    onCompute(target.trim(), label.trim(), expression.trim())
    onClose()
  }

  return (
    <DialogShell
      title="Compute Variable"
      subtitle="Membuat variabel baru hasil penjumlahan kuesioner, rata-rata (mean), atau rumus matematika."
      onClose={onClose}
      width={780}
      footer={<DlgButtons onClose={onClose} onOk={ok} />}
    >
      <div className="dlg-row">
        <div className="dlg-inline-field half">
          <label>Target Variable:</label>
          <input className="dlg-input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Mis. Total_X" />
        </div>
        <div className="dlg-inline-field half">
          <label>Type &amp; Label:</label>
          <input className="dlg-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Keterangan label variabel" />
        </div>
      </div>

      <div className="compute-editor-row">
        <div className="compute-vars-box">
          <div className="transfer-label">Variabel:</div>
          <div className="compute-var-list">
            {dataset.variables.map((v) => (
              <button key={v.id} className="transfer-item" onDoubleClick={() => insertText(v.name)}>
                <MeasureIcon measure={v.measure} size={14} />
                <span className="transfer-name">{v.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="compute-center">
          <button className="dlg-btn dlg-arrow" onClick={() => {
            const v = dataset.variables[0]?.name
            if (v) insertText(v)
          }} title="Masukkan variabel ke rumus">
            <Icon name="arrow-right" size={14} />
          </button>
        </div>

        <div className="compute-calc-box">
          <label className="transfer-label">Numeric Expression:</label>
          <textarea
            className="compute-textarea"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            rows={4}
            placeholder="Mis: SUM(X1, X2, X3) atau X1 + X2 + X3"
          />
          <div className="compute-keypad">
            {['+', '-', '*', '/', '(', ')'].map((k) => (
              <button key={k} className="calc-btn" onClick={() => insertText(k)}>{k}</button>
            ))}
            <button className="calc-btn wide" onClick={() => insertText('SUM(')}>SUM()</button>
            <button className="calc-btn wide" onClick={() => insertText('MEAN(')}>MEAN()</button>
          </div>
        </div>
      </div>
      <div className="dlg-hint">
        Contoh paling sering untuk skripsi: Menjumlahkan butir indikator kuesioner menjadi skor total variabel (mis. <code>X1_Harga + X2_Kualitas + X3_Promosi</code>).
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 16. RECODE VARIABLE ================= */

export function RecodeDialog({ dataset, onClose, onRecode }: {
  dataset: Dataset
  onClose: () => void
  onRecode: (src: string, target: string, rules: RecodeRule[], intoSame: boolean) => void
}) {
  const [sourceVar, setSourceVar] = useState(dataset.variables[0]?.name ?? '')
  const [targetVar, setTargetVar] = useState(dataset.variables[0]?.name + '_rec')
  const [intoSame, setIntoSame] = useState(false)
  const [rules, setRules] = useState<RecodeRule[]>([
    { oldVal: 1, newVal: 5 },
    { oldVal: 2, newVal: 4 },
    { oldVal: 3, newVal: 3 },
    { oldVal: 4, newVal: 2 },
    { oldVal: 5, newVal: 1 },
  ])
  const [oldIn, setOldIn] = useState('')
  const [newIn, setNewIn] = useState('')
  const [error, setError] = useState('')

  const addRule = () => {
    const o = Number(oldIn)
    const n = Number(newIn)
    if (!Number.isFinite(o) || !Number.isFinite(n)) { setError('Nilai lama dan baru harus angka.'); return }
    setRules((prev) => [...prev.filter((r) => r.oldVal !== o), { oldVal: o, newVal: n }])
    setOldIn('')
    setNewIn('')
    setError('')
  }

  const run = () => {
    if (!rules.length) { setError('Tambahkan minimal satu aturan recode.'); return }
    onRecode(sourceVar, targetVar, rules, intoSame)
    onClose()
  }

  return (
    <DialogShell
      title="Recode into Different Variables"
      subtitle="Mengubah nilai variabel (misal: membalik skor pertanyaan negatif pada skala Likert 1->5, 2->4, dst)."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-row">
        <div className="dlg-inline-field half">
          <label>Variabel Asal:</label>
          <select className="dlg-select" value={sourceVar} onChange={(e) => { setSourceVar(e.target.value); setTargetVar(e.target.value + '_rec') }}>
            {dataset.variables.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
          </select>
        </div>
        <div className="dlg-inline-field half">
          <label>Variabel Hasil:</label>
          <input className="dlg-input" value={intoSame ? sourceVar : targetVar} disabled={intoSame} onChange={(e) => setTargetVar(e.target.value)} />
        </div>
      </div>
      <Check label="Recode into Same Variable (timpa variabel asal)" checked={intoSame} onChange={setIntoSame} />

      <fieldset className="dlg-fieldset">
        <legend>Old and New Values Mapping</legend>
        <div className="recode-inputs">
          <label>Old Value: <input className="dlg-input sm" value={oldIn} onChange={(e) => setOldIn(e.target.value)} /></label>
          <label>New Value: <input className="dlg-input sm" value={newIn} onChange={(e) => setNewIn(e.target.value)} /></label>
          <button className="dlg-btn" onClick={addRule}>Add / Change</button>
        </div>
        <div className="recode-list">
          {rules.map((r, i) => (
            <div key={i} className="recode-item">
              <span>{r.oldVal} &rarr; {r.newVal}</span>
              <button onClick={() => setRules(rules.filter((_, idx) => idx !== i))}>Hapus</button>
            </div>
          ))}
        </div>
      </fieldset>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 17. SELECT CASES ================= */

export function SelectCasesDialog({ dataset, onClose, onSelectCases }: {
  dataset: Dataset
  onClose: () => void
  onSelectCases: (filterExp: string | null) => void
}) {
  const [mode, setMode] = useState<'all' | 'filter'>('all')
  const [filterExp, setFilterExp] = useState('JK = 1')
  const [error, setError] = useState('')

  const run = () => {
    if (mode === 'all') {
      onSelectCases(null)
    } else {
      if (!filterExp.trim()) { setError('Isi kondisi filter.'); return }
      onSelectCases(filterExp.trim())
    }
    onClose()
  }

  return (
    <DialogShell
      title="Select Cases (Filter Data)"
      subtitle="Memilih sebagian data responden untuk dianalisis (misal: hanya responden Laki-laki JK = 1 atau Usia >= 20)."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <Radio name="selcases" label="All cases (gunakan seluruh data)" checked={mode === 'all'} onChange={() => setMode('all')} />
      <Radio name="selcases" label="If condition is satisfied (filter berdasarkan kriteria):" checked={mode === 'filter'} onChange={() => setMode('filter')} />
      {mode === 'filter' && (
        <div className="filter-input-box">
          <input className="dlg-input" value={filterExp} onChange={(e) => setFilterExp(e.target.value)} placeholder="Mis: JK = 1 atau Usia >= 20" />
          <div className="dlg-hint">Format contoh: <code>JK = 1</code> atau <code>Usia &gt;= 21</code>. Responden yang tidak memenuhi akan dicoret (filtered out).</div>
        </div>
      )}
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 18. SORT, FIND, ABOUT, INFO ================= */

export function SortDialog({ dataset, onClose, onSort }: { dataset: Dataset; onClose: () => void; onSort: (name: string, order: 'asc' | 'desc') => void }) {
  const [name, setName] = useState(dataset.variables[0]?.name ?? '')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  return (
    <DialogShell
      title="Sort Cases"
      subtitle="Urutkan baris data berdasarkan nilai satu variabel."
      onClose={onClose}
      footer={<><span className="dlg-footer-spacer" /><button className="dlg-btn dlg-btn-primary" onClick={() => { onSort(name, order); onClose() }}>OK</button><button className="dlg-btn" onClick={onClose}>Batal</button></>}
    >
      <div className="dlg-inline-field">
        <label>Sort by:</label>
        <select className="dlg-select" value={name} onChange={(e) => setName(e.target.value)}>
          {dataset.variables.map((v) => <option key={v.id} value={v.name}>{v.name} — {v.label}</option>)}
        </select>
      </div>
      <fieldset className="dlg-fieldset">
        <legend>Sort Order</legend>
        <Radio name="sortorder" label="Ascending (Menaik: 1, 2, 3...)" checked={order === 'asc'} onChange={() => setOrder('asc')} />
        <Radio name="sortorder" label="Descending (Menurun: 3, 2, 1...)" checked={order === 'desc'} onChange={() => setOrder('desc')} />
      </fieldset>
    </DialogShell>
  )
}

export function FindDialog({ onClose, onFind }: { onClose: () => void; onFind: (term: string) => boolean }) {
  const [term, setTerm] = useState('')
  const [msg, setMsg] = useState('')
  return (
    <DialogShell
      title="Find"
      subtitle="Cari nomor responden atau nilai pada dataset."
      width={460}
      onClose={onClose}
      footer={<><span className="dlg-footer-spacer" /><button className="dlg-btn dlg-btn-primary" onClick={() => { if (!onFind(term)) setMsg('Tidak ditemukan. Coba nomor responden atau nilai lain.') }}>Cari</button><button className="dlg-btn" onClick={onClose}>Tutup</button></>}
    >
      <div className="dlg-inline-field">
        <label htmlFor="find-term">Find what:</label>
        <input id="find-term" className="dlg-input" value={term} onChange={(e) => { setTerm(e.target.value); setMsg('') }} autoFocus />
      </div>
      <div className="dlg-hint">Ketik nomor responden atau angka nilai sel yang ingin dicari.</div>
      {msg && <div className="dlg-error">{msg}</div>}
    </DialogShell>
  )
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell
      title="About SPSS Statistics Recreation"
      width={560}
      onClose={onClose}
      footer={<><span className="dlg-footer-spacer" /><button className="dlg-btn dlg-btn-primary" onClick={onClose}>OK</button></>}
    >
      <div className="about-box">
        <div className="about-logo"><span /><span /><span /></div>
        <div>
          <h3>SPSS Statistics Recreation for Skripsi</h3>
          <p>Version 2.0 · Complete Statistical Engine for Quantitative Research</p>
        </div>
      </div>
      <p className="about-text">
        Dirancang khusus untuk mendukung penelitian skripsi, tesis, dan riset kuantitatif di Indonesia.
        Seluruh rumus statistik (validitas r-tabel, reliabilitas Cronbach's Alpha, asumsi klasik regresi,
        normalitas Kolmogorov-Smirnov &amp; Shapiro-Wilk, t-test, ANOVA Tukey, dan non-parametrik) dihitung secara 100% presisi langsung di browser Anda.
      </p>
      <div className="about-meta">
        <span>Privasi terjamin: 100% Client-side. Tidak ada data survei Anda yang diunggah ke internet.</span>
      </div>
    </DialogShell>
  )
}

export function InfoDialog({ title, message, onClose }: { title: string; message: string; onClose: () => void }) {
  return (
    <DialogShell
      title={title}
      width={520}
      onClose={onClose}
      footer={<><span className="dlg-footer-spacer" /><button className="dlg-btn dlg-btn-primary" onClick={onClose}>OK</button></>}
    >
      <p className="about-text" style={{ marginTop: 0, whiteSpace: 'pre-line' }}>{message}</p>
    </DialogShell>
  )
}

/* ================= 18. PARTIAL CORRELATION DIALOG ================= */

export function PartialCorrelationDialog({ dataset, onClose, onRun }: DialogProps) {
  const vars = dataset.variables.filter((v) => v.name !== 'ID')
  const [v1, setV1] = useState(vars.some((v) => v.name === 'X1_Harga') ? 'X1_Harga' : (vars[0]?.name ?? ''))
  const [v2, setV2] = useState(vars.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : (vars[1]?.name ?? ''))
  const [ctrl, setCtrl] = useState(vars.some((v) => v.name === 'Usia') ? 'Usia' : (vars[2]?.name ?? ''))
  const [error, setError] = useState('')

  const run = () => {
    try {
      onRun(runPartialCorrelation(dataset, v1, v2, ctrl))
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <DialogShell
      title="Partial Correlations"
      subtitle="Mengukur hubungan linear murni antara dua variabel dengan mengontrol/mengendalikan pengaruh variabel ketiga."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-row">
        <div className="dlg-inline-field half">
          <label>Variabel 1 (X):</label>
          <select className="dlg-select" value={v1} onChange={(e) => setV1(e.target.value)}>
            {vars.filter((v) => v.name !== v2 && v.name !== ctrl).map((v) => (
              <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
            ))}
          </select>
        </div>
        <div className="dlg-inline-field half">
          <label>Variabel 2 (Y):</label>
          <select className="dlg-select" value={v2} onChange={(e) => setV2(e.target.value)}>
            {vars.filter((v) => v.name !== v1 && v.name !== ctrl).map((v) => (
              <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="dlg-inline-field">
        <label>Controlling for (Variabel Kontrol):</label>
        <select className="dlg-select" value={ctrl} onChange={(e) => setCtrl(e.target.value)}>
          {vars.filter((v) => v.name !== v1 && v.name !== v2).map((v) => (
            <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
          ))}
        </select>
      </div>
      <div className="dlg-hint">Membandingkan korelasi Zero-Order dengan korelasi Parsial setelah variabel kontrol dihilangkan pengaruhnya.</div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}



/* ================= 19. POWER ANALYSIS DIALOG (2026 / SPSS 29) ================= */

export function PowerAnalysisDialog({ dataset, onClose, onRun }: DialogProps) {
  const [testType, setTestType] = useState<'independent' | 'onesample' | 'regression'>('independent')
  const [alpha, setAlpha] = useState('0.05')
  const [effectSize, setEffectSize] = useState('0.50')
  const [predictors, setPredictors] = useState('3')
  const [error, setError] = useState('')

  const run = () => {
    try {
      const a = Number(alpha)
      const es = Number(effectSize)
      const p = Number(predictors)
      onRun(runPowerAnalysis(dataset, testType, a, es, p))
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <DialogShell
      title="Power Analysis (Uji Kecukupan Kekuatan Statistik)"
      subtitle="Fitur unggulan SPSS edisi 2026/29: Membuktikan secara ilmiah bahwa ukuran sampel responden Anda memiliki kekuatan statistik (Power ≥ 80%) untuk uji hipotesis skripsi."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label>Uji Statistik yang Dianalisis:</label>
        <select className="dlg-select" value={testType} onChange={(e) => {
          const val = e.target.value as any
          setTestType(val)
          if (val === 'regression') setEffectSize('0.25')
          else setEffectSize('0.50')
        }}>
          <option value="independent">Compare Means: Independent-Samples T Test (2 Kelompok)</option>
          <option value="onesample">Compare Means: One-Sample T Test</option>
          <option value="regression">Regression: Linear Regression (R² &amp; Uji F Simultan)</option>
        </select>
      </div>
      <div className="dlg-row">
        <div className="dlg-inline-field half">
          <label>Taraf Signifikansi (α):</label>
          <select className="dlg-select" value={alpha} onChange={(e) => setAlpha(e.target.value)}>
            <option value="0.05">α = 0,05 (Standar Skripsi)</option>
            <option value="0.01">α = 0,01 (Ketat)</option>
            <option value="0.10">α = 0,10</option>
          </select>
        </div>
        <div className="dlg-inline-field half">
          <label>{testType === 'regression' ? 'Antisipasi Nilai R² (0–1):' : 'Effect Size (Cohen\'s d):'}</label>
          <input className="dlg-input" value={effectSize} onChange={(e) => setEffectSize(e.target.value)} placeholder="0.50" />
        </div>
      </div>
      {testType === 'regression' && (
        <div className="dlg-inline-field">
          <label>Jumlah Variabel Independen (k):</label>
          <input className="dlg-input sm" value={predictors} onChange={(e) => setPredictors(e.target.value)} />
        </div>
      )}
      <div className="dlg-hint">
        Ukuran sampel dihitung otomatis dari dataset aktif saat ini ({dataset.rows.length} responden).
        Konvensi ilmiah menyatakan jika Power $\ge$ 80% (0,80), sampel skripsi dinyatakan sangat cukup dan valid.
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}

/* ================= 18. SAVE DATA AS DIALOG ================= */

export function SaveDataAsDialog({
  dataset,
  onClose,
  onSave,
}: {
  dataset: Dataset
  onClose: () => void
  onSave: (fileName: string, format: 'sav' | 'csv' | 'xlsx' | 'json', saveLabels: boolean, usePicker: boolean) => void
}) {
  const [fileName, setFileName] = useState(dataset.name.replace(/\.[^/.]+$/, ''))
  const [format, setFormat] = useState<'sav' | 'csv' | 'xlsx' | 'json'>('sav')
  const [saveLabels, setSaveLabels] = useState(true)
  const [error, setError] = useState('')

  const handleSave = (usePicker: boolean) => {
    const clean = fileName.trim()
    if (!clean) { setError('Masukkan nama file terlebih dahulu.'); return }
    onSave(clean, format, saveLabels, usePicker)
    onClose()
  }

  return (
    <DialogShell
      title="Save Data As"
      subtitle="Simpan dataset skripsi Anda ke folder lokal di komputer Anda."
      width={600}
      onClose={onClose}
      footer={
        <>
          <button className="dlg-btn" onClick={() => handleSave(true)} title="Buka jendela Windows Explorer untuk memilih folder target (misal: Dokumen, Desktop, Flashdisk)">
            📁 Pilih Folder di Komputer…
          </button>
          <span className="dlg-footer-spacer" />
          <button className="dlg-btn dlg-btn-primary" onClick={() => handleSave(false)}>
            💾 Simpan File
          </button>
          <button className="dlg-btn" onClick={onClose}>Batal</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '6px 0' }}>
        <ErrorLine error={error} />

        <div style={{ background: '#f4f4f4', borderLeft: '4px solid #0f62fe', padding: '10px 14px', fontSize: 12, lineHeight: 1.6 }}>
          <strong>Petunjuk Lokasi Folder Penyimpanan:</strong><br />
          • Klik tombol <strong>"📁 Pilih Folder di Komputer…"</strong> untuk membuka jendela Windows Explorer dan memilih folder target langsung (misal: <em>Documents &gt; Skripsi</em> atau <em>Desktop</em>).<br />
          • Atau klik tombol <strong>"💾 Simpan File"</strong> untuk mengunduh file secara instan ke folder <em>Downloads</em> komputer Anda.
        </div>

        <label className="dlg-row" style={{ alignItems: 'center' }}>
          <span style={{ width: 140, fontWeight: 600 }}>File Name:</span>
          <input
            type="text"
            className="dlg-input"
            style={{ flex: 1 }}
            value={fileName}
            onChange={(e) => { setFileName(e.target.value); setError('') }}
            placeholder="data_kuesioner_skripsi"
            autoFocus
          />
        </label>

        <label className="dlg-row" style={{ alignItems: 'center' }}>
          <span style={{ width: 140, fontWeight: 600 }}>Save as Type:</span>
          <select
            className="dlg-select"
            style={{ flex: 1 }}
            value={format}
            onChange={(e) => setFormat(e.target.value as 'sav' | 'csv' | 'xlsx' | 'json')}
          >
            <option value="sav">SPSS Statistics (*.sav) — Format Asli IBM SPSS 100% Kompatibel</option>
            <option value="xlsx">Excel Workbook (*.xlsx / *.xls) — Microsoft Excel</option>
            <option value="csv">Comma Delimited (*.csv) — Format Teks CSV</option>
            <option value="json">JSON Dataset (*.json) — Backup Digital</option>
          </select>
        </label>

        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 10 }}>
          <Check label="Simpan label nilai (Value Labels) pada file data" checked={saveLabels} onChange={setSaveLabels} />
          <p style={{ fontSize: 11, color: '#666', marginTop: 8, lineHeight: 1.5 }}>
            Format <strong>SPSS Statistics (*.sav)</strong> yang dihasilkan dibuat dengan format biner standar <em>($FL2)</em> sehingga dapat langsung dibuka di software IBM SPSS Statistics versi berapapun di lab kampus, R Studio, maupun Python.
          </p>
        </div>
      </div>
    </DialogShell>
  )
}

/* ================= 19. SAVE CONFIRMATION MODAL ================= */

export function SaveLocationModal({
  fileName,
  locationText,
  formatText,
  onClose,
}: {
  fileName: string
  locationText: string
  formatText: string
  onClose: () => void
}) {
  return (
    <DialogShell
      title="File Berhasil Disimpan"
      subtitle="Informasi lokasi dan format file data skripsi Anda"
      width={560}
      onClose={onClose}
      footer={<button className="dlg-btn dlg-btn-primary" onClick={onClose}>Selesai &amp; Lanjutkan</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#defbe6', border: '1px solid #24a148', padding: '12px 16px', borderRadius: 2 }}>
          <span style={{ color: '#24a148', fontSize: 24, fontWeight: 'bold' }}>✓</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 14, color: '#0e6027' }}>File Tersimpan dengan Sukses!</div>
            <div style={{ fontSize: 12, color: '#161616', marginTop: 2 }}>File data siap digunakan untuk olah data skripsi Anda.</div>
          </div>
        </div>

        <table className="spss-table" style={{ width: '100%', fontSize: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: 140, fontWeight: 600, background: '#f4f4f4' }}>Nama File</td>
              <td><strong>{fileName}</strong></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, background: '#f4f4f4' }}>Lokasi Folder</td>
              <td><span style={{ color: '#0f62fe', fontWeight: 600 }}>{locationText}</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, background: '#f4f4f4' }}>Format File</td>
              <td>{formatText}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, background: '#f4f4f4' }}>Kompatibilitas</td>
              <td>100% Kompatibel dengan IBM SPSS Statistics 20–29, R, Python, Microsoft Excel</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5, background: '#edf5ff', padding: '10px 14px', borderLeft: '4px solid #0f62fe' }}>
          <strong>Tips untuk Skripsi:</strong> Jika Anda perlu membuka file ini di komputer kampus atau laptop teman, Anda cukup mengcopy file <code>{fileName}</code> dari folder di atas ke Flashdisk atau Google Drive.
        </div>
      </div>
    </DialogShell>
  )
}

/* ================= 20. DATA FILE INFORMATION DIALOG ================= */

export function DataFileInfoDialog({
  dataset,
  onClose,
}: {
  dataset: Dataset
  onClose: () => void
}) {
  return (
    <DialogShell
      title="File Information — Working File"
      subtitle={`Informasi kamus variabel dan struktur dataset: ${dataset.name}`}
      width={740}
      onClose={onClose}
      footer={<button className="dlg-btn dlg-btn-primary" onClick={onClose}>Tutup</button>}
    >
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        <div style={{ marginBottom: 12, fontSize: 12, color: '#333' }}>
          <strong>Dataset Aktif:</strong> {dataset.name} &bull; <strong>Jumlah Kasus (N):</strong> {dataset.rows.length} &bull; <strong>Variabel:</strong> {dataset.variables.length}
        </div>
        <table className="spss-table" style={{ width: '100%', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>No</th>
              <th>Name</th>
              <th>Label</th>
              <th>Type</th>
              <th>Measure</th>
              <th style={{ width: 50 }}>Dec</th>
              <th>Value Labels</th>
            </tr>
          </thead>
          <tbody>
            {dataset.variables.map((v, i) => (
              <tr key={v.id}>
                <td style={{ textAlign: 'center' }}>{i + 1}</td>
                <td><strong>{v.name}</strong></td>
                <td>{v.label}</td>
                <td>{v.type}</td>
                <td>{v.measure}</td>
                <td style={{ textAlign: 'center' }}>{v.decimals}</td>
                <td>
                  {v.values
                    ? Object.entries(v.values).map(([val, lbl]) => `${val} = ${lbl}`).join(', ')
                    : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DialogShell>
  )
}

/* ================= 21. BINARY LOGISTIC REGRESSION DIALOG ================= */

export function BinaryLogisticDialog({ dataset, onClose, onRun }: DialogProps) {
  const binaryCandidates = dataset.variables.filter((v) => {
    const vals = new Set(dataset.rows.map((r) => r[dataset.variables.indexOf(v)]))
    return vals.size >= 2 && vals.size <= 4
  })
  const defaultDep = binaryCandidates[0]?.name ?? dataset.variables[1]?.name ?? ''
  const sampleCovars = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n && v.name !== defaultDep))
  const defaultCovars = sampleCovars.length ? sampleCovars : dataset.variables.filter((v) => v.name !== defaultDep && v.name !== 'ID').map((v) => v.name)
  const [depVar, setDepVar] = useState(defaultDep)
  const [covariates, setCovariates] = useState<string[]>(defaultCovars)
  const [error, setError] = useState('')

  const run = () => {
    if (!depVar) { setError('Pilih variabel dependen biner.'); return }
    if (!covariates.length) { setError('Pilih minimal satu variabel kovariat (independen).'); return }
    try {
      onRun(runLogisticRegression(dataset, depVar, covariates))
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <DialogShell
      title="Binary Logistic Regression"
      subtitle="Regresi logistik biner ketika variabel dependen memiliki 2 kategori hasil (misal: Keputusan Membeli 0 vs 1, Lulus vs Gagal)."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setCovariates([]); setError('') }} onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label htmlFor="dep-var-log">Dependent Variable (Biner):</label>
        <select id="dep-var-log" className="dlg-select" value={depVar} onChange={(e) => setDepVar(e.target.value)}>
          {dataset.variables.map((v) => (
            <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Covariates (Variabel Independen):</span>
        <TransferList
          variables={dataset.variables.filter((v) => v.name !== depVar && v.name !== 'ID')}
          selected={covariates}
          onChange={setCovariates}
          height={180}
          titleTarget="Covariates terpilih"
        />
      </div>

      <div className="dlg-hint">
        Output menyertakan: Omnibus Tests of Model Coefficients, -2 Log Likelihood, Cox &amp; Snell R², Nagelkerke R², Classification Table, dan Variables in the Equation (B, Wald, Exp(B) / Odds Ratio 95% C.I.).
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}

/* ================= 22. TWO-WAY ANOVA DIALOG ================= */

export function TwoWayAnovaDialog({ dataset, onClose, onRun }: DialogProps) {
  const scaleCandidates = dataset.variables.filter((v) => v.measure === 'Scale' || v.name.startsWith('Y') || v.name.startsWith('Skor'))
  const factorCandidates = dataset.variables.filter((v) => {
    const vals = new Set(dataset.rows.map((r) => r[dataset.variables.indexOf(v)]))
    return vals.size >= 2 && vals.size <= 6
  })

  const [depVar, setDepVar] = useState(scaleCandidates[0]?.name ?? dataset.variables[dataset.variables.length - 1]?.name)
  const [factorA, setFactorA] = useState(factorCandidates[0]?.name ?? dataset.variables[1]?.name)
  const [factorB, setFactorB] = useState(factorCandidates[1]?.name ?? dataset.variables[2]?.name)
  const [error, setError] = useState('')

  const run = () => {
    if (!depVar || !factorA || !factorB) { setError('Lengkapi pemilihan variabel.'); return }
    if (factorA === factorB || depVar === factorA || depVar === factorB) { setError('Seluruh variabel harus berbeda.'); return }
    try {
      onRun(runTwoWayAnova(dataset, depVar, factorA, factorB))
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <DialogShell
      title="Univariate (Two-Way ANOVA)"
      subtitle="Analisis Varians Dua Jalur: menguji pengaruh utama 2 faktor dan pengaruh interaksi (A × B) terhadap variabel dependen."
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={run} />}
    >
      <div className="dlg-inline-field">
        <label htmlFor="dep-var-2w">Dependent Variable (Skala / Angka):</label>
        <select id="dep-var-2w" className="dlg-select" value={depVar} onChange={(e) => setDepVar(e.target.value)}>
          {dataset.variables.map((v) => (
            <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
          ))}
        </select>
      </div>

      <div className="dlg-row" style={{ marginTop: 12 }}>
        <div className="dlg-inline-field half">
          <label htmlFor="factor-a">Fixed Factor 1:</label>
          <select id="factor-a" className="dlg-select" value={factorA} onChange={(e) => setFactorA(e.target.value)}>
            {dataset.variables.filter((v) => v.name !== depVar).map((v) => (
              <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
            ))}
          </select>
        </div>
        <div className="dlg-inline-field half">
          <label htmlFor="factor-b">Fixed Factor 2:</label>
          <select id="factor-b" className="dlg-select" value={factorB} onChange={(e) => setFactorB(e.target.value)}>
            {dataset.variables.filter((v) => v.name !== depVar && v.name !== factorA).map((v) => (
              <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dlg-hint">
        Output menyertakan: Between-Subjects Factors, Uji Homogenitas Levene, Tests of Between-Subjects Effects (Type III Sum of Squares, F, Sig., dan Partial Eta Squared), serta pembahasan lengkap pengaruh utama dan efek interaksi.
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}

/* ================= 23. FACTOR ANALYSIS DIALOG ================= */

export function FactorAnalysisDialog({ dataset, onClose, onRun }: DialogProps) {
  const scaleVars = dataset.variables.filter((v) => v.measure === 'Scale' || v.name.startsWith('X') || v.name.startsWith('Y') || v.name.includes('_'))
  const [selectedVars, setSelectedVars] = useState<string[]>(
    scaleVars.length >= 3 ? scaleVars.map((v) => v.name) : dataset.variables.slice(1, 6).map((v) => v.name)
  )
  const [error, setError] = useState('')

  const run = () => {
    if (selectedVars.length < 2) { setError('Pilih minimal 2 variabel butir kuesioner.'); return }
    try {
      onRun(runFactorAnalysis(dataset, selectedVars))
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <DialogShell
      title="Factor Analysis (EFA)"
      subtitle="Analisis Faktor Eksploratori untuk menguji validitas konstruk kuesioner dan mengelompokkan indikator ke dimensi faktor."
      onClose={onClose}
      footer={<DlgButtons onReset={() => { setSelectedVars([]); setError('') }} onClose={onClose} onOk={run} />}
    >
      <TransferList
        variables={dataset.variables.filter((v) => v.name !== 'ID')}
        selected={selectedVars}
        onChange={setSelectedVars}
        height={220}
        titleTarget="Variables (Indikator Kuesioner):"
      />
      <div className="dlg-hint">
        Metode Ekstraksi: <strong>Principal Component Analysis (PCA)</strong> &bull; Rotasi: <strong>Varimax with Kaiser Normalization</strong>.<br />
        Output menyertakan: KMO and Bartlett's Test, Communalities, Total Variance Explained (Kaiser Criterion Eigenvalue &gt; 1,0), dan Rotated Component Matrix.
      </div>
      <ErrorLine error={error} />
    </DialogShell>
  )
}

/* ================= 24. CHART EDITOR DIALOG ================= */

export function ChartEditorDialog({
  title,
  onClose,
  onSaveChart,
}: {
  title: string
  onClose: () => void
  onSaveChart: (customTitle: string, color: string, showLabels: boolean) => void
}) {
  const [chartTitle, setChartTitle] = useState(title)
  const [color, setColor] = useState('#0f62fe')
  const [showLabels, setShowLabels] = useState(true)

  const handleApply = () => {
    onSaveChart(chartTitle, color, showLabels)
    onClose()
  }

  return (
    <DialogShell
      title="SPSS Chart Properties & Editor"
      subtitle="Kustomisasi judul, warna palet batang, dan label nilai diagram statistik."
      width={480}
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={handleApply} okLabel="Terapkan ke Diagram" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
        <label className="dlg-row" style={{ alignItems: 'center' }}>
          <span style={{ width: 120, fontWeight: 600 }}>Judul Diagram:</span>
          <input className="dlg-input" style={{ flex: 1 }} value={chartTitle} onChange={(e) => setChartTitle(e.target.value)} />
        </label>

        <label className="dlg-row" style={{ alignItems: 'center' }}>
          <span style={{ width: 120, fontWeight: 600 }}>Warna Batang:</span>
          <select className="dlg-select" style={{ flex: 1 }} value={color} onChange={(e) => setColor(e.target.value)}>
            <option value="#0f62fe">IBM SPSS Classic Blue (#0f62fe)</option>
            <option value="#0043ce">Deep Navy Blue (#0043ce)</option>
            <option value="#0072c3">Corporate Slate Blue (#0072c3)</option>
            <option value="#a2191f">Crimson Burgundy (#a2191f)</option>
            <option value="#198038">Academic Forest Green (#198038)</option>
            <option value="#6929c4">Purple Indigo (#6929c4)</option>
            <option value="#4d5358">Monochrome Charcoal (#4d5358)</option>
          </select>
        </label>

        <div style={{ marginTop: 8 }}>
          <Check label="Tampilkan label frekuensi / persentase di atas setiap batang" checked={showLabels} onChange={setShowLabels} />
        </div>
      </div>
    </DialogShell>
  )
}

/* ================= 25. REPLACE DIALOG ================= */

export function ReplaceDialog({
  dataset,
  onClose,
  onReplace,
}: {
  dataset: Dataset
  onClose: () => void
  onReplace: (findVal: string, replaceVal: string, varName?: string) => void
}) {
  const [findVal, setFindVal] = useState('')
  const [replaceVal, setReplaceVal] = useState('')
  const [selectedVar, setSelectedVar] = useState('ALL')
  const [msg, setMsg] = useState('')

  const handleExec = () => {
    if (!findVal.trim() || !replaceVal.trim()) {
      setMsg('Masukkan nilai yang dicari dan nilai penggantinya.')
      return
    }
    onReplace(findVal, replaceVal, selectedVar === 'ALL' ? undefined : selectedVar)
    onClose()
  }

  return (
    <DialogShell
      title="Replace"
      subtitle="Cari dan ganti nilai sel numerik di seluruh dataset atau pada satu variabel tertentu."
      width={480}
      onClose={onClose}
      footer={<DlgButtons onClose={onClose} onOk={handleExec} okLabel="Replace All" />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="dlg-inline-field">
          <label htmlFor="rep-find">Find what:</label>
          <input
            id="rep-find"
            className="dlg-input"
            value={findVal}
            onChange={(e) => { setFindVal(e.target.value); setMsg('') }}
            placeholder="Contoh: 99 atau 0"
            autoFocus
          />
        </div>
        <div className="dlg-inline-field">
          <label htmlFor="rep-with">Replace with:</label>
          <input
            id="rep-with"
            className="dlg-input"
            value={replaceVal}
            onChange={(e) => { setReplaceVal(e.target.value); setMsg('') }}
            placeholder="Contoh: 1"
          />
        </div>
        <div className="dlg-inline-field">
          <label htmlFor="rep-var">In Variable:</label>
          <select
            id="rep-var"
            className="dlg-select"
            value={selectedVar}
            onChange={(e) => setSelectedVar(e.target.value)}
          >
            <option value="ALL">Semua Variabel (All Variables)</option>
            {dataset.variables.map((v) => (
              <option key={v.id} value={v.name}>{v.name} — {v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="dlg-hint">Tekan Replace All untuk mengganti semua nilai yang cocok di dataset.</div>
      {msg && <div className="dlg-error">{msg}</div>}
    </DialogShell>
  )
}
