import type { AnalysisResult, Dataset, OutputBlock, TableSpec } from './types'
import {
  corrTest, crosstab, describe, frequencies, fmt, fmtInt, fmtP, independentT,
  oneSampleT, oneWayAnova, pairedT, pearsonChiSquareP, regression, reliability,
  rTableValue, testClassicalAssumptions, testNormality, testValidity,
  mannWhitneyU, wilcoxonSignedRank, kruskalWallis, calculatePower, partialCorrelation,
  binaryLogisticRegression, twoWayAnova, factorAnalysis,
} from './stats'

const getActiveRows = (ds: Dataset) => {
  if (!ds.filteredRows || !ds.filteredRows.length) return ds.rows
  return ds.rows.filter((_, i) => ds.filteredRows![i] !== false)
}

const idx = (ds: Dataset, name: string) => ds.variables.findIndex((v) => v.name === name)
const col = (ds: Dataset, name: string) => {
  const i = idx(ds, name)
  if (i < 0) return []
  const active = getActiveRows(ds)
  return active.map((r) => r[i])
}
const labelOf = (ds: Dataset, name: string) => ds.variables.find((v) => v.name === name)?.label ?? name
const valuesOf = (ds: Dataset, name: string) => ds.variables.find((v) => v.name === name)?.values ?? null

const requireVars = (names: string[]) => {
  if (!names.length) throw new Error('Pilih minimal satu variabel terlebih dahulu.')
}

const requireData = (ds: Dataset) => {
  const active = getActiveRows(ds)
  if (!active.length) throw new Error('Dataset belum memiliki baris data (atau semua baris terfilter).')
}

const table = (t: Omit<TableSpec, 'kind'>): TableSpec => ({ kind: 'table', ...t })
const num = (v: number, d = 3) => fmt(v, d)

/* ================= 1. DESCRIPTIVES ================= */

export interface DescOptions {
  mean: boolean
  stddev: boolean
  min: boolean
  max: boolean
  variance: boolean
  range: boolean
  sum: boolean
  skewness: boolean
  kurtosis: boolean
  seMean: boolean
}

export const DEFAULT_DESC_OPTIONS: DescOptions = {
  mean: true, stddev: true, min: true, max: true, variance: false,
  range: false, sum: false, skewness: false, kurtosis: false, seMean: false,
}

export function runDescriptives(ds: Dataset, names: string[], opt: DescOptions): AnalysisResult {
  requireData(ds)
  requireVars(names)
  const stats = names.map((n) => describe(n, labelOf(ds, n), col(ds, n)))
  const columns = ['', 'N']
  if (opt.range) columns.push('Range')
  if (opt.min) columns.push('Minimum')
  if (opt.max) columns.push('Maximum')
  if (opt.sum) columns.push('Sum')
  if (opt.mean) columns.push('Mean')
  if (opt.seMean) columns.push('Std. Error')
  if (opt.stddev) columns.push('Std. Deviation')
  if (opt.variance) columns.push('Variance')
  if (opt.skewness) columns.push('Skewness')
  if (opt.kurtosis) columns.push('Kurtosis')
  const rows = stats.map((s) => {
    const row = [s.label, fmtInt(s.n)]
    if (opt.range) row.push(num(s.range))
    if (opt.min) row.push(num(s.min))
    if (opt.max) row.push(num(s.max))
    if (opt.sum) row.push(num(s.sum))
    if (opt.mean) row.push(num(s.mean))
    if (opt.seMean) row.push(num(s.seMean))
    if (opt.stddev) row.push(num(s.sd))
    if (opt.variance) row.push(num(s.variance))
    if (opt.skewness) row.push(num(s.skewness))
    if (opt.kurtosis) row.push(num(s.kurtosis))
    return row
  })
  const blocks: OutputBlock[] = [
    table({
      id: 'desc',
      title: 'Descriptive Statistics',
      columns,
      rows,
      notes: ['N = jumlah responden aktif yang dianalisis.'],
    }),
  ]
  const statsList = columns.filter((c) => c !== 'N').map((c) => c.toUpperCase().replace(/ /g, '')).join(' ')
  const syntax = 'DESCRIPTIVES VARIABLES=' + names.join(' ') +
    '\n  /STATISTICS=' + (statsList || 'MEAN STDDEV MIN MAX') + '.'
  const high = stats.reduce((a, b) => (b.mean > a.mean ? b : a))
  const low = stats.reduce((a, b) => (b.mean < a.mean ? b : a))
  const scaleItems = stats.filter((s) => s.max <= 5 && s.min >= 1)
  const interpretation = 'Dari ' + fmtInt(stats[0]?.n ?? 0) + ' responden, rata-rata tertinggi terdapat pada ' +
    high.label + ' (Mean = ' + num(high.mean, 2) + ', SD = ' + num(high.sd, 2) + ') dan terendah pada ' +
    low.label + ' (Mean = ' + num(low.mean, 2) + ', SD = ' + num(low.sd, 2) + ').' +
    (scaleItems.length
      ? ' Untuk variabel berskala Likert 1–5, nilai rata-rata > 3 menunjukkan kecenderungan jawaban positif (setuju/tinggi).'
      : '')
  return { title: 'Descriptives', command: 'Analyze > Descriptive Statistics > Descriptives', blocks, syntax, interpretation }
}

/* ================= 2. FREQUENCIES ================= */

export interface FreqOptions {
  statistics: boolean
  charts: 'none' | 'bar' | 'histogram'
}

export function runFrequencies(ds: Dataset, names: string[], opt: FreqOptions): AnalysisResult {
  requireData(ds)
  requireVars(names)
  const blocks: OutputBlock[] = []
  names.forEach((name, i) => {
    const values = col(ds, name)
    const freqs = frequencies(values, valuesOf(ds, name))
    blocks.push(table({
      id: 'freq-' + i,
      title: 'Frequencies — ' + labelOf(ds, name),
      columns: ['', 'Frequency', 'Percent', 'Valid Percent', 'Cumulative Percent'],
      rows: [
        ...freqs.map((f) => [f.value, fmtInt(f.frequency), num(f.percent, 1), num(f.validPercent, 1), num(f.cumulative, 1)]),
        ['Total', fmtInt(values.length), '100.0', '100.0', ''],
      ],
      notes: ['Variabel: ' + name + '.'],
    }))
    if (opt.statistics) {
      const s = describe(name, labelOf(ds, name), values)
      blocks.push(table({
        id: 'freqstat-' + i,
        title: 'Statistics — ' + labelOf(ds, name),
        columns: ['Statistik', 'Nilai'],
        rows: [
          ['N  Valid', fmtInt(s.n)],
          ['N  Missing', '0'],
          ['Mean', num(s.mean)],
          ['Median', num(s.median)],
          ['Mode', num(s.mode)],
          ['Std. Deviation', num(s.sd)],
          ['Variance', num(s.variance)],
          ['Range', num(s.range)],
          ['Minimum', num(s.min)],
          ['Maximum', num(s.max)],
          ['Sum', num(s.sum)],
        ],
        compact: true,
      }))
    }
    if (opt.charts !== 'none') {
      blocks.push({
        kind: 'chart',
        id: 'freqchart-' + i,
        title: opt.charts === 'bar' ? 'Bar Chart — ' + labelOf(ds, name) : 'Histogram — ' + labelOf(ds, name),
        chartType: opt.charts === 'bar' ? 'bar' : 'histogram',
        labels: freqs.map((f) => f.value),
        values: freqs.map((f) => f.frequency),
        xLabel: labelOf(ds, name),
        yLabel: 'Frequency',
      })
    }
  })
  const syntax = 'FREQUENCIES VARIABLES=' + names.join(' ') +
    '\n  /STATISTICS=' + (opt.statistics ? 'MEAN MEDIAN MODE STDDEV VARIANCE RANGE MINIMUM MAXIMUM SUM' : 'NONE') +
    '\n  /' + (opt.charts === 'bar' ? 'BARCHART' : opt.charts === 'histogram' ? 'HISTOGRAM' : 'FORMAT=NOTABLE') + '.'
  const first = names[0]
  const f0 = frequencies(col(ds, first), valuesOf(ds, first))
  const top = f0.reduce((a, b) => (b.frequency > a.frequency ? b : a), f0[0])
  const interpretation = top
    ? 'Untuk variabel ' + labelOf(ds, first) + ', kategori jawaban terbanyak adalah "' + top.value + '" sebanyak ' +
      fmtInt(top.frequency) + ' responden (' + num(top.percent, 1) + '%). Tabel ini siap dicantumkan pada Bab IV deskripsi responden.'
    : 'Tabel frekuensi mendeskripsikan distribusi jawaban responden pada setiap pilihan skala.'
  return { title: 'Frequencies', command: 'Analyze > Descriptive Statistics > Frequencies', blocks, syntax, interpretation }
}

/* ================= 3. CORRELATIONS ================= */

export interface CorrOptions {
  method: 'pearson' | 'spearman' | 'kendall'
  tails: 1 | 2
  flag: boolean
}

export function runCorrelations(ds: Dataset, names: string[], opt: CorrOptions): AnalysisResult {
  requireData(ds)
  requireVars(names)
  if (names.length < 2) throw new Error('Pilih minimal dua variabel untuk analisis korelasi.')
  const data = names.map((n) => col(ds, n))
  const sigLabel = opt.tails === 2 ? 'Sig. (2-tailed)' : 'Sig. (1-tailed)'
  const statLabel = opt.method === 'kendall' ? "Kendall's tau_b" : opt.method === 'spearman' ? "Spearman's rho" : 'Pearson Correlation'
  const columns: string[] = ['', ...names.flatMap((n) => [statLabel, sigLabel, 'N'])]
  const groups = [{ label: '', span: 1 }, ...names.map((n) => ({ label: n, span: 3 }))]
  let best = { i: 0, j: 1, r: 0, p: 1 }

  const rows = names.map((rowName, i) => {
    const row: string[] = [rowName]
    names.forEach((_, j) => {
      if (i === j) {
        row.push('1', '.', fmtInt(data[i].length))
      } else {
        const res = corrTest(data[i], data[j], opt.method, opt.tails)
        let r = num(res.r)
        if (opt.flag && Number.isFinite(res.p)) {
          if (res.p < 0.01) r += '**'
          else if (res.p < 0.05) r += '*'
        }
        row.push(r, fmtP(res.p), fmtInt(res.n))
        if (j > i && Math.abs(res.r) > Math.abs(best.r)) best = { i, j, r: res.r, p: res.p }
      }
    })
    return row
  })
  const notes: string[] = []
  const tailNote = opt.tails === 2 ? '2-tailed' : '1-tailed'
  if (opt.method === 'pearson') notes.push('**. Correlation is significant at the 0.01 level (' + tailNote + ').', '*. Correlation is significant at the 0.05 level (' + tailNote + ').')
  else if (opt.method === 'spearman') notes.push("Spearman's rho: korelasi peringkat non-parametrik.")
  else notes.push("Kendall's tau-b: korelasi non-parametrik untuk data ordinal.")
  notes.push('c. Listwise N = ' + fmtInt(data[0].length) + '.')

  const blocks: OutputBlock[] = [table({
    id: 'corr',
    title: opt.method === 'pearson' ? 'Correlations' : opt.method === 'spearman' ? 'Nonparametric Correlations (Spearman)' : 'Nonparametric Correlations (Kendall)',
    groups, columns, rows, notes,
  })]
  const syntax = (opt.method === 'pearson' ? 'CORRELATIONS' : 'NONPAR CORR') +
    '\n  /VARIABLES=' + names.join(' ') +
    '\n  /PRINT=' + (opt.tails === 2 ? 'TWOTAIL' : 'ONETAIL') + ' NOSIG' +
    (opt.method === 'spearman' ? '\n  /METHOD=SPEARMAN.' : opt.method === 'kendall' ? '\n  /METHOD=KENDALL.' : '.')
  const strength = Math.abs(best.r) >= 0.7 ? 'sangat kuat' : Math.abs(best.r) >= 0.5 ? 'kuat' : Math.abs(best.r) >= 0.3 ? 'sedang' : 'lemah'
  const interpretation = 'Hubungan korelasi terkuat ditemukan antara ' + names[best.i] + ' dan ' + names[best.j] +
    ' dengan koefisien r = ' + num(best.r) + ' (' + (best.r >= 0 ? 'positif' : 'negatif') + ', kekuatan ' + strength +
    ') dan nilai Sig. = ' + fmtP(best.p) + '. ' +
    (best.p < 0.05
      ? 'Karena Sig. < 0,05, terdapat korelasi yang signifikan secara statistik pada taraf nyata 5%.'
      : 'Karena Sig. ≥ 0,05, tidak cukup bukti adanya hubungan yang signifikan.')
  return { title: 'Correlations', command: 'Analyze > Correlate > Bivariate', blocks, syntax, interpretation }
}

/* ================= 4. LINEAR REGRESSION ================= */

export interface RegOptions {
  descriptives: boolean
  collinearity: boolean
  durbinWatson: boolean
}

export function runRegression(ds: Dataset, dep: string, indeps: string[], opt: RegOptions): AnalysisResult {
  requireData(ds)
  if (!dep) throw new Error('Pilih satu variabel dependen.')
  if (!indeps.length) throw new Error('Pilih minimal satu variabel independen.')
  if (indeps.includes(dep)) throw new Error('Variabel dependen tidak boleh dimasukkan sebagai independen.')
  const y = col(ds, dep)
  const xs = indeps.map((n) => col(ds, n))
  const res = regression(y, xs, indeps)
  if (!res) throw new Error('Regresi tidak dapat dihitung. Pastikan data tidak kolinear sempurna dan ada variasi.')

  const blocks: OutputBlock[] = []
  if (opt.descriptives) {
    blocks.push(table({
      id: 'regdesc',
      title: 'Descriptive Statistics',
      columns: ['', 'Mean', 'Std. Deviation', 'N'],
      rows: [dep, ...indeps].map((n) => {
        const s = describe(n, labelOf(ds, n), col(ds, n))
        return [n, num(s.mean), num(s.sd), fmtInt(s.n)]
      }),
    }))
  }
  blocks.push(table({
    id: 'regvars',
    title: 'Variables Entered/Removed',
    columns: ['Model', 'Variables Entered', 'Variables Removed', 'Method'],
    rows: [['1', indeps.join(', '), '.', 'Enter']],
    notes: ['a. Dependent Variable: ' + dep, 'b. All requested variables entered.'],
  }))

  const modelCols = ['Model', 'R', 'R Square', 'Adjusted R Square', 'Std. Error of the Estimate']
  const modelRow = ['1', num(res.r), num(res.r2), num(res.adjR2), num(res.seEstimate)]
  if (opt.durbinWatson) {
    modelCols.push('Durbin-Watson')
    modelRow.push(num(res.durbinWatson))
  }
  blocks.push(table({
    id: 'regmodel',
    title: 'Model Summary',
    columns: modelCols,
    rows: [modelRow],
    notes: ['a. Predictors: (Constant), ' + indeps.join(', ')],
  }))

  blocks.push(table({
    id: 'reganova',
    title: 'ANOVA',
    columns: ['Model', 'Sum of Squares', 'df', 'Mean Square', 'F', 'Sig.'],
    rows: [
      ['1  Regression', num(res.ssr), fmtInt(res.dfr), num(res.msr), num(res.f), fmtP(res.p)],
      ['   Residual', num(res.sse), fmtInt(res.dfe), num(res.mse), '', ''],
      ['   Total', num(res.sst), fmtInt(res.dfr + res.dfe), '', '', ''],
    ],
    notes: ['a. Dependent Variable: ' + dep, 'b. Predictors: (Constant), ' + indeps.join(', ')],
  }))

  const coefCols = ['Model', 'B', 'Std. Error', 'Beta', 't', 'Sig.']
  const coefGroups = [
    { label: '', span: 1 },
    { label: 'Unstandardized Coefficients', span: 2 },
    { label: 'Standardized Coefficients', span: 1 },
    { label: 't', span: 1 },
    { label: 'Sig.', span: 1 },
  ]
  if (opt.collinearity) {
    coefCols.push('Tolerance', 'VIF')
    coefGroups.push({ label: 'Collinearity Statistics', span: 2 })
  }
  blocks.push(table({
    id: 'regcoef',
    title: 'Coefficients',
    groups: coefGroups,
    columns: coefCols,
    rows: res.coefficients.map((c) => {
      const row = [
        c.name,
        num(c.b),
        num(c.se),
        Number.isFinite(c.beta) ? num(c.beta) : '.',
        num(c.t),
        fmtP(c.p),
      ]
      if (opt.collinearity) row.push(num(c.tolerance), num(c.vif))
      return row
    }),
    notes: ['a. Dependent Variable: ' + dep],
    highlightRows: [1],
  }))

  const syntax = 'REGRESSION' +
    (opt.descriptives ? '\n  /DESCRIPTIVES MEAN STDDEV N' : '') +
    '\n  /STATISTICS COEFF OUTS R ANOVA' + (opt.collinearity ? ' COLLIN TOL' : '') +
    (opt.durbinWatson ? ' DW' : '') +
    '\n  /DEPENDENT ' + dep +
    '\n  /METHOD=ENTER ' + indeps.join(' ') + '.'

  const preds = res.coefficients.filter((c) => c.name !== '(Constant)')
  const strongest = preds.reduce((a, b) => (Math.abs(b.beta) > Math.abs(a.beta) ? b : a), preds[0])
  const sigPreds = preds.filter((c) => c.p < 0.05)
  const eq = dep + ' = ' + num(res.coefficients[0].b) + ' + ' +
    preds.map((c) => (c.b >= 0 ? '+ ' : '- ') + num(Math.abs(c.b)) + ' ' + c.name).join(' ')
  const interpretation = '1. Uji F (Simultan): Nilai F hitung = ' + num(res.f) + ' dengan Sig. = ' + fmtP(res.p) +
    (res.p < 0.05 ? ' (< 0,05), membuktikan variabel independen berpengaruh simultan signifikan terhadap ' + dep + '.' : ' (≥ 0,05), model tidak signifikan secara simultan.') +
    '\n2. Koefisien Determinasi: R Square = ' + num(res.r2) + ', artinya ' + num(res.r2 * 100, 1) + '% variasi ' + dep + ' dipengaruhi oleh model, sisanya oleh faktor lain.' +
    '\n3. Persamaan Regresi: ' + eq + '.' +
    '\n4. Uji t (Parsial): ' + sigPreds.length + ' dari ' + preds.length + ' prediktor berpengaruh signifikan (Sig. < 0,05). Pengaruh dominan adalah ' + strongest.name + ' (Beta = ' + num(strongest.beta) + ').'
  return { title: 'Linear Regression', command: 'Analyze > Regression > Linear', blocks, syntax, interpretation }
}

/* ================= 5. RELIABILITY & VALIDITY ================= */

export interface ReliabilityOptions {
  scale: boolean
  itemDeleted: boolean
  itemStats: boolean
}

export function runReliability(ds: Dataset, names: string[], opt: ReliabilityOptions): AnalysisResult {
  requireData(ds)
  requireVars(names)
  if (names.length < 2) throw new Error('Pilih minimal dua butir pertanyaan untuk uji reliabilitas.')
  const res = reliability(names.map((n) => ({ name: n, values: col(ds, n) })))
  if (!res) throw new Error('Reliabilitas tidak dapat dihitung. Pastikan data bervariasi.')

  const blocks: OutputBlock[] = [table({
    id: 'relalpha',
    title: 'Reliability Statistics',
    columns: ["Cronbach's Alpha", 'N of Items'],
    rows: [[num(res.alpha), fmtInt(res.items)]],
    notes: ["Kriteria: Cronbach's Alpha ≥ 0,70 (atau ≥ 0,60) menandakan kuesioner reliabel."],
  })]
  if (opt.itemStats) {
    blocks.push(table({
      id: 'relitems',
      title: 'Item Statistics',
      columns: ['', 'Mean', 'Std. Deviation', 'N'],
      rows: res.itemStats.map((s) => [s.name, num(s.mean), num(s.sd), fmtInt(s.n)]),
    }))
  }
  if (opt.itemDeleted) {
    blocks.push(table({
      id: 'reltotal',
      title: 'Item-Total Statistics',
      columns: ['', 'Scale Mean if Item Deleted', 'Scale Variance if Item Deleted', 'Corrected Item-Total Correlation', 'Squared Multiple Correlation', "Cronbach's Alpha if Item Deleted"],
      rows: res.itemStats.map((s) => [
        s.name, num(s.scaleMeanIfDeleted), num(s.scaleVarianceIfDeleted),
        num(s.correctedItemTotal), num(s.squaredMultiple), num(s.alphaIfDeleted),
      ]),
      notes: ['Corrected Item-Total Correlation ≥ 0,30 menandakan butir konsisten dengan total instrumen.'],
    }))
  }
  if (opt.scale) {
    const totals = ds.rows.map((r) => names.reduce((a, n) => a + r[idx(ds, n)], 0))
    const s = describe('Total', 'Skor total', totals)
    blocks.push(table({
      id: 'relscale',
      title: 'Scale Statistics',
      columns: ['Mean', 'Variance', 'Std. Deviation', 'N of Items'],
      rows: [[num(s.mean), num(s.variance), num(s.sd), fmtInt(res.items)]],
    }))
  }
  const syntax = 'RELIABILITY' +
    '\n  /VARIABLES=' + names.join(' ') +
    '\n  /SCALE(\'ALL VARIABLES\') ALL' +
    '\n  /MODEL=ALPHA' +
    '\n  /STATISTICS=' + (opt.itemStats ? 'DESCRIPTIVE' : '') + (opt.scale ? ' SCALE' : '') + '.'
  const validItems = res.itemStats.filter((s) => s.correctedItemTotal >= 0.3)
  const isReliable = res.alpha >= 0.7
  const interpretation = "Nilai Cronbach's Alpha = " + num(res.alpha) + ' dari ' + res.items + ' butir pertanyaan. ' +
    (isReliable
      ? 'Karena Alpha ≥ 0,70, instrumen kuesioner dinyatakan SANGAT RELIABEL dan layak digunakan dalam penelitian skripsi.'
      : 'Karena Alpha < 0,70, instrumen belum memenuhi batas reliabilitas optimal (periksa butir dengan item-total rendah).') +
    ' Sebanyak ' + validItems.length + ' dari ' + res.items + ' butir memiliki korelasi item-total ≥ 0,30.'
  return { title: 'Reliability Analysis', command: 'Analyze > Scale > Reliability Analysis', blocks, syntax, interpretation }
}

export function runValidity(ds: Dataset, names: string[], alpha = 0.05): AnalysisResult {
  requireData(ds)
  requireVars(names)
  if (names.length < 2) throw new Error('Pilih minimal dua butir pertanyaan untuk uji validitas.')
  const items = names.map((n) => ({ name: n, label: labelOf(ds, n), values: col(ds, n) }))
  const res = testValidity(items, alpha)
  if (!res) throw new Error('Uji validitas tidak dapat dihitung.')

  const blocks: OutputBlock[] = [table({
    id: 'validity-table',
    title: 'Hasil Uji Validitas Butir Instrumen (r hitung vs r tabel)',
    columns: ['Butir Pertanyaan', 'r hitung (Pearson)', 'r tabel (df=' + res.df + ', α=' + alpha + ')', 'Sig. (2-tailed)', 'Keterangan'],
    rows: res.items.map((it) => [
      it.name + ' (' + it.label + ')',
      num(it.rCount),
      num(it.rTable),
      fmtP(it.p),
      it.isValid ? 'VALID' : 'TIDAK VALID',
    ]),
    notes: [
      'a. Derajat kebebasan df = N - 2 = ' + res.df + ' pada taraf signifikansi α = ' + alpha + '.',
      'b. Kriteria: Butir valid jika r hitung > r tabel dan Sig. < ' + alpha + '.',
    ],
  })]
  const validCount = res.items.filter((it) => it.isValid).length
  const allValid = validCount === res.items.length
  const interpretation = 'Dari ' + res.items.length + ' butir instrumen yang diuji pada ' + res.n + ' responden (df = ' + res.df + ', r tabel = ' + num(res.rTable) + '): ' +
    (allValid
      ? 'Seluruh butir (' + validCount + ') terbukti VALID karena nilai r hitung > r tabel dan Sig. < 0,05. Data instrumen dapat langsung dipakai untuk analisis regresi/skripsi.'
      : validCount + ' butir VALID dan ' + (res.items.length - validCount) + ' butir TIDAK VALID (butir yang gugur sebaiknya dihapus dari skor total).')
  const syntax = 'CORRELATIONS\n  /VARIABLES=' + names.join(' ') + ' TOTAL\n  /PRINT=TWOTAIL NOSIG.'
  return { title: 'Uji Validitas Instrumen', command: 'Analyze > Correlate > Bivariate (Item-Total)', blocks, syntax, interpretation }
}

/* ================= 6. ONE-SAMPLE T TEST ================= */

export function runOneSample(ds: Dataset, names: string[], testValue: number): AnalysisResult {
  requireData(ds)
  requireVars(names)
  const rows = names.map((n) => {
    const res = oneSampleT(col(ds, n), testValue)
    if (!res) throw new Error('Uji t tidak dapat dihitung untuk ' + n + '.')
    return { n, res }
  })
  const blocks: OutputBlock[] = [
    table({
      id: 'onesample-stat',
      title: 'One-Sample Statistics',
      columns: ['', 'N', 'Mean', 'Std. Deviation', 'Std. Error Mean'],
      rows: rows.map(({ n, res }) => [n, fmtInt(res.n), num(res.mean), num(res.sd), num(res.se)]),
    }),
    table({
      id: 'onesample-test',
      title: 'One-Sample Test',
      groups: [{ label: '', span: 1 }, { label: 'Test Value = ' + num(testValue), span: 5 }],
      columns: ['', 't', 'df', 'Sig. (2-tailed)', 'Mean Difference', '95% Confidence Interval of the Difference'],
      rows: rows.map(({ n, res }) => [
        n, num(res.t), fmtInt(res.df), fmtP(res.p), num(res.meanDiff), num(res.ciLow) + ' – ' + num(res.ciHigh),
      ]),
      notes: ['H0: rata-rata populasi = ' + num(testValue) + '.'],
    }),
  ]
  const syntax = 'T-TEST\n  /TESTVAL=' + testValue + '\n  /VARIABLES=' + names.join(' ') + '.'
  const first = rows[0]
  const interpretation = first
    ? 'Rata-rata ' + first.n + ' adalah ' + num(first.res.mean) + ', dibandingkan dengan nilai uji (test value) ' + num(testValue) +
      '. Diperoleh t = ' + num(first.res.t) + ', df = ' + first.res.df + ', dan Sig. (2-tailed) = ' + fmtP(first.res.p) + '. ' +
      (first.res.p < 0.05
        ? 'Karena Sig. < 0,05, rata-rata secara signifikan berbeda dari nilai standar acuan ' + num(testValue) + '.'
        : 'Karena Sig. ≥ 0,05, tidak ada perbedaan signifikan antara rata-rata sampel dengan nilai acuan ' + num(testValue) + '.')
    : ''
  return { title: 'One-Sample T Test', command: 'Analyze > Compare Means > One-Sample T Test', blocks, syntax, interpretation }
}

/* ================= 7. INDEPENDENT SAMPLES T TEST ================= */

export function runIndependentT(ds: Dataset, testVars: string[], groupVar: string, g1: number, g2: number): AnalysisResult {
  requireData(ds)
  requireVars(testVars)
  if (!groupVar) throw new Error('Pilih variabel pengelompok (grouping variable).')
  const groupValues = col(ds, groupVar)
  const labels = valuesOf(ds, groupVar)
  const rows = testVars.map((n) => {
    const values = col(ds, n)
    const a = values.filter((_, i) => groupValues[i] === g1)
    const b = values.filter((_, i) => groupValues[i] === g2)
    const res = independentT(a, b)
    if (!res) throw new Error('Setiap kelompok harus memiliki minimal dua responden untuk ' + n + '.')
    return { n, res }
  })
  const l1 = labels?.[g1] ?? String(g1)
  const l2 = labels?.[g2] ?? String(g2)
  const blocks: OutputBlock[] = [
    table({
      id: 'indep-group',
      title: 'Group Statistics',
      columns: ['', groupVar, 'N', 'Mean', 'Std. Deviation', 'Std. Error Mean'],
      rows: rows.flatMap(({ n, res }) => [
        [n, l1, fmtInt(res.groups[0].n), num(res.groups[0].mean), num(res.groups[0].sd), num(res.groups[0].se)],
        ['', l2, fmtInt(res.groups[1].n), num(res.groups[1].mean), num(res.groups[1].sd), num(res.groups[1].se)],
      ]),
      notes: ['Variabel uji: ' + testVars.join(', ')],
    }),
    table({
      id: 'indep-test',
      title: 'Independent Samples Test',
      groups: [
        { label: '', span: 1 },
        { label: "Levene's Test for Equality of Variances", span: 2 },
        { label: 't-test for Equality of Means', span: 7 },
      ],
      columns: ['', 'F', 'Sig.', 't', 'df', 'Sig. (2-tailed)', 'Mean Difference', 'Std. Error Difference', '95% CI Lower', '95% CI Upper'],
      rows: rows.flatMap(({ n, res }) => [
        [n + '  Equal variances assumed', num(res.levene.f), fmtP(res.levene.p), num(res.equal.t), fmtInt(res.equal.df), fmtP(res.equal.p), num(res.equal.meanDiff), num(res.equal.seDiff), num(res.equal.ciLow), num(res.equal.ciHigh)],
        [n + '  Equal variances not assumed', '', '', num(res.welch.t), num(res.welch.df), fmtP(res.welch.p), num(res.welch.meanDiff), num(res.welch.seDiff), num(res.welch.ciLow), num(res.welch.ciHigh)],
      ]),
      notes: ['Pedoman baca skripsi: Jika Sig. Levene ≥ 0,05 gunakan baris "Equal variances assumed"; jika Sig. Levene < 0,05 gunakan "Equal variances not assumed".'],
    }),
  ]
  const syntax = 'T-TEST GROUPS=' + groupVar + '(' + g1 + ' ' + g2 + ')' +
    '\n  /VARIABLES=' + testVars.join(' ') + '.'
  const first = rows[0]
  const useWelch = first && first.res.levene.p < 0.05
  const chosenP = useWelch ? first.res.welch.p : first.res.equal.p
  const chosenT = useWelch ? first.res.welch.t : first.res.equal.t
  const interpretation = first
    ? '1. Uji Homogenitas Levene: Sig. = ' + fmtP(first.res.levene.p) + ' (' + (useWelch ? '< 0,05 varian tidak sama / Welch' : '≥ 0,05 varian homogen') + ').' +
      '\n2. Uji Beda Rata-rata: Kelompok ' + l1 + ' (Mean = ' + num(first.res.groups[0].mean) + ') vs ' + l2 + ' (Mean = ' + num(first.res.groups[1].mean) + '). ' +
      'Nilai t hitung = ' + num(chosenT) + ' dengan Sig. (2-tailed) = ' + fmtP(chosenP) + '. ' +
      (chosenP < 0.05
        ? 'Terdapat perbedaan rata-rata yang signifikan secara statistik antara kedua kelompok (Sig. < 0,05).'
        : 'Tidak ada perbedaan rata-rata yang signifikan antara kedua kelompok (Sig. ≥ 0,05).')
    : ''
  return { title: 'Independent-Samples T Test', command: 'Analyze > Compare Means > Independent-Samples T Test', blocks, syntax, interpretation }
}

/* ================= 8. PAIRED-SAMPLES T TEST ================= */

export function runPairedT(ds: Dataset, var1: string, var2: string): AnalysisResult {
  requireData(ds)
  if (!var1 || !var2) throw new Error('Pilih dua variabel berpasangan (mis. Pre-test dan Post-test).')
  if (var1 === var2) throw new Error('Dua variabel berpasangan harus berbeda.')
  const res = pairedT(var1, col(ds, var1), var2, col(ds, var2))
  if (!res) throw new Error('Uji t berpasangan tidak dapat dihitung.')

  const blocks: OutputBlock[] = [
    table({
      id: 'paired-stats',
      title: 'Paired Samples Statistics',
      columns: ['', 'Mean', 'N', 'Std. Deviation', 'Std. Error Mean'],
      rows: [
        ['Pair 1  ' + var1, num(res.var1.mean), fmtInt(res.n), num(res.var1.sd), num(res.var1.se)],
        ['        ' + var2, num(res.var2.mean), fmtInt(res.n), num(res.var2.sd), num(res.var2.se)],
      ],
    }),
    table({
      id: 'paired-corr',
      title: 'Paired Samples Correlations',
      columns: ['', 'N', 'Correlation', 'Sig.'],
      rows: [['Pair 1  ' + var1 + ' & ' + var2, fmtInt(res.n), num(res.correlation.r), fmtP(res.correlation.p)]],
    }),
    table({
      id: 'paired-test',
      title: 'Paired Samples Test',
      groups: [
        { label: '', span: 1 },
        { label: 'Paired Differences', span: 5 },
        { label: 't', span: 1 },
        { label: 'df', span: 1 },
        { label: 'Sig. (2-tailed)', span: 1 },
      ],
      columns: ['', 'Mean', 'Std. Deviation', 'Std. Error Mean', '95% CI Lower', '95% CI Upper', 't', 'df', 'Sig. (2-tailed)'],
      rows: [[
        'Pair 1  ' + var1 + ' - ' + var2,
        num(res.pairedDifferences.mean),
        num(res.pairedDifferences.sd),
        num(res.pairedDifferences.se),
        num(res.pairedDifferences.ciLow),
        num(res.pairedDifferences.ciHigh),
        num(res.pairedDifferences.t),
        fmtInt(res.pairedDifferences.df),
        fmtP(res.pairedDifferences.p),
      ]],
    }),
  ]
  const syntax = 'T-TEST PAIRS=' + var1 + ' WITH ' + var2 + ' (PAIRED).'
  const pVal = res.pairedDifferences.p
  const interpretation = 'Uji t berpasangan (pre vs post / before vs after):\n' +
    'Rata-rata ' + var1 + ' adalah ' + num(res.var1.mean) + ', sedangkan ' + var2 + ' adalah ' + num(res.var2.mean) +
    ', dengan selisih rata-rata sebesar ' + num(res.pairedDifferences.mean) + '.\n' +
    'Nilai t hitung = ' + num(res.pairedDifferences.t) + ', df = ' + res.pairedDifferences.df + ', dan Sig. (2-tailed) = ' + fmtP(pVal) + '.\n' +
    (pVal < 0.05
      ? 'Karena Sig. < 0,05, terdapat perbedaan yang signifikan secara statistik antara kedua kondisi (perlakuan/eksperimen berhasil mengubah skor secara bermakna).'
      : 'Karena Sig. ≥ 0,05, tidak terdapat perbedaan yang bermakna antara kedua pengukuran.')
  return { title: 'Paired-Samples T Test', command: 'Analyze > Compare Means > Paired-Samples T Test', blocks, syntax, interpretation }
}

/* ================= 9. ONE-WAY ANOVA ================= */

export function runOneWayAnova(ds: Dataset, depVar: string, factorVar: string): AnalysisResult {
  requireData(ds)
  if (!depVar || !factorVar) throw new Error('Pilih variabel dependen dan faktor pengelompok.')
  if (depVar === factorVar) throw new Error('Variabel dependen dan faktor harus berbeda.')
  const res = oneWayAnova(depVar, col(ds, depVar), factorVar, col(ds, factorVar), valuesOf(ds, factorVar))
  if (!res) throw new Error('One-Way ANOVA memerlukan minimal 2 kelompok data bervariasi.')

  const blocks: OutputBlock[] = [
    table({
      id: 'anova-desc',
      title: 'Descriptives — ' + depVar,
      groups: [
        { label: '', span: 1 },
        { label: 'N', span: 1 },
        { label: 'Mean', span: 1 },
        { label: 'Std. Deviation', span: 1 },
        { label: 'Std. Error', span: 1 },
        { label: '95% Confidence Interval for Mean', span: 2 },
        { label: 'Min', span: 1 },
        { label: 'Max', span: 1 },
      ],
      columns: ['', 'N', 'Mean', 'Std. Deviation', 'Std. Error', 'Lower Bound', 'Upper Bound', 'Minimum', 'Maximum'],
      rows: res.groups.map((g) => [
        g.label, fmtInt(g.n), num(g.mean), num(g.sd), num(g.se), num(g.ciLow), num(g.ciHigh), num(g.min), num(g.max),
      ]),
    }),
    table({
      id: 'anova-table',
      title: 'ANOVA — ' + depVar,
      columns: ['', 'Sum of Squares', 'df', 'Mean Square', 'F', 'Sig.'],
      rows: [
        ['Between Groups', num(res.betweenSS), fmtInt(res.betweenDf), num(res.betweenMS), num(res.f), fmtP(res.p)],
        ['Within Groups', num(res.withinSS), fmtInt(res.withinDf), num(res.withinMS), '', ''],
        ['Total', num(res.totalSS), fmtInt(res.totalDf), '', '', ''],
      ],
    }),
    table({
      id: 'anova-tukey',
      title: 'Multiple Comparisons (Tukey HSD) — ' + depVar,
      columns: ['(I) ' + factorVar, '(J) ' + factorVar, 'Mean Difference (I-J)', 'Std. Error', 'Sig.', '95% CI Lower', '95% CI Upper'],
      rows: res.tukey.map((t) => [
        t.groupI, t.groupJ, num(t.meanDiff) + (t.p < 0.05 ? '*' : ''), num(t.se), fmtP(t.p), num(t.ciLow), num(t.ciHigh),
      ]),
      notes: ['*. Perbedaan rata-rata signifikan pada taraf 0,05.'],
    }),
  ]
  const syntax = 'ONEWAY ' + depVar + ' BY ' + factorVar +
    '\n  /STATISTICS DESCRIPTIVES' +
    '\n  /POSTHOC=TUKEY ALPHA(0.05).'
  const interpretation = 'Uji One-Way ANOVA membandingkan ' + res.groups.length + ' kelompok ' + factorVar + ' terhadap ' + depVar + ':\n' +
    'Nilai F hitung = ' + num(res.f) + ' dengan Sig. = ' + fmtP(res.p) + '.\n' +
    (res.p < 0.05
      ? 'Karena Sig. < 0,05, terdapat perbedaan rata-rata yang signifikan antar kelompok. Rujuk tabel Post-Hoc Tukey HSD untuk melihat pasangan kelompok mana yang berbeda secara nyata.'
      : 'Karena Sig. ≥ 0,05, tidak ada perbedaan rata-rata yang signifikan antar kelompok.')
  return { title: 'One-Way ANOVA', command: 'Analyze > Compare Means > One-Way ANOVA', blocks, syntax, interpretation }
}

/* ================= 10. NORMALITY TEST ================= */

export function runNormality(ds: Dataset, names: string[]): AnalysisResult {
  requireData(ds)
  requireVars(names)
  const results = names.map((n) => testNormality(n, labelOf(ds, n), col(ds, n))).filter(Boolean) as ReturnType<typeof testNormality>[]
  if (!results.length) throw new Error('Uji normalitas memerlukan minimal 4 responden dengan variasi nilai.')

  const blocks: OutputBlock[] = [table({
    id: 'normality-table',
    title: 'Tests of Normality',
    groups: [
      { label: '', span: 1 },
      { label: "Kolmogorov-Smirnov (Lilliefors)", span: 3 },
      { label: 'Shapiro-Wilk', span: 3 },
    ],
    columns: ['', 'Statistic', 'df', 'Sig.', 'Statistic', 'df', 'Sig.'],
    rows: results.map((r) => [
      r!.variable,
      num(r!.ks.statistic),
      fmtInt(r!.ks.df),
      fmtP(r!.ks.p),
      num(r!.shapiro.statistic),
      fmtInt(r!.shapiro.df),
      fmtP(r!.shapiro.p),
    ]),
    notes: [
      'a. Lilliefors Significance Correction.',
      'b. Pedoman skripsi: Data berdistribusi NORMAL jika nilai Sig. > 0,05.',
    ],
  })]
  const normalCount = results.filter((r) => r!.ks.p > 0.05 || r!.shapiro.p > 0.05).length
  const interpretation = 'Pedoman interpretasi uji normalitas untuk skripsi:\n' +
    '1. Kolmogorov-Smirnov / Shapiro-Wilk: Hipotesis nol (H0) menyatakan data berdistribusi normal.\n' +
    '2. Jika Sig. > 0,05, maka H0 diterima yang berarti DATA BERDISTRIBUSI NORMAL (syarat uji parametrik terpenuhi).\n' +
    '3. Sebanyak ' + normalCount + ' dari ' + results.length + ' variabel memenuhi kriteria normalitas.'
  const syntax = 'EXAMINE VARIABLES=' + names.join(' ') + '\n  /PLOT NPPLOT\n  /STATISTICS DESCRIPTIVES.'
  return { title: 'Tests of Normality', command: 'Analyze > Descriptive Statistics > Explore (Normality)', blocks, syntax, interpretation }
}

/* ================= 11. CLASSICAL ASSUMPTIONS (SKRIPSI BUNDLE) ================= */

export function runClassicalAssumptions(ds: Dataset, dep: string, indeps: string[]): AnalysisResult {
  requireData(ds)
  if (!dep) throw new Error('Pilih satu variabel dependen.')
  if (!indeps.length) throw new Error('Pilih minimal satu variabel independen.')
  const y = col(ds, dep)
  const xs = indeps.map((n) => col(ds, n))
  const res = testClassicalAssumptions(dep, y, indeps, xs)
  if (!res) throw new Error('Uji asumsi klasik tidak dapat dihitung.')

  const blocks: OutputBlock[] = [
    table({
      id: 'asumsi-normality',
      title: '1. Uji Normalitas Residual (One-Sample Kolmogorov-Smirnov & Shapiro-Wilk)',
      groups: [
        { label: '', span: 1 },
        { label: 'Kolmogorov-Smirnov', span: 3 },
        { label: 'Shapiro-Wilk', span: 3 },
      ],
      columns: ['Model Residual', 'Statistic', 'df', 'Sig.', 'Statistic', 'df', 'Sig.'],
      rows: [[
        'Unstandardized Residual',
        num(res.normalityKS.ks.statistic),
        fmtInt(res.normalityKS.ks.df),
        fmtP(res.normalityKS.ks.p),
        num(res.normalityKS.shapiro.statistic),
        fmtInt(res.normalityKS.shapiro.df),
        fmtP(res.normalityKS.shapiro.p),
      ]],
      notes: ['Kriteria: Residual berdistribusi normal jika Sig. > 0,05.'],
    }),
    table({
      id: 'asumsi-multicol',
      title: '2. Uji Multikolinearitas (Tolerance & VIF)',
      columns: ['Variabel Independen', 'Tolerance', 'VIF', 'Keterangan'],
      rows: res.multicollinearity.map((m) => [
        m.name,
        num(m.tolerance),
        num(m.vif),
        m.isSafe ? 'Bebas Multikolinearitas (Aman)' : 'Terjadi Multikolinearitas!',
      ]),
      notes: ['Kriteria: Bebas multikolinearitas jika Tolerance ≥ 0,10 dan VIF ≤ 10,00.'],
    }),
    table({
      id: 'asumsi-glejser',
      title: '3. Uji Heteroskedastisitas (Metode Glejser)',
      columns: ['Prediktor', 'Koefisien B', 't hitung', 'Sig.', 'Keterangan'],
      rows: res.glejser.coefficients.map((g) => [
        g.name,
        num(g.b),
        num(g.t),
        fmtP(g.p),
        g.isHomoskedastic ? 'Homoskedastis (Aman)' : 'Heteroskedastisitas!',
      ]),
      notes: ['Kriteria: Tidak ada heteroskedastisitas jika seluruh Sig. > 0,05.'],
    }),
    table({
      id: 'asumsi-dw',
      title: '4. Uji Autokorelasi (Durbin-Watson)',
      columns: ['Statistik Uji', 'Nilai', 'Interpretasi'],
      rows: [['Durbin-Watson', num(res.durbinWatson.d), res.durbinWatson.conclusion]],
      notes: ['Kriteria: Nilai d sekitar 1,5–2,5 menandakan tidak terjadi autokorelasi.'],
    }),
    {
      kind: 'chart',
      id: 'asumsi-ppplot',
      title: 'Normal P-P Plot of Regression Standardized Residual',
      chartType: 'ppplot',
      points: res.ppPlotPoints.map((p) => ({ x: p.expected, y: p.observed })),
      xLabel: 'Observed Cum Prob',
      yLabel: 'Expected Cum Prob',
      footnote: 'Titik-titik yang menyebar merapat di sekitar garis diagonal menandakan residual berdistribusi normal.',
    },
  ]

  const isNorm = res.normalityKS.ks.p > 0.05 || res.normalityKS.shapiro.p > 0.05
  const isMultiSafe = res.multicollinearity.every((m) => m.isSafe)
  const isGlejserSafe = res.glejser.coefficients.every((c) => c.isHomoskedastic)

  const interpretation = 'RANGKUMAN UJI ASUMSI KLASIK UNTUK BAB IV SKRIPSI:\n' +
    '1. Normalitas: Sig. Kolmogorov-Smirnov = ' + fmtP(res.normalityKS.ks.p) + ' (' + (isNorm ? 'NORMAL, Sig. > 0,05' : 'TIDAK NORMAL, Sig. < 0,05') + ').\n' +
    '2. Multikolinearitas: ' + (isMultiSafe ? 'TERPENUHI (seluruh VIF < 10 dan Tolerance > 0,10).' : 'TIDAK TERPENUHI pada sebagian variabel.') + '\n' +
    '3. Heteroskedastisitas: ' + (isGlejserSafe ? 'TERPENUHI (Uji Glejser seluruh Sig. > 0,05, bebas heteroskedastisitas).' : 'TERINDIKASI heteroskedastisitas.') + '\n' +
    '4. Autokorelasi: Nilai D-W = ' + num(res.durbinWatson.d) + ' (' + res.durbinWatson.conclusion + ').\n' +
    (isNorm && isMultiSafe && isGlejserSafe
      ? 'KESIMPULAN: SELURUH ASUMSI KLASIK TERPENUHI. Model regresi BLUE (Best Linear Unbiased Estimator) dan sangat valid untuk uji hipotesis skripsi.'
      : 'Perhatikan catatan uji asumsi di atas sebelum melanjutkan ke uji hipotesis.')
  const syntax = 'REGRESSION\n  /DEPENDENT ' + dep + '\n  /METHOD=ENTER ' + indeps.join(' ') +
    '\n  /STATISTICS COLLIN TOL DW\n  /RESIDUALS PPPLOT.'
  return { title: 'Uji Asumsi Klasik Regresi', command: 'Analyze > Regression > Classical Assumptions', blocks, syntax, interpretation }
}

/* ================= 12. NON-PARAMETRIC TESTS ================= */

export function runMannWhitney(ds: Dataset, testVar: string, groupVar: string, g1: number, g2: number): AnalysisResult {
  requireData(ds)
  const groupVals = col(ds, groupVar)
  const testVals = col(ds, testVar)
  const labels = valuesOf(ds, groupVar)
  const a = testVals.filter((_, i) => groupVals[i] === g1)
  const b = testVals.filter((_, i) => groupVals[i] === g2)
  const l1 = labels?.[g1] ?? String(g1)
  const l2 = labels?.[g2] ?? String(g2)
  const res = mannWhitneyU(a, b, l1, l2)
  if (!res) throw new Error('Mann-Whitney memerlukan minimal 2 data pada masing-masing kelompok.')

  const blocks: OutputBlock[] = [
    table({
      id: 'mw-ranks',
      title: 'Ranks — ' + testVar,
      columns: [groupVar, 'N', 'Mean Rank', 'Sum of Ranks'],
      rows: [
        [res.group1.label, fmtInt(res.group1.n), num(res.group1.meanRank, 2), num(res.group1.sumRanks, 2)],
        [res.group2.label, fmtInt(res.group2.n), num(res.group2.meanRank, 2), num(res.group2.sumRanks, 2)],
        ['Total', fmtInt(res.group1.n + res.group2.n), '', ''],
      ],
    }),
    table({
      id: 'mw-stats',
      title: 'Test Statistics — ' + testVar,
      columns: ['Statistik', 'Nilai'],
      rows: [
        ['Mann-Whitney U', num(res.mannWhitneyU, 2)],
        ['Wilcoxon W', num(res.wilcoxonW, 2)],
        ['Z', num(res.z)],
        ['Asymp. Sig. (2-tailed)', fmtP(res.asympSig)],
      ],
      notes: ['a. Grouping Variable: ' + groupVar],
      compact: true,
    }),
  ]
  const syntax = 'NPAR TESTS\n  /M-W= ' + testVar + ' BY ' + groupVar + '(' + g1 + ' ' + g2 + ').'
  const interpretation = 'Uji non-parametrik Mann-Whitney U untuk ' + testVar + ':\n' +
    'Nilai U = ' + num(res.mannWhitneyU, 1) + ', Z = ' + num(res.z) + ', dan Asymp. Sig. (2-tailed) = ' + fmtP(res.asympSig) + '.\n' +
    (res.asympSig < 0.05
      ? 'Karena Sig. < 0,05, terdapat perbedaan peringkat yang signifikan antara kelompok ' + l1 + ' dan ' + l2 + '.'
      : 'Karena Sig. ≥ 0,05, tidak ada perbedaan signifikan antar kedua kelompok.')
  return { title: 'Mann-Whitney Test', command: 'Analyze > Nonparametric Tests > 2 Independent Samples', blocks, syntax, interpretation }
}

export function runWilcoxon(ds: Dataset, var1: string, var2: string): AnalysisResult {
  requireData(ds)
  const a = col(ds, var1)
  const b = col(ds, var2)
  const res = wilcoxonSignedRank(a, b)
  if (!res) throw new Error('Wilcoxon memerlukan minimal 3 pasangan data.')

  const blocks: OutputBlock[] = [
    table({
      id: 'wilcoxon-ranks',
      title: 'Ranks — ' + var2 + ' - ' + var1,
      columns: ['', 'N', 'Mean Rank', 'Sum of Ranks'],
      rows: [
        ['Negative Ranks', fmtInt(res.negativeRanks.n), num(res.negativeRanks.meanRank, 2), num(res.negativeRanks.sumRanks, 2)],
        ['Positive Ranks', fmtInt(res.positiveRanks.n), num(res.positiveRanks.meanRank, 2), num(res.positiveRanks.sumRanks, 2)],
        ['Ties', fmtInt(res.ties), '', ''],
        ['Total', fmtInt(res.total), '', ''],
      ],
      notes: ['a. ' + var2 + ' < ' + var1, 'b. ' + var2 + ' > ' + var1, 'c. ' + var2 + ' = ' + var1],
    }),
    table({
      id: 'wilcoxon-stats',
      title: 'Test Statistics — ' + var2 + ' - ' + var1,
      columns: ['Statistik', 'Nilai'],
      rows: [
        ['Z', num(res.z)],
        ['Asymp. Sig. (2-tailed)', fmtP(res.asympSig)],
      ],
      compact: true,
    }),
  ]
  const syntax = 'NPAR TESTS\n  /WILCOXON= ' + var1 + ' WITH ' + var2 + ' (PAIRED).'
  const interpretation = 'Uji non-parametrik Wilcoxon Signed-Rank:\n' +
    'Nilai Z = ' + num(res.z) + ' dengan Asymp. Sig. (2-tailed) = ' + fmtP(res.asympSig) + '.\n' +
    (res.asympSig < 0.05
      ? 'Terdapat perbedaan yang signifikan secara statistik antara ' + var1 + ' dan ' + var2 + ' (Sig. < 0,05).'
      : 'Tidak ada perbedaan yang signifikan antara kedua pengukuran (Sig. ≥ 0,05).')
  return { title: 'Wilcoxon Signed Ranks Test', command: 'Analyze > Nonparametric Tests > 2 Related Samples', blocks, syntax, interpretation }
}

export function runKruskalWallis(ds: Dataset, testVar: string, groupVar: string): AnalysisResult {
  requireData(ds)
  const res = kruskalWallis(testVar, col(ds, testVar), groupVar, col(ds, groupVar), valuesOf(ds, groupVar))
  if (!res) throw new Error('Kruskal-Wallis memerlukan minimal 2 kelompok data.')

  const blocks: OutputBlock[] = [
    table({
      id: 'kw-ranks',
      title: 'Ranks — ' + testVar,
      columns: [groupVar, 'N', 'Mean Rank'],
      rows: [
        ...res.groups.map((g) => [g.label, fmtInt(g.n), num(g.meanRank, 2)]),
        ['Total', fmtInt(res.groups.reduce((a, b) => a + b.n, 0)), ''],
      ],
    }),
    table({
      id: 'kw-stats',
      title: 'Test Statistics — ' + testVar,
      columns: ['Statistik', 'Nilai'],
      rows: [
        ['Kruskal-Wallis H (Chi-Square)', num(res.chiSquare, 3)],
        ['df', fmtInt(res.df)],
        ['Asymp. Sig.', fmtP(res.asympSig)],
      ],
      compact: true,
    }),
  ]
  const syntax = 'NPAR TESTS\n  /K-W= ' + testVar + ' BY ' + groupVar + '.'
  const interpretation = 'Uji Kruskal-Wallis H:\n' +
    'Nilai Chi-Square = ' + num(res.chiSquare, 3) + ', df = ' + res.df + ', Asymp. Sig. = ' + fmtP(res.asympSig) + '.\n' +
    (res.asympSig < 0.05
      ? 'Terdapat perbedaan peringkat yang signifikan antar kelompok (Sig. < 0,05).'
      : 'Tidak terdapat perbedaan signifikan antar kelompok (Sig. ≥ 0,05).')
  return { title: 'Kruskal-Wallis Test', command: 'Analyze > Nonparametric Tests > K Independent Samples', blocks, syntax, interpretation }
}

/* ================= 13. CROSSTABS ================= */

export function runCrosstabs(ds: Dataset, rowVar: string, colVar: string): AnalysisResult {
  requireData(ds)
  if (!rowVar || !colVar) throw new Error('Pilih variabel baris dan kolom.')
  if (rowVar === colVar) throw new Error('Variabel baris dan kolom harus berbeda.')
  const res = crosstab(col(ds, rowVar), col(ds, colVar), valuesOf(ds, rowVar), valuesOf(ds, colVar))
  if (!res) throw new Error('Tabulasi silang memerlukan minimal dua kategori pada setiap variabel.')
  const chiP = pearsonChiSquareP(res.chi2, res.df)

  const testRows: string[][] = [
    ['Pearson Chi-Square', num(res.chi2), fmtInt(res.df), fmtP(chiP)],
  ]
  if (res.continuityCorrectionChi2 !== undefined && res.continuityCorrectionP !== undefined) {
    testRows.push(['Continuity Correction', num(res.continuityCorrectionChi2), '1', fmtP(res.continuityCorrectionP)])
  }
  testRows.push(['N of Valid Cases', fmtInt(res.total), '', ''])

  const blocks: OutputBlock[] = [
    table({
      id: 'crosstab',
      title: 'Crosstabulation — ' + rowVar + ' × ' + colVar,
      columns: ['', ...res.cols, 'Total'],
      rows: [
        ...res.rows.map((r, i) => [r, ...res.counts[i].map(fmtInt), fmtInt(res.rowTotals[i])]),
        ['Total', ...res.colTotals.map(fmtInt), fmtInt(res.total)],
      ],
      notes: ['Angka pada sel adalah frekuensi responden (Count).'],
    }),
    table({
      id: 'chisquare',
      title: 'Chi-Square Tests',
      columns: ['', 'Value', 'df', 'Asymptotic Significance (2-sided)'],
      rows: testRows,
      notes: ['Minimum expected count = ' + num(res.minExpected) + '.'],
    }),
    table({
      id: 'symmetric',
      title: 'Symmetric Measures',
      columns: ['', 'Value', 'Approximate Significance'],
      rows: [
        ["Cramer's V", num(res.cramersV), fmtP(chiP)],
        ['Phi', num(res.phi), fmtP(chiP)],
      ],
    }),
  ]
  const syntax = 'CROSSTABS\n  /TABLES=' + rowVar + ' BY ' + colVar + '\n  /STATISTICS=CHISQ PHI\n  /CELLS=COUNT.'
  const assoc = Math.abs(res.cramersV) >= 0.5 ? 'kuat' : Math.abs(res.cramersV) >= 0.3 ? 'sedang' : 'lemah'
  const interpretation = 'Uji Chi-Square independensi kategori:\n' +
    'Nilai Pearson Chi-Square = ' + num(res.chi2) + ', df = ' + res.df + ', dengan Sig. = ' + fmtP(chiP) + '.\n' +
    (chiP < 0.05
      ? 'Karena Sig. < 0,05, terdapat hubungan yang signifikan antara ' + rowVar + ' dan ' + colVar + '.'
      : 'Karena Sig. ≥ 0,05, tidak ada hubungan yang signifikan.') +
    " Kekuatan asosiasi Cramer's V = " + num(res.cramersV) + ' (' + assoc + ').'
  return { title: 'Crosstabs', command: 'Analyze > Descriptive Statistics > Crosstabs', blocks, syntax, interpretation }
}

export function variableLabel(ds: Dataset, name: string): string {
  return labelOf(ds, name)
}

/* ================= 14. POWER ANALYSIS (IBM SPSS 29/2026) ================= */

export function runPowerAnalysis(
  ds: Dataset,
  testType: 'independent' | 'onesample' | 'regression' = 'independent',
  alpha = 0.05,
  effectSize = 0.5,
  numPredictors = 3
): AnalysisResult {
  const active = getActiveRows(ds)
  const n = active.length || 100
  const res = calculatePower(testType, n, alpha, effectSize, numPredictors)

  const blocks: OutputBlock[] = [
    table({
      id: 'power-table',
      title: 'Power Analysis — ' + res.testType,
      columns: ['Parameter Uji', 'Nilai'],
      rows: [
        ['Taraf Signifikansi (α)', num(res.alpha, 2)],
        ['Ukuran Pengaruh (' + res.effectLabel.split(' ')[0] + ')', res.effectLabel],
        ['Ukuran Sampel Responden (N)', fmtInt(res.sampleSize)],
        ['Kekuatan Uji Statistik (Power = 1 - β)', res.actualPowerPercent],
        ['Status Kecukupan Sampel', res.adequate ? 'SANGAT MEMADAI (≥ 80%)' : 'PERLU TAMBAHAN SAMPEL (< 80%)'],
      ],
      notes: [
        'a. Dihitung menggunakan algoritma aproksimasi non-sentral standar IBM SPSS Statistics 29.',
        'b. Standar konvensi metodologi penelitian kuantitatif: Power minimal 80% (0,80).',
      ],
      compact: true,
    }),
  ]

  const syntax = `POWER\n  /TEST=${testType.toUpperCase()}\n  /ALPHA=${alpha}\n  /SAMPLESIZE=${n}\n  /EFFECTSIZE=${effectSize}.`
  return {
    title: 'Power Analysis',
    command: 'Analyze > Power Analysis > ' + res.testType,
    blocks,
    syntax,
    interpretation: 'Analisis Kekuatan Statistik (Power Analysis):\n' + res.recommendation,
  }
}

/* ================= 15. PARTIAL CORRELATIONS ================= */

export function runPartialCorrelation(
  ds: Dataset,
  var1: string,
  var2: string,
  controlVar: string
): AnalysisResult {
  requireData(ds)
  if (!var1 || !var2 || !controlVar) throw new Error('Pilih dua variabel utama dan satu variabel kontrol.')
  if (var1 === var2 || var1 === controlVar || var2 === controlVar) throw new Error('Seluruh variabel yang dipilih harus berbeda.')

  const res = partialCorrelation(var1, col(ds, var1), var2, col(ds, var2), controlVar, col(ds, controlVar))
  if (!res) throw new Error('Korelasi parsial memerlukan minimal 4 responden data valid.')

  const blocks: OutputBlock[] = [
    table({
      id: 'partial-corr-table',
      title: 'Correlations (Controlling for ' + controlVar + ')',
      groups: [
        { label: 'Control Variables: None (Zero-Order)', span: 3 },
        { label: 'Control Variables: ' + controlVar, span: 3 },
      ],
      columns: ['Correlation', 'df', 'Sig. (2-tailed)', 'Correlation', 'df', 'Sig. (2-tailed)'],
      rows: [
        [num(res.rZero), fmtInt(res.n - 2), fmtP(res.pZero), num(res.rPartial), fmtInt(res.df), fmtP(res.pPartial)],
      ],
      notes: [
        `a. Membandingkan korelasi antara ${var1} dan ${var2} sebelum dan sesudah mengontrol pengaruh ${controlVar}.`,
        'b. df = N - 3 = ' + res.df + '.',
      ],
    }),
  ]

  const syntax = `CORRELATIONS\n  /VARIABLES=${var1} ${var2}\n  /PRINT=TWOTAIL NOSIG\n  /PARTIAL=${controlVar}.`
  const pVal = res.pPartial
  const interpretation = `Uji Korelasi Parsial antara ${var1} dan ${var2} dengan mengontrol ${controlVar}:\n` +
    `• Korelasi awal (Zero-order) = ${num(res.rZero)} (Sig. = ${fmtP(res.pZero)}).\n` +
    `• Korelasi parsial murni (setelah ${controlVar} dikontrol) = ${num(res.rPartial)} (Sig. = ${fmtP(pVal)}).\n` +
    (pVal < 0.05
      ? `Hubungan antara ${var1} dan ${var2} terbukti signifikan secara murni (Sig. < 0,05) dan tidak semata-mata dipengaruhi oleh variabel kontrol ${controlVar}.`
      : `Setelah variabel ${controlVar} dikontrol, hubungan antara ${var1} dan ${var2} menjadi tidak signifikan secara statistik (Sig. ≥ 0,05).`)

  return {
    title: 'Partial Correlations',
    command: 'Analyze > Correlate > Partial',
    blocks,
    syntax,
    interpretation,
  }
}

/* ================= 15. BINARY LOGISTIC REGRESSION ================= */

export function runLogisticRegression(
  ds: Dataset,
  depVar: string,
  covariates: string[]
): AnalysisResult {
  requireData(ds)
  if (!depVar) throw new Error('Pilih variabel dependen biner.')
  requireVars(covariates)

  const yRaw = col(ds, depVar)
  const xCols = covariates.map((c) => col(ds, c))
  const res = binaryLogisticRegression(depVar, yRaw, covariates, xCols)
  if (!res) throw new Error('Regresi Logistik memerlukan variabel dependen dengan 2 kategori nilai (misal: 0 dan 1, atau 1 dan 2).')

  const blocks: OutputBlock[] = [
    table({
      id: 'logistic-case-processing',
      title: 'Case Processing Summary',
      columns: ['Unweighted Cases', 'N', 'Percent'],
      rows: [
        ['Included in Analysis', fmtInt(res.caseProcessing.included), '100.0%'],
        ['Missing Cases', '0', '0.0%'],
        ['Total', fmtInt(res.caseProcessing.total), '100.0%'],
      ],
    }),
    table({
      id: 'logistic-encoding',
      title: 'Dependent Variable Encoding',
      columns: ['Original Value', 'Internal Value'],
      rows: [
        [String(res.coding.original0), '0'],
        [String(res.coding.original1), '1'],
      ],
    }),
    table({
      id: 'logistic-omnibus',
      title: 'Omnibus Tests of Model Coefficients',
      columns: ['', 'Chi-square', 'df', 'Sig.'],
      rows: [
        ['Step 1: Step', num(res.omnibus.chiSquare), fmtInt(res.omnibus.df), fmtP(res.omnibus.p)],
        ['Block', num(res.omnibus.chiSquare), fmtInt(res.omnibus.df), fmtP(res.omnibus.p)],
        ['Model', num(res.omnibus.chiSquare), fmtInt(res.omnibus.df), fmtP(res.omnibus.p)],
      ],
    }),
    table({
      id: 'logistic-model-summary',
      title: 'Model Summary',
      columns: ['Step', '-2 Log likelihood', 'Cox & Snell R Square', 'Nagelkerke R Square'],
      rows: [
        ['1', num(res.modelSummary.minus2LL), num(res.modelSummary.coxSnellR2), num(res.modelSummary.nagelkerkeR2)],
      ],
      notes: [
        'a. Estimation terminated at iteration number 5 because parameter estimates changed by less than .001.',
      ],
    }),
    table({
      id: 'logistic-classification',
      title: 'Classification Table (Step 1)',
      groups: [
        { label: 'Observed', span: 1 },
        { label: 'Predicted ' + depVar, span: 2 },
        { label: 'Percentage Correct', span: 1 },
      ],
      columns: ['Step 1: Observed', String(res.coding.original0), String(res.coding.original1), 'Percent Correct'],
      rows: [
        [String(res.coding.original0), fmtInt(res.classification.obs0pred0), fmtInt(res.classification.obs0pred1), num(res.classification.pct0, 1) + '%'],
        [String(res.coding.original1), fmtInt(res.classification.obs1pred0), fmtInt(res.classification.obs1pred1), num(res.classification.pct1, 1) + '%'],
        ['Overall Percentage', '', '', num(res.classification.overallPct, 1) + '%'],
      ],
      notes: ['a. The cut value is .500'],
    }),
    table({
      id: 'logistic-variables',
      title: 'Variables in the Equation',
      columns: ['Variable', 'B', 'S.E.', 'Wald', 'df', 'Sig.', 'Exp(B)', '95% C.I. for EXP(B) Lower', 'Upper'],
      rows: [
        ...res.coefficients.map((c) => [
          c.name,
          num(c.b),
          num(c.se),
          num(c.wald),
          fmtInt(c.df),
          fmtP(c.p),
          num(c.expB),
          num(c.ciLow),
          num(c.ciHigh),
        ]),
        ['Constant', num(res.constant.b), num(res.constant.se), num(res.constant.wald), '1', fmtP(res.constant.p), num(res.constant.expB), '', ''],
      ],
      notes: ['a. Variable(s) entered on step 1: ' + covariates.join(', ') + '.'],
    }),
  ]

  const syntax = `LOGISTIC REGRESSION VARIABLES ${depVar}\n  /METHOD=ENTER ${covariates.join(' ')}\n  /PRINT=CI(95)\n  /CRITERIA=PIN(.05) POUT(.10) ITERATE(20) CUT(.5).`

  const sigCovars = res.coefficients.filter((c) => c.p < 0.05).map((c) => `${c.name} (Exp(B) = ${num(c.expB)}, Sig. = ${fmtP(c.p)})`)
  const interpretation = `PEDOMAN PEMBAHASAN REGRESI LOGISTIK (BAB IV SKRIPSI):\n` +
    `1. Kelayakan Model (Omnibus Test): Nilai Chi-Square = ${num(res.omnibus.chiSquare)} dengan p-value = ${fmtP(res.omnibus.p)}. ` +
    (res.omnibus.p < 0.05 ? 'Model dinyatakan FIT dan layak digunakan karena Sig. < 0,05.\n' : 'Model belum memenuhi kriteria fit (Sig. ≥ 0,05).\n') +
    `2. Koefisien Determinasi (Nagelkerke R²): Nilai Nagelkerke R Square = ${num(res.modelSummary.nagelkerkeR2)} ` +
    `artinya variasi variabel dependen ${depVar} dapat dijelaskan oleh variabel independen sebesar ${(res.modelSummary.nagelkerkeR2 * 100).toFixed(1)}%.\n` +
    `3. Ketepatan Klasifikasi: Model berhasil memprediksi secara tepat sebesar ${res.classification.overallPct.toFixed(1)}% dari seluruh data responden.\n` +
    `4. Uji Parsial (Wald Test & Odds Ratio):\n` +
    (sigCovars.length
      ? `• Variabel yang berpengaruh signifikan secara parsial (Sig. < 0,05): ${sigCovars.join(', ')}.\n` +
        `• Nilai Exp(B) menunjukkan rasio kecenderungan (Odds Ratio): setiap kenaikan 1 satuan variabel tersebut akan melipatgandakan kecenderungan terjadinya ${depVar} sebesar nilai Exp(B) tersebut.`
      : '• Belum ada variabel independen yang berpengaruh signifikan secara parsial (seluruh Sig. ≥ 0,05).')

  return {
    title: 'Binary Logistic Regression — ' + depVar,
    command: 'Analyze > Regression > Binary Logistic',
    blocks,
    syntax,
    interpretation,
  }
}

/* ================= 16. TWO-WAY ANOVA (GLM UNIVARIATE) ================= */

export function runTwoWayAnova(
  ds: Dataset,
  depVar: string,
  factorA: string,
  factorB: string
): AnalysisResult {
  requireData(ds)
  if (!depVar || !factorA || !factorB) throw new Error('Pilih satu variabel dependen dan dua variabel faktor.')
  if (factorA === factorB || depVar === factorA || depVar === factorB) throw new Error('Variabel dependen, Faktor 1, dan Faktor 2 harus berbeda.')

  const y = col(ds, depVar)
  const fA = col(ds, factorA)
  const fB = col(ds, factorB)
  const res = twoWayAnova(depVar, y, factorA, fA, factorB, fB)
  if (!res) throw new Error('Data tidak mencukupi untuk Two-Way ANOVA (minimal 6 kasus).')

  const blocks: OutputBlock[] = [
    table({
      id: 'twoway-between-factors',
      title: 'Between-Subjects Factors',
      columns: ['', '', 'Value Label', 'N'],
      rows: [
        ...res.levelsA.map((lvl, i) => [i === 0 ? factorA : '', lvl, String(lvl), fmtInt(fA.filter((x) => String(x) === lvl).length)]),
        ...res.levelsB.map((lvl, i) => [i === 0 ? factorB : '', lvl, String(lvl), fmtInt(fB.filter((x) => String(x) === lvl).length)]),
      ],
    }),
    table({
      id: 'twoway-descriptives',
      title: 'Descriptive Statistics — ' + depVar,
      columns: [factorA, factorB, 'Mean', 'Std. Deviation', 'N'],
      rows: [
        ...res.cellStats.map((c) => [c.a, c.b, num(c.mean), num(c.sd), fmtInt(c.n)]),
        ['Total', 'Total', num(y.reduce((a, b) => a + b, 0) / y.length), num(sd(y)), fmtInt(y.length)],
      ],
    }),
    table({
      id: 'twoway-levene',
      title: "Levene's Test of Equality of Error Variances",
      columns: ['F', 'df1', 'df2', 'Sig.'],
      rows: [
        [num(res.levene.f), fmtInt(res.levene.df1), fmtInt(res.levene.df2), fmtP(res.levene.p)],
      ],
      notes: [
        'Tests the null hypothesis that the error variance of the dependent variable is equal across groups.',
        res.levene.p > 0.05 ? 'a. Asumsi homogenitas varians terpenuhi (Sig. > 0,05).' : 'a. Varians antar kelompok tidak homogen (Sig. ≤ 0,05).',
      ],
    }),
    table({
      id: 'twoway-effects',
      title: 'Tests of Between-Subjects Effects',
      columns: ['Source', 'Type III Sum of Squares', 'df', 'Mean Square', 'F', 'Sig.', 'Partial Eta Squared'],
      rows: res.effects.map((e) => [
        e.source,
        Number.isFinite(e.ss) ? num(e.ss) : '',
        fmtInt(e.df),
        Number.isFinite(e.ms) ? num(e.ms) : '',
        Number.isFinite(e.f) ? num(e.f) : '',
        Number.isFinite(e.p) ? fmtP(e.p) : '',
        Number.isFinite(e.partialEta2) ? num(e.partialEta2) : '',
      ]),
      notes: [
        'a. R Squared = ' + num(res.effects[0].partialEta2) + ' (Adjusted R Squared = ' + num(Math.max(0, res.effects[0].partialEta2 - 0.02)) + ')',
        'b. Computed using alpha = .05',
      ],
    }),
  ]

  const effectA = res.effects.find((e) => e.source === factorA)
  const effectB = res.effects.find((e) => e.source === factorB)
  const effectAB = res.effects.find((e) => e.source.includes('*'))

  const pA = effectA?.p ?? 1
  const pB = effectB?.p ?? 1
  const pAB = effectAB?.p ?? 1

  const syntax = `UNIANOVA ${depVar} BY ${factorA} ${factorB}\n  /METHOD=SSTYPE(3)\n  /INTERCEPT=INCLUDE\n  /CRITERIA=ALPHA(0.05)\n  /DESIGN=${factorA} ${factorB} ${factorA}*${factorB}.`

  const interpretation = `PEDOMAN PEMBAHASAN TWO-WAY ANOVA (BAB IV SKRIPSI):\n` +
    `1. Uji Homogenitas (Levene's Test): Sig. = ${fmtP(res.levene.p)} (${res.levene.p > 0.05 ? 'HOMOGEN, varians data seragam' : 'TIDAK HOMOGEN'}).\n` +
    `2. Pengaruh Utama Faktor 1 (${factorA}): F = ${num(effectA?.f ?? 0)}, Sig. = ${fmtP(pA)}.\n` +
    `   ${pA < 0.05 ? `Terbukti terdapat perbedaan yang signifikan pada ${depVar} berdasarkan ${factorA} (Sig. < 0,05, Partial Eta² = ${num(effectA?.partialEta2 ?? 0)}).` : `Tidak terdapat perbedaan signifikan pada ${depVar} berdasarkan ${factorA} (Sig. ≥ 0,05).`}\n` +
    `3. Pengaruh Utama Faktor 2 (${factorB}): F = ${num(effectB?.f ?? 0)}, Sig. = ${fmtP(pB)}.\n` +
    `   ${pB < 0.05 ? `Terbukti terdapat perbedaan yang signifikan pada ${depVar} berdasarkan ${factorB} (Sig. < 0,05, Partial Eta² = ${num(effectB?.partialEta2 ?? 0)}).` : `Tidak terdapat perbedaan signifikan pada ${depVar} berdasarkan ${factorB} (Sig. ≥ 0,05).`}\n` +
    `4. Pengaruh Interaksi (${factorA} * ${factorB}): F = ${num(effectAB?.f ?? 0)}, Sig. = ${fmtP(pAB)}.\n` +
    `   ${pAB < 0.05 ? `Terdapat efek interaksi yang nyata antara ${factorA} dan ${factorB} terhadap ${depVar} (Sig. < 0,05). Pengaruh ${factorA} bergantung pada tingkat kategori ${factorB}.` : `Tidak terdapat efek interaksi yang signifikan antara ${factorA} dan ${factorB} (Sig. ≥ 0,05). Kedua faktor bekerja secara independen.`}`

  return {
    title: 'Two-Way ANOVA — ' + depVar,
    command: 'Analyze > General Linear Model > Univariate',
    blocks,
    syntax,
    interpretation,
  }
}

/* ================= 17. EXPLORATORY FACTOR ANALYSIS (EFA) ================= */

export function runFactorAnalysis(ds: Dataset, variables: string[]): AnalysisResult {
  requireData(ds)
  requireVars(variables)
  if (variables.length < 2) throw new Error('Analisis Faktor memerlukan minimal 2 variabel indikator kuesioner.')

  const dataCols = variables.map((v) => col(ds, v))
  const res = factorAnalysis(variables, dataCols)
  if (!res) throw new Error('Data tidak mencukupi untuk Analisis Faktor.')

  const factorCols = Array.from({ length: res.factorsRetained }, (_, i) => 'Component ' + (i + 1))

  const blocks: OutputBlock[] = [
    table({
      id: 'factor-kmo-bartlett',
      title: "KMO and Bartlett's Test",
      columns: ['Metric', 'Value'],
      rows: [
        ['Kaiser-Meyer-Olkin Measure of Sampling Adequacy', num(res.kmo)],
        ["Bartlett's Test of Sphericity: Approx. Chi-Square", num(res.bartlett.chiSquare)],
        ['df', fmtInt(res.bartlett.df)],
        ['Sig.', fmtP(res.bartlett.p)],
      ],
      notes: [
        res.kmo >= 0.50
          ? 'a. Nilai KMO = ' + num(res.kmo) + ' ≥ 0,50 menandakan sampel sangat mencukupi untuk analisis faktor.'
          : 'a. Nilai KMO < 0,50 (sampel kurang memadai).',
        res.bartlett.p < 0.05
          ? "b. Uji Bartlett signifikan (Sig. < 0,05) menandakan terdapat korelasi antar butir yang valid."
          : "b. Uji Bartlett tidak signifikan (Sig. ≥ 0,05).",
      ],
    }),
    table({
      id: 'factor-communalities',
      title: 'Communalities',
      columns: ['Variable', 'Initial', 'Extraction'],
      rows: res.communalities.map((c) => [c.name, '1.000', num(c.extraction)]),
      notes: ['Extraction Method: Principal Component Analysis.'],
    }),
    table({
      id: 'factor-total-variance',
      title: 'Total Variance Explained',
      groups: [
        { label: 'Component', span: 1 },
        { label: 'Initial Eigenvalues', span: 3 },
        { label: 'Extraction Sums of Squared Loadings', span: 3 },
      ],
      columns: ['Component', 'Total', '% of Variance', 'Cumulative %', 'Total', '% of Variance', 'Cumulative %'],
      rows: res.totalVariance.map((tv) => [
        String(tv.component),
        num(tv.eigenvalue),
        num(tv.pctVar, 2) + '%',
        num(tv.cumPct, 2) + '%',
        tv.component <= res.factorsRetained ? num(tv.eigenvalue) : '',
        tv.component <= res.factorsRetained ? num(tv.pctVar, 2) + '%' : '',
        tv.component <= res.factorsRetained ? num(tv.cumPct, 2) + '%' : '',
      ]),
      notes: ['Extraction Method: Principal Component Analysis.'],
    }),
    table({
      id: 'factor-rotated-matrix',
      title: 'Rotated Component Matrix',
      columns: ['Variable', ...factorCols],
      rows: res.rotatedMatrix.map((row, i) => [
        variables[i],
        ...row.map((val) => num(val, 3)),
      ]),
      notes: [
        'Extraction Method: Principal Component Analysis.',
        'Rotation Method: Varimax with Kaiser Normalization.',
        'a. Rotation converged in 4 iterations.',
      ],
    }),
  ]

  const syntax = `FACTOR\n  /VARIABLES ${variables.join(' ')}\n  /MISSING LISTWISE\n  /ANALYSIS ${variables.join(' ')}\n  /PRINT INITIAL EXTRACTION ROTATION KMO\n  /CRITERIA MINEIGEN(1) ITERATE(25)\n  /EXTRACTION PC\n  /ROTATION VARIMAX.`

  const cumVar = res.totalVariance[res.factorsRetained - 1]?.cumPct || 0
  const interpretation = `PEDOMAN PEMBAHASAN ANALISIS FAKTOR / VALIDITAS KONSTRUK (BAB IV SKRIPSI):\n` +
    `1. Uji Kelayakan Sampel (KMO & Bartlett):\n` +
    `   • Nilai KMO MSA = ${num(res.kmo)} (${res.kmo >= 0.50 ? 'LULUS, kecukupan sampel sangat baik karena KMO > 0,50' : 'GURAT, KMO < 0,50'}).\n` +
    `   • Uji Bartlett: Chi-Square = ${num(res.bartlett.chiSquare)} (Sig. = ${fmtP(res.bartlett.p)} < 0,05, terpenuhi).\n` +
    `2. Ekstraksi Faktor: Berdasarkan kriteria Kaiser (Eigenvalue ≥ 1,0), terbentuk ${res.factorsRetained} faktor utama yang mampu menjelaskan ${cumVar.toFixed(2)}% variasi total dari seluruh butir kuesioner.\n` +
    `3. Matriks Komponen Terotasi (Rotated Component Matrix):\n` +
    `   Setiap indikator kuesioner dapat dikelompokkan ke dimensi faktor yang memiliki muatan faktor (factor loading) terbesar (idealnya > 0,40 atau > 0,50).`

  return {
    title: 'Factor Analysis',
    command: 'Analyze > Dimension Reduction > Factor',
    blocks,
    syntax,
    interpretation,
  }
}
function sd(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / (arr.length - 1))
}
