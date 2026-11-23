/* Comprehensive, dependency-free statistics engine for SPSS Statistics Recreation.
 * Calibrated for undergraduate quantitative research (skripsi) & professional statistical analysis.
 */

// Indonesian output uses a comma as the decimal separator, like SPSS on an
// Indonesian Windows locale. Missing values stay as a single dot.
export const fmt = (n: number, d = 3): string => {
  if (!Number.isFinite(n)) return '.'
  if (Math.abs(n) >= 1e9) return n.toExponential(3).replace('.', ',')
  return n.toFixed(d).replace('.', ',')
}

export const fmtInt = (n: number): string => (Number.isFinite(n) ? String(Math.round(n)) : '.')

export const fmtP = (p: number): string => {
  if (!Number.isFinite(p)) return '.'
  if (p < 0.001) return ',000'
  const s = p.toFixed(3)
  return (s.startsWith('0') ? s.slice(1) : s).replace('.', ',')
}

export const mean = (x: number[]): number => (x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN)

export const variance = (x: number[]): number => {
  if (x.length < 2) return NaN
  const m = mean(x)
  return x.reduce((a, b) => a + (b - m) * (b - m), 0) / (x.length - 1)
}

export const sd = (x: number[]): number => Math.sqrt(variance(x))

export const seMean = (x: number[]): number => (x.length ? sd(x) / Math.sqrt(x.length) : NaN)

export const median = (x: number[]): number => {
  if (!x.length) return NaN
  const s = [...x].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

export const mode = (x: number[]): number => {
  const counts = new Map<number, number>()
  let best = NaN
  let bestCount = -1
  for (const v of x) {
    const c = (counts.get(v) || 0) + 1
    counts.set(v, c)
    if (c > bestCount) {
      bestCount = c
      best = v
    }
  }
  return best
}

export const skewness = (x: number[]): number => {
  const n = x.length
  if (n < 3) return NaN
  const m = mean(x)
  const s = sd(x)
  if (s === 0) return NaN
  const sum = x.reduce((a, b) => a + Math.pow((b - m) / s, 3), 0)
  return (n / ((n - 1) * (n - 2))) * sum
}

export const kurtosis = (x: number[]): number => {
  const n = x.length
  if (n < 4) return NaN
  const m = mean(x)
  const s = sd(x)
  if (s === 0) return NaN
  const sum = x.reduce((a, b) => a + Math.pow((b - m) / s, 4), 0)
  return (
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum -
    (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3))
  )
}

/* ---------- distribution helpers (Gamma, Beta, Normal) ---------- */

export function logGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200
  const EPS = 3e-12
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}

export function ibeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a
  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

export const tTwoP = (t: number, df: number): number => {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return NaN
  return Math.max(0, Math.min(1, ibeta(df / 2, 0.5, df / (df + t * t))))
}

export const fP = (f: number, df1: number, df2: number): number => {
  if (!Number.isFinite(f) || f <= 0) return 1
  return Math.max(0, Math.min(1, ibeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f))))
}

export function tCritical(df: number, twoTailConfidence = 0.95): number {
  const target = 1 - (1 - twoTailConfidence) / 2
  let lo = 0
  let hi = 40
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const cdf = 1 - tTwoP(mid, df) / 2
    if (cdf < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Standard Normal CDF: P(Z <= z) */
export function stdNormalCdf(z: number): number {
  if (isNaN(z)) return NaN
  if (z < -8) return 0
  if (z > 8) return 1
  // Rational approximation (Abramowitz and Stegun 26.2.17)
  const p = 0.2316419
  const b1 = 0.319381530
  const b2 = -0.356563782
  const b3 = 1.781477937
  const b4 = -1.821255978
  const b5 = 1.330274429
  const x = Math.abs(z)
  const t = 1.0 / (1.0 + p * x)
  const phi = (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x)
  const poly = ((((b5 * t + b4) * t + b3) * t + b2) * t + b1) * t
  const cdf = 1.0 - phi * poly
  return z >= 0 ? cdf : 1.0 - cdf
}

/** Standard Normal Quantile / Probit: returns z such that P(Z <= z) = p */
export function stdNormalInv(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  // Beasley-Springer-Moro / Acklam approximation
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00]
  const pLow = 0.02425
  const pHigh = 1 - pLow
  let q: number, r: number

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  }
  q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
}

/** Hitung nilai r-tabel eksak untuk taraf signifikansi alpha dan derajat kebebasan df = N - 2 */
export function rTableValue(df: number, twoTailAlpha = 0.05): number {
  if (df <= 0) return NaN
  const t = tCritical(df, 1 - twoTailAlpha)
  return t / Math.sqrt(df + t * t)
}

/* ---------- correlation & ranking ---------- */

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 2) return NaN
  const mx = mean(x)
  const my = mean(y)
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx
    const dy = y[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return NaN
  return sxy / Math.sqrt(sxx * syy)
}

export function rank(x: number[]): number[] {
  const idx = x.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const out = new Array(x.length).fill(0)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) out[idx[k].i] = avg
    i = j + 1
  }
  return out
}

export function spearman(x: number[], y: number[]): number {
  return pearson(rank(x), rank(y))
}

export function kendallTauB(x: number[], y: number[]): { tau: number; p: number; z: number } {
  const n = Math.min(x.length, y.length)
  if (n < 2) return { tau: NaN, p: NaN, z: NaN }
  let c = 0
  let d = 0
  let tx = 0
  let ty = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const xDiff = x[i] - x[j]
      const yDiff = y[i] - y[j]
      if (xDiff === 0 && yDiff === 0) {
        tx++
        ty++
      } else if (xDiff === 0) {
        tx++
      } else if (yDiff === 0) {
        ty++
      } else if (xDiff * yDiff > 0) {
        c++
      } else {
        d++
      }
    }
  }
  const denom = Math.sqrt((c + d + tx) * (c + d + ty))
  const tau = denom === 0 ? NaN : (c - d) / denom
  const v0 = (4 * n + 10) / (9 * n * (n - 1))
  const se = Math.sqrt(v0)
  const z = se === 0 ? NaN : tau / se
  const p = Number.isFinite(z) ? 2 * (1 - stdNormalCdf(Math.abs(z))) : NaN
  return { tau, p, z }
}

export interface CorrCell {
  r: number
  p: number
  n: number
}

export function corrTest(
  x: number[],
  y: number[],
  method: 'pearson' | 'spearman' | 'kendall' = 'pearson',
  tails: 1 | 2 = 2
): CorrCell {
  const n = x.length
  if (method === 'kendall') {
    const k = kendallTauB(x, y)
    let p = k.p
    if (tails === 1 && Number.isFinite(p)) p /= 2
    return { r: k.tau, p, n }
  }
  const r = method === 'pearson' ? pearson(x, y) : spearman(x, y)
  let p = NaN
  if (Number.isFinite(r) && n > 2) {
    if (Math.abs(r) >= 1) p = 0
    else {
      const t = r * Math.sqrt((n - 2) / (1 - r * r))
      p = tTwoP(t, n - 2)
      if (tails === 1) p = p / 2
    }
  }
  return { r, p, n }
}

/* ---------- linear algebra & OLS regression ---------- */

function invertMatrix(a: number[][]): number[][] | null {
  const n = a.length
  const m = a.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    if (Math.abs(m[pivot][col]) < 1e-12) return null
    if (pivot !== col) [m[pivot], m[col]] = [m[col], m[pivot]]
    const pv = m[col][col]
    for (let j = 0; j < 2 * n; j++) m[col][j] /= pv
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r][col]
      if (f === 0) continue
      for (let j = 0; j < 2 * n; j++) m[r][j] -= f * m[col][j]
    }
  }
  return m.map((row) => row.slice(n))
}

export interface RegressionCoefficient {
  name: string
  b: number
  se: number
  beta: number
  t: number
  p: number
  tolerance: number
  vif: number
}

export interface RegressionResult {
  n: number
  k: number
  r: number
  r2: number
  adjR2: number
  seEstimate: number
  sst: number
  ssr: number
  sse: number
  dfr: number
  dfe: number
  msr: number
  mse: number
  f: number
  p: number
  durbinWatson: number
  coefficients: RegressionCoefficient[]
  residuals: number[]
  standardizedResiduals: number[]
  fittedValues: number[]
}

export function regression(y: number[], xCols: number[][], names: string[]): RegressionResult | null {
  const n = y.length
  const k = xCols.length
  if (n < k + 2 || k < 1) return null
  const X: number[][] = []
  for (let i = 0; i < n; i++) X.push([1, ...xCols.map((c) => c[i])])
  const xtx: number[][] = Array.from({ length: k + 1 }, () => Array(k + 1).fill(0))
  const xty: number[] = Array(k + 1).fill(0)
  for (let i = 0; i < n; i++) {
    for (let a = 0; a <= k; a++) {
      xty[a] += X[i][a] * y[i]
      for (let b = 0; b <= k; b++) xtx[a][b] += X[i][a] * X[i][b]
    }
  }
  const inv = invertMatrix(xtx)
  if (!inv) return null
  const beta = Array(k + 1).fill(0)
  for (let a = 0; a <= k; a++) for (let b = 0; b <= k; b++) beta[a] += inv[a][b] * xty[b]
  const yBar = mean(y)
  let sst = 0
  let sse = 0
  const residuals: number[] = []
  const fittedValues: number[] = []
  for (let i = 0; i < n; i++) {
    let yhat = 0
    for (let a = 0; a <= k; a++) yhat += beta[a] * X[i][a]
    const res = y[i] - yhat
    fittedValues.push(yhat)
    residuals.push(res)
    sst += (y[i] - yBar) ** 2
    sse += res ** 2
  }
  const ssr = sst - sse
  const dfr = k
  const dfe = n - k - 1
  if (dfe <= 0) return null
  const mse = sse / dfe
  const msr = ssr / dfr
  const r2 = sst === 0 ? NaN : 1 - sse / sst
  const adjR2 = 1 - (1 - r2) * ((n - 1) / dfe)
  const f = mse === 0 ? Infinity : msr / mse
  const ySd = sd(y)

  // Durbin-Watson statistic
  let dwNum = 0
  for (let i = 1; i < n; i++) {
    dwNum += (residuals[i] - residuals[i - 1]) ** 2
  }
  const durbinWatson = sse > 0 ? dwNum / sse : NaN

  // Standardized residuals
  const seEstimate = Math.sqrt(mse)
  const standardizedResiduals = residuals.map((r) => (seEstimate > 0 ? r / seEstimate : 0))

  const coefficients: RegressionCoefficient[] = []
  for (let a = 0; a <= k; a++) {
    const se = Math.sqrt(Math.max(0, mse * inv[a][a]))
    const t = se === 0 ? NaN : beta[a] / se
    let tolerance = 1
    let vif = 1
    if (a > 0 && k > 1) {
      const others = xCols.filter((_, j) => j !== a - 1)
      const otherNames = names.filter((_, j) => j !== a - 1)
      const sub = regression(xCols[a - 1], others, otherNames)
      if (sub && Number.isFinite(sub.r2)) {
        tolerance = Math.max(0.001, 1 - sub.r2)
        vif = tolerance > 0 ? 1 / tolerance : Infinity
      }
    }
    coefficients.push({
      name: a === 0 ? '(Constant)' : names[a - 1],
      b: beta[a],
      se,
      beta: a === 0 ? NaN : beta[a] * (sd(xCols[a - 1]) / ySd),
      t,
      p: tTwoP(t, dfe),
      tolerance,
      vif,
    })
  }

  return {
    n, k, r: Math.sqrt(Math.max(0, r2)), r2, adjR2,
    seEstimate, sst, ssr, sse, dfr, dfe, msr, mse, f,
    p: fP(f, dfr, dfe), durbinWatson, coefficients, residuals,
    standardizedResiduals, fittedValues,
  }
}

/* ---------- reliability & validity testing (Skripsi Standards) ---------- */

export interface ReliabilityResult {
  n: number
  items: number
  alpha: number
  itemStats: {
    name: string
    mean: number
    sd: number
    n: number
    scaleMeanIfDeleted: number
    scaleVarianceIfDeleted: number
    correctedItemTotal: number
    squaredMultiple: number
    alphaIfDeleted: number
  }[]
}

export function reliability(items: { name: string; values: number[] }[]): ReliabilityResult | null {
  const n = items[0]?.values.length ?? 0
  const k = items.length
  if (k < 2 || n < 2) return null
  const totals = Array.from({ length: n }, (_, i) => items.reduce((a, it) => a + it.values[i], 0))
  const totalVar = variance(totals)
  if (!Number.isFinite(totalVar) || totalVar === 0) return null
  const sumItemVar = items.reduce((a, it) => a + variance(it.values), 0)
  const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar)

  const itemStats = items.map((it) => {
    const deleted = totals.map((t, i) => t - it.values[i])
    const corrected = pearson(it.values, deleted)
    let squaredMultiple = NaN
    if (k > 2) {
      const others = items.filter((o) => o.name !== it.name)
      const reg = regression(it.values, others.map((o) => o.values), others.map((o) => o.name))
      if (reg) squaredMultiple = reg.r2
    } else {
      squaredMultiple = corrected * corrected
    }
    const delVar = variance(deleted)
    const alphaIfDeleted =
      k > 2 && delVar > 0 ? ((k - 1) / (k - 2)) * (1 - (sumItemVar - variance(it.values)) / delVar) : NaN
    return {
      name: it.name,
      mean: mean(it.values),
      sd: sd(it.values),
      n: it.values.length,
      scaleMeanIfDeleted: mean(deleted),
      scaleVarianceIfDeleted: delVar,
      correctedItemTotal: corrected,
      squaredMultiple,
      alphaIfDeleted,
    }
  })
  return { n, items: k, alpha, itemStats }
}

export interface ValidityItemResult {
  name: string
  label: string
  rCount: number
  rTable: number
  p: number
  isValid: boolean
}

export interface ValidityResult {
  n: number
  df: number
  rTable: number
  items: ValidityItemResult[]
}

export function testValidity(
  items: { name: string; label: string; values: number[] }[],
  alpha = 0.05
): ValidityResult | null {
  const n = items[0]?.values.length ?? 0
  if (n < 3 || items.length < 2) return null
  const df = n - 2
  const rTable = rTableValue(df, alpha)
  const totals = Array.from({ length: n }, (_, i) => items.reduce((a, it) => a + it.values[i], 0))

  const results: ValidityItemResult[] = items.map((it) => {
    const r = pearson(it.values, totals)
    const t = r * Math.sqrt(df / Math.max(1e-12, 1 - r * r))
    const p = tTwoP(t, df)
    const isValid = r > rTable && p < alpha
    return {
      name: it.name,
      label: it.label || it.name,
      rCount: r,
      rTable,
      p,
      isValid,
    }
  })
  return { n, df, rTable, items: results }
}

/* ---------- descriptives & frequencies ---------- */

export interface DescStat {
  name: string
  label: string
  n: number
  mean: number
  sd: number
  variance: number
  min: number
  max: number
  range: number
  sum: number
  skewness: number
  kurtosis: number
  seMean: number
  median: number
  mode: number
}

export function describe(name: string, label: string, values: number[]): DescStat {
  return {
    name, label, n: values.length, mean: mean(values), sd: sd(values),
    variance: variance(values), min: Math.min(...values), max: Math.max(...values),
    range: Math.max(...values) - Math.min(...values), sum: values.reduce((a, b) => a + b, 0),
    skewness: skewness(values), kurtosis: kurtosis(values), seMean: seMean(values),
    median: median(values), mode: mode(values),
  }
}

export interface FrequencyRow {
  value: string
  frequency: number
  percent: number
  validPercent: number
  cumulative: number
}

export function frequencies(values: number[], labels: Record<number, string> | null): FrequencyRow[] {
  const uniq = [...new Set(values)].sort((a, b) => a - b)
  const n = values.length
  let cumulative = 0
  return uniq.map((v) => {
    const count = values.filter((x) => x === v).length
    const percent = (count / n) * 100
    cumulative += percent
    return {
      value: labels && labels[v] ? labels[v] : String(v),
      frequency: count,
      percent,
      validPercent: percent,
      cumulative,
    }
  })
}

/* ---------- t-tests: One-Sample, Independent, Paired ---------- */

export interface OneSampleResult {
  n: number
  mean: number
  sd: number
  se: number
  testValue: number
  t: number
  df: number
  p: number
  meanDiff: number
  ciLow: number
  ciHigh: number
}

export function oneSampleT(values: number[], testValue: number): OneSampleResult | null {
  const n = values.length
  if (n < 2) return null
  const m = mean(values)
  const s = sd(values)
  const se = s / Math.sqrt(n)
  if (se === 0) return null
  const t = (m - testValue) / se
  const df = n - 1
  const crit = tCritical(df)
  return {
    n, mean: m, sd: s, se, testValue, t, df, p: tTwoP(t, df),
    meanDiff: m - testValue, ciLow: m - testValue - crit * se, ciHigh: m - testValue + crit * se,
  }
}

export interface GroupStats {
  n: number
  mean: number
  sd: number
  se: number
}

export interface IndependentTResult {
  groups: [GroupStats, GroupStats]
  levene: { f: number; p: number; df1: number; df2: number }
  equal: { t: number; df: number; p: number; meanDiff: number; seDiff: number; ciLow: number; ciHigh: number }
  welch: { t: number; df: number; p: number; meanDiff: number; seDiff: number; ciLow: number; ciHigh: number }
}

export function independentT(g1: number[], g2: number[]): IndependentTResult | null {
  if (g1.length < 2 || g2.length < 2) return null
  const s1 = { n: g1.length, mean: mean(g1), sd: sd(g1) }
  const s2 = { n: g2.length, mean: mean(g2), sd: sd(g2) }
  const groups: [GroupStats, GroupStats] = [
    { ...s1, se: s1.sd / Math.sqrt(s1.n) },
    { ...s2, se: s2.sd / Math.sqrt(s2.n) },
  ]
  const meanDiff = s1.mean - s2.mean
  const dfEqual = s1.n + s2.n - 2
  const pooledVar = ((s1.n - 1) * s1.sd ** 2 + (s2.n - 1) * s2.sd ** 2) / dfEqual
  const seEqual = Math.sqrt(pooledVar * (1 / s1.n + 1 / s2.n))
  const tEqual = seEqual === 0 ? NaN : meanDiff / seEqual
  const critEqual = tCritical(dfEqual)

  const seWelch = Math.sqrt(s1.sd ** 2 / s1.n + s2.sd ** 2 / s2.n)
  const tWelch = seWelch === 0 ? NaN : meanDiff / seWelch
  const num = (s1.sd ** 2 / s1.n + s2.sd ** 2 / s2.n) ** 2
  const den = (s1.sd ** 2 / s1.n) ** 2 / (s1.n - 1) + (s2.sd ** 2 / s2.n) ** 2 / (s2.n - 1)
  const dfWelch = den === 0 ? NaN : num / den
  const critWelch = tCritical(dfWelch)

  // SPSS Levene's test using absolute deviations from group mean
  const z1 = g1.map((v) => Math.abs(v - s1.mean))
  const z2 = g2.map((v) => Math.abs(v - s2.mean))
  const allZ = [...z1, ...z2]
  const grand = mean(allZ)
  const ssb = z1.length * (mean(z1) - grand) ** 2 + z2.length * (mean(z2) - grand) ** 2
  const ssw = z1.reduce((a, v) => a + (v - mean(z1)) ** 2, 0) + z2.reduce((a, v) => a + (v - mean(z2)) ** 2, 0)
  const df1 = 1
  const df2 = allZ.length - 2
  const f = ssw === 0 ? Infinity : ssb / df1 / (ssw / df2)
  return {
    groups,
    levene: { f, p: fP(f, df1, df2), df1, df2 },
    equal: {
      t: tEqual, df: dfEqual, p: tTwoP(tEqual, dfEqual), meanDiff, seDiff: seEqual,
      ciLow: meanDiff - critEqual * seEqual, ciHigh: meanDiff + critEqual * seEqual,
    },
    welch: {
      t: tWelch, df: dfWelch, p: tTwoP(tWelch, dfWelch), meanDiff, seDiff: seWelch,
      ciLow: meanDiff - critWelch * seWelch, ciHigh: meanDiff + critWelch * seWelch,
    },
  }
}

export interface PairedTResult {
  n: number
  var1: { name: string; mean: number; sd: number; se: number }
  var2: { name: string; mean: number; sd: number; se: number }
  correlation: { r: number; p: number }
  pairedDifferences: {
    mean: number
    sd: number
    se: number
    ciLow: number
    ciHigh: number
    t: number
    df: number
    p: number
  }
}

export function pairedT(
  v1Name: string,
  v1Values: number[],
  v2Name: string,
  v2Values: number[]
): PairedTResult | null {
  const n = Math.min(v1Values.length, v2Values.length)
  if (n < 2) return null
  const m1 = mean(v1Values)
  const s1 = sd(v1Values)
  const se1 = s1 / Math.sqrt(n)

  const m2 = mean(v2Values)
  const s2 = sd(v2Values)
  const se2 = s2 / Math.sqrt(n)

  const diffs = v1Values.slice(0, n).map((v, i) => v - v2Values[i])
  const meanDiff = mean(diffs)
  const sdDiff = sd(diffs)
  const seDiff = sdDiff / Math.sqrt(n)

  const t = seDiff === 0 ? NaN : meanDiff / seDiff
  const df = n - 1
  const crit = tCritical(df)
  const p = tTwoP(t, df)

  const corr = corrTest(v1Values.slice(0, n), v2Values.slice(0, n), 'pearson')

  return {
    n,
    var1: { name: v1Name, mean: m1, sd: s1, se: se1 },
    var2: { name: v2Name, mean: m2, sd: s2, se: se2 },
    correlation: { r: corr.r, p: corr.p },
    pairedDifferences: {
      mean: meanDiff,
      sd: sdDiff,
      se: seDiff,
      ciLow: meanDiff - crit * seDiff,
      ciHigh: meanDiff + crit * seDiff,
      t,
      df,
      p,
    },
  }
}

/* ---------- One-Way ANOVA with Post-Hoc Tukey HSD ---------- */

export interface AnovaGroupStat {
  name: string
  label: string
  n: number
  mean: number
  sd: number
  se: number
  ciLow: number
  ciHigh: number
  min: number
  max: number
}

export interface TukeyPairComparison {
  groupI: string
  groupJ: string
  meanDiff: number
  se: number
  p: number
  ciLow: number
  ciHigh: number
}

export interface OneWayAnovaResult {
  dependentVar: string
  factorVar: string
  groups: AnovaGroupStat[]
  betweenSS: number
  betweenDf: number
  betweenMS: number
  withinSS: number
  withinDf: number
  withinMS: number
  totalSS: number
  totalDf: number
  f: number
  p: number
  tukey: TukeyPairComparison[]
}

export function oneWayAnova(
  depName: string,
  depValues: number[],
  factorName: string,
  factorValues: number[],
  factorLabels?: Record<number, string> | null
): OneWayAnovaResult | null {
  const uniqFactors = [...new Set(factorValues)].sort((a, b) => a - b)
  if (uniqFactors.length < 2) return null

  const grouped = uniqFactors.map((fact) => {
    const vals = depValues.filter((_, i) => factorValues[i] === fact)
    return {
      fact,
      name: String(fact),
      label: factorLabels?.[fact] ?? String(fact),
      values: vals,
    }
  })

  if (grouped.some((g) => g.values.length < 2)) return null

  const groupStats: AnovaGroupStat[] = grouped.map((g) => {
    const n = g.values.length
    const m = mean(g.values)
    const s = sd(g.values)
    const se = s / Math.sqrt(n)
    const crit = tCritical(n - 1)
    return {
      name: g.name,
      label: g.label,
      n,
      mean: m,
      sd: s,
      se,
      ciLow: m - crit * se,
      ciHigh: m + crit * se,
      min: Math.min(...g.values),
      max: Math.max(...g.values),
    }
  })

  const grandMean = mean(depValues)
  let betweenSS = 0
  let withinSS = 0
  grouped.forEach((g) => {
    const m = mean(g.values)
    betweenSS += g.values.length * (m - grandMean) ** 2
    g.values.forEach((v) => {
      withinSS += (v - m) ** 2
    })
  })

  const betweenDf = grouped.length - 1
  const withinDf = depValues.length - grouped.length
  const totalDf = depValues.length - 1
  const totalSS = betweenSS + withinSS

  if (withinDf <= 0) return null

  const betweenMS = betweenSS / betweenDf
  const withinMS = withinSS / withinDf
  const f = withinMS === 0 ? Infinity : betweenMS / withinMS
  const p = fP(f, betweenDf, withinDf)

  // Post-Hoc Tukey HSD pairwise comparisons
  const tukey: TukeyPairComparison[] = []
  const k = grouped.length
  // Approximation of studentized range distribution critical q
  const qCrit = Math.sqrt(2 * fP(0.05, k - 1, withinDf)) // Tukey approximation
  const tAdjCrit = tCritical(withinDf, 1 - 0.05 / ((k * (k - 1)) / 2)) // Bonferroni/Tukey bounds

  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      if (i === j) continue
      const gi = groupStats[i]
      const gj = groupStats[j]
      const meanDiff = gi.mean - gj.mean
      const seDiff = Math.sqrt((withinMS / 2) * (1 / gi.n + 1 / gj.n))
      const tVal = seDiff === 0 ? 0 : Math.abs(meanDiff) / seDiff
      const pairP = Math.min(1, tTwoP(tVal, withinDf) * ((k * (k - 1)) / 2))
      const margin = tAdjCrit * seDiff
      tukey.push({
        groupI: gi.label,
        groupJ: gj.label,
        meanDiff,
        se: seDiff,
        p: pairP,
        ciLow: meanDiff - margin,
        ciHigh: meanDiff + margin,
      })
    }
  }

  return {
    dependentVar: depName,
    factorVar: factorName,
    groups: groupStats,
    betweenSS,
    betweenDf,
    betweenMS,
    withinSS,
    withinDf,
    withinMS,
    totalSS,
    totalDf,
    f,
    p,
    tukey,
  }
}

/* ---------- Normality Tests: Kolmogorov-Smirnov & Shapiro-Wilk ---------- */

export interface NormalityTestResult {
  variable: string
  label: string
  n: number
  mean: number
  sd: number
  ks: {
    statistic: number
    p: number
    df: number
    mostExtremeAbsolute: number
    mostExtremePositive: number
    mostExtremeNegative: number
  }
  shapiro: {
    statistic: number
    p: number
    df: number
  }
}

export function testNormality(name: string, label: string, values: number[]): NormalityTestResult | null {
  const n = values.length
  if (n < 4) return null
  const m = mean(values)
  const s = sd(values)
  if (s === 0) return null

  // Kolmogorov-Smirnov (Lilliefors correction)
  const sorted = [...values].sort((a, b) => a - b)
  let maxAbs = 0
  let maxPos = 0
  let maxNeg = 0

  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - m) / s
    const f0 = stdNormalCdf(z)
    const sn = (i + 1) / n
    const snPrev = i / n
    const diffPos = sn - f0
    const diffNeg = f0 - snPrev
    if (diffPos > maxPos) maxPos = diffPos
    if (diffNeg > maxNeg) maxNeg = diffNeg
    const curAbs = Math.max(Math.abs(diffPos), Math.abs(diffNeg))
    if (curAbs > maxAbs) maxAbs = curAbs
  }

  // Lilliefors p-value calculation
  const dStat = maxAbs
  let ksP = 0.2
  const dStar = dStat * (Math.sqrt(n) - 0.01 + 0.85 / Math.sqrt(n))
  if (dStar <= 0.72) ksP = 0.20
  else if (dStar <= 0.77) ksP = 0.15
  else if (dStar <= 0.82) ksP = 0.10
  else if (dStar <= 0.89) ksP = 0.05
  else if (dStar <= 1.03) ksP = 0.01
  else ksP = Math.max(0.0001, Math.exp(-2 * dStar * dStar))

  // Shapiro-Wilk Test (Royston approximation)
  let swStat = NaN
  let swP = NaN
  if (n >= 3 && n <= 5000) {
    const mi: number[] = []
    for (let i = 1; i <= n; i++) {
      mi.push(stdNormalInv((i - 0.375) / (n + 0.25)))
    }
    const mNorm = Math.sqrt(mi.reduce((acc, v) => acc + v * v, 0))
    const a = mi.map((v) => v / mNorm)

    let num = 0
    for (let i = 0; i < n; i++) {
      num += a[i] * sorted[i]
    }
    const denom = sorted.reduce((acc, v) => acc + (v - m) ** 2, 0)
    swStat = denom > 0 ? (num * num) / denom : NaN

    if (swStat > 0 && swStat <= 1) {
      if (n >= 4 && n <= 11) {
        const gamma = 0.459 * n - 2.273
        const y = -Math.log(gamma - Math.log(1 - swStat))
        const mu = -0.0006714 * Math.pow(n, 3) + 0.025054 * Math.pow(n, 2) - 0.39978 * n + 0.544
        const sigma = Math.exp(-0.0020322 * Math.pow(n, 3) + 0.062767 * Math.pow(n, 2) - 0.77857 * n + 1.3822)
        const z = (y - mu) / sigma
        swP = 1 - stdNormalCdf(z)
      } else {
        const y = Math.log(1 - swStat)
        const mu = 0.0038915 * Math.pow(Math.log(n), 3) - 0.083751 * Math.pow(Math.log(n), 2) - 0.31082 * Math.log(n) - 1.5861
        const sigma = Math.exp(0.0030302 * Math.pow(Math.log(n), 2) - 0.082676 * Math.log(n) - 0.4803)
        const z = (y - mu) / sigma
        swP = 1 - stdNormalCdf(z)
      }
    }
  }

  return {
    variable: name,
    label: label || name,
    n,
    mean: m,
    sd: s,
    ks: {
      statistic: dStat,
      p: Math.max(0, Math.min(1, ksP)),
      df: n,
      mostExtremeAbsolute: maxAbs,
      mostExtremePositive: maxPos,
      mostExtremeNegative: maxNeg,
    },
    shapiro: {
      statistic: Math.min(0.999, Math.max(0, swStat)),
      p: Math.max(0, Math.min(1, swP)),
      df: n,
    },
  }
}

/* ---------- Classical Assumptions of Regression (Uji Asumsi Klasik) ---------- */

export interface ClassicalAssumptionsResult {
  dependentVar: string
  independentVars: string[]
  n: number
  regression: RegressionResult
  normalityKS: NormalityTestResult
  durbinWatson: {
    d: number
    conclusion: string
  }
  glejser: {
    f: number
    p: number
    coefficients: { name: string; b: number; t: number; p: number; isHomoskedastic: boolean }[]
    conclusion: string
  }
  multicollinearity: {
    name: string
    tolerance: number
    vif: number
    isSafe: boolean
  }[]
  ppPlotPoints: { expected: number; observed: number }[]
}

export function testClassicalAssumptions(
  depName: string,
  depValues: number[],
  indepNames: string[],
  indepCols: number[][]
): ClassicalAssumptionsResult | null {
  const reg = regression(depValues, indepCols, indepNames)
  if (!reg) return null

  // 1. Uji Normalitas Residual
  const norm = testNormality('Residual', 'Unstandardized Residual', reg.residuals)
  if (!norm) return null

  // P-P Plot coordinates
  const sortedResids = [...reg.residuals].sort((a, b) => a - b)
  const resMean = mean(sortedResids)
  const resSd = sd(sortedResids)
  const ppPlotPoints: { expected: number; observed: number }[] = []
  for (let i = 0; i < reg.n; i++) {
    const observed = (i + 0.5) / reg.n
    const expected = stdNormalCdf((sortedResids[i] - resMean) / (resSd || 1))
    ppPlotPoints.push({ expected, observed })
  }

  // 2. Uji Autokorelasi Durbin-Watson
  const dw = reg.durbinWatson
  let dwConclusion = 'Tidak terjadi autokorelasi (nilai D-W di antara 1,5–2,5).'
  if (dw < 1.5) dwConclusion = 'Ada indikasi autokorelasi positif (D-W < 1,5).'
  else if (dw > 2.5) dwConclusion = 'Ada indikasi autokorelasi negatif (D-W > 2,5).'

  // 3. Uji Heteroskedastisitas (Metode Glejser)
  // Meregresikan nilai mutlak residual (|e|) terhadap seluruh variabel independen
  const absResiduals = reg.residuals.map((r) => Math.abs(r))
  const glejserReg = regression(absResiduals, indepCols, indepNames)
  const glejserCoefs = glejserReg
    ? glejserReg.coefficients.slice(1).map((c) => ({
        name: c.name,
        b: c.b,
        t: c.t,
        p: c.p,
        isHomoskedastic: c.p >= 0.05,
      }))
    : []
  const allHomoskedastic = glejserCoefs.every((c) => c.isHomoskedastic)
  const glejserConclusion = allHomoskedastic
    ? 'Tidak terjadi gejala heteroskedastisitas (seluruh Sig. > 0,05 pada uji Glejser).'
    : 'Terindikasi gejala heteroskedastisitas pada satu atau lebih prediktor (Sig. < 0,05).'

  // 4. Uji Multikolinearitas (Tolerance & VIF)
  const multicollinearity = reg.coefficients.slice(1).map((c) => ({
    name: c.name,
    tolerance: c.tolerance,
    vif: c.vif,
    isSafe: c.tolerance >= 0.10 && c.vif <= 10.0,
  }))

  return {
    dependentVar: depName,
    independentVars: indepNames,
    n: reg.n,
    regression: reg,
    normalityKS: norm,
    durbinWatson: { d: dw, conclusion: dwConclusion },
    glejser: {
      f: glejserReg?.f ?? NaN,
      p: glejserReg?.p ?? NaN,
      coefficients: glejserCoefs,
      conclusion: glejserConclusion,
    },
    multicollinearity,
    ppPlotPoints,
  }
}

/* ---------- Non-Parametric Tests: Mann-Whitney U, Wilcoxon, Kruskal-Wallis ---------- */

export interface MannWhitneyResult {
  group1: { name: string; label: string; n: number; meanRank: number; sumRanks: number }
  group2: { name: string; label: string; n: number; meanRank: number; sumRanks: number }
  mannWhitneyU: number
  wilcoxonW: number
  z: number
  asympSig: number
}

export function mannWhitneyU(
  g1Values: number[],
  g2Values: number[],
  g1Label = 'Kelompok 1',
  g2Label = 'Kelompok 2'
): MannWhitneyResult | null {
  const n1 = g1Values.length
  const n2 = g2Values.length
  if (n1 < 2 || n2 < 2) return null
  const combined = [
    ...g1Values.map((v) => ({ v, g: 1 })),
    ...g2Values.map((v) => ({ v, g: 2 })),
  ]
  const ranks = rank(combined.map((c) => c.v))
  let r1 = 0
  let r2 = 0
  for (let i = 0; i < combined.length; i++) {
    if (combined[i].g === 1) r1 += ranks[i]
    else r2 += ranks[i]
  }

  const u1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - r1
  const u2 = n1 * n2 + (n2 * (n2 + 1)) / 2 - r2
  const u = Math.min(u1, u2)
  const w = r1 < r2 ? r1 : r2

  // Tie correction
  const valCounts = new Map<number, number>()
  combined.forEach((c) => valCounts.set(c.v, (valCounts.get(c.v) || 0) + 1))
  let tieSum = 0
  valCounts.forEach((t) => {
    if (t > 1) tieSum += Math.pow(t, 3) - t
  })
  const nTotal = n1 + n2
  const denom = (nTotal * (nTotal - 1))
  const tieFactor = denom > 0 ? tieSum / denom : 0
  const seU = Math.sqrt((n1 * n2 / 12) * ((nTotal + 1) - tieFactor))
  const z = seU === 0 ? 0 : (u - (n1 * n2) / 2) / seU
  const asympSig = 2 * (1 - stdNormalCdf(Math.abs(z)))

  return {
    group1: { name: '1', label: g1Label, n: n1, meanRank: r1 / n1, sumRanks: r1 },
    group2: { name: '2', label: g2Label, n: n2, meanRank: r2 / n2, sumRanks: r2 },
    mannWhitneyU: u,
    wilcoxonW: w,
    z,
    asympSig,
  }
}

export interface WilcoxonResult {
  n: number
  negativeRanks: { n: number; meanRank: number; sumRanks: number }
  positiveRanks: { n: number; meanRank: number; sumRanks: number }
  ties: number
  total: number
  z: number
  asympSig: number
}

export function wilcoxonSignedRank(v1: number[], v2: number[]): WilcoxonResult | null {
  const n = Math.min(v1.length, v2.length)
  if (n < 3) return null
  const diffs: { diff: number; abs: number; sign: number }[] = []
  let ties = 0
  for (let i = 0; i < n; i++) {
    const d = v2[i] - v1[i]
    if (d === 0) ties++
    else diffs.push({ diff: d, abs: Math.abs(d), sign: d > 0 ? 1 : -1 })
  }
  const nr = diffs.length
  if (nr < 2) return null

  const ranks = rank(diffs.map((d) => d.abs))
  let posSum = 0
  let posN = 0
  let negSum = 0
  let negN = 0

  for (let i = 0; i < nr; i++) {
    if (diffs[i].sign > 0) {
      posSum += ranks[i]
      posN++
    } else {
      negSum += ranks[i]
      negN++
    }
  }

  const w = Math.min(posSum, negSum)
  const meanW = (nr * (nr + 1)) / 4
  const seW = Math.sqrt((nr * (nr + 1) * (2 * nr + 1)) / 24)
  const z = seW === 0 ? 0 : (w - meanW) / seW
  const asympSig = 2 * (1 - stdNormalCdf(Math.abs(z)))

  return {
    n,
    negativeRanks: { n: negN, meanRank: negN ? negSum / negN : 0, sumRanks: negSum },
    positiveRanks: { n: posN, meanRank: posN ? posSum / posN : 0, sumRanks: posSum },
    ties,
    total: n,
    z,
    asympSig,
  }
}

export interface KruskalWallisResult {
  variable: string
  groupVar: string
  groups: { name: string; label: string; n: number; meanRank: number }[]
  chiSquare: number
  df: number
  asympSig: number
}

export function kruskalWallis(
  depName: string,
  depValues: number[],
  groupName: string,
  groupValues: number[],
  labels?: Record<number, string> | null
): KruskalWallisResult | null {
  const uniq = [...new Set(groupValues)].sort((a, b) => a - b)
  if (uniq.length < 2) return null
  const n = depValues.length
  const ranks = rank(depValues)

  const groupStats = uniq.map((grp) => {
    let sum = 0
    let count = 0
    for (let i = 0; i < n; i++) {
      if (groupValues[i] === grp) {
        sum += ranks[i]
        count++
      }
    }
    return {
      name: String(grp),
      label: labels?.[grp] ?? String(grp),
      n: count,
      meanRank: count ? sum / count : 0,
      sumRank: sum,
    }
  })

  let hSum = 0
  groupStats.forEach((g) => {
    if (g.n > 0) hSum += (g.sumRank * g.sumRank) / g.n
  })
  let h = (12 / (n * (n + 1))) * hSum - 3 * (n + 1)

  // Tie correction
  const counts = new Map<number, number>()
  depValues.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1))
  let tieSum = 0
  counts.forEach((c) => {
    if (c > 1) tieSum += Math.pow(c, 3) - c
  })
  const tieCorrection = 1 - tieSum / (Math.pow(n, 3) - n)
  if (tieCorrection > 0) h /= tieCorrection

  const df = uniq.length - 1
  const asympSig = pearsonChiSquareP(h, df)

  return {
    variable: depName,
    groupVar: groupName,
    groups: groupStats.map((g) => ({ name: g.name, label: g.label, n: g.n, meanRank: g.meanRank })),
    chiSquare: h,
    df,
    asympSig,
  }
}

/* ---------- chi-square & crosstabs ---------- */

export interface CrosstabResult {
  rows: string[]
  cols: string[]
  counts: number[][]
  expected: number[][]
  rowTotals: number[]
  colTotals: number[]
  total: number
  chi2: number
  df: number
  p: number
  cramersV: number
  phi: number
  continuityCorrectionChi2?: number
  continuityCorrectionP?: number
  minExpected: number
}

export function crosstab(
  rowValues: number[],
  colValues: number[],
  rowLabels: Record<number, string> | null,
  colLabels: Record<number, string> | null
): CrosstabResult | null {
  const rv = [...new Set(rowValues)].sort((a, b) => a - b)
  const cv = [...new Set(colValues)].sort((a, b) => a - b)
  if (rv.length < 2 || cv.length < 2) return null
  const counts = rv.map(() => cv.map(() => 0))
  for (let i = 0; i < rowValues.length; i++) {
    const ri = rv.indexOf(rowValues[i])
    const ci = cv.indexOf(colValues[i])
    if (ri >= 0 && ci >= 0) counts[ri][ci]++
  }
  const rowTotals = counts.map((r) => r.reduce((a, b) => a + b, 0))
  const colTotals = cv.map((_, j) => counts.reduce((a, r) => a + r[j], 0))
  const total = rowTotals.reduce((a, b) => a + b, 0)
  const expected = counts.map((r, i) => r.map((_, j) => (rowTotals[i] * colTotals[j]) / total))
  let chi2 = 0
  let minExpected = Infinity
  for (let i = 0; i < rv.length; i++) {
    for (let j = 0; j < cv.length; j++) {
      const e = expected[i][j]
      minExpected = Math.min(minExpected, e)
      if (e > 0) chi2 += (counts[i][j] - e) ** 2 / e
    }
  }
  const df = (rv.length - 1) * (cv.length - 1)
  const p = pearsonChiSquareP(chi2, df)
  const minDim = Math.min(rv.length - 1, cv.length - 1)
  const cramersV = Math.sqrt(chi2 / (total * Math.max(1, minDim)))
  const phi = Math.sqrt(chi2 / total)

  // 2x2 table continuity correction (Yates)
  let ccChi2: number | undefined
  let ccP: number | undefined
  if (rv.length === 2 && cv.length === 2) {
    let yatesSum = 0
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const e = expected[i][j]
        const diff = Math.max(0, Math.abs(counts[i][j] - e) - 0.5)
        if (e > 0) yatesSum += (diff * diff) / e
      }
    }
    ccChi2 = yatesSum
    ccP = pearsonChiSquareP(yatesSum, 1)
  }

  return {
    rows: rv.map((v) => (rowLabels && rowLabels[v] ? rowLabels[v] : String(v))),
    cols: cv.map((v) => (colLabels && colLabels[v] ? colLabels[v] : String(v))),
    counts,
    expected,
    rowTotals,
    colTotals,
    total,
    chi2,
    df,
    p,
    cramersV,
    phi,
    continuityCorrectionChi2: ccChi2,
    continuityCorrectionP: ccP,
    minExpected,
  }
}

export function pearsonChiSquareP(chi2: number, df: number): number {
  if (!Number.isFinite(chi2) || df <= 0) return NaN
  const a = df / 2
  const x = chi2 / 2
  if (x < a + 1) {
    let sum = 1 / a
    let term = sum
    for (let n = 1; n < 300; n++) {
      term *= x / (a + n)
      sum += term
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break
    }
    const p = Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum
    return Math.max(0, Math.min(1, 1 - p))
  }
  let b = x + 1 - a
  let c = 1 / 1e-300
  let d = 1 / b
  let h = d
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = b + an / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-14) break
  }
  return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - logGamma(a)) * h))
}

/* ================= 14. POWER ANALYSIS (IBM SPSS 29/2026 FEATURE) ================= */

export interface PowerResult {
  testType: string
  effectSize: number
  effectLabel: string
  alpha: number
  sampleSize: number
  power: number
  actualPowerPercent: string
  adequate: boolean
  recommendation: string
}

export function calculatePower(
  testType: 'independent' | 'onesample' | 'regression',
  n: number,
  alpha = 0.05,
  effectSize = 0.5,
  numPredictors = 3
): PowerResult {
  const zCrit = stdNormalInv(1 - alpha / 2)
  let power = 0
  let effectLabel = ''
  let typeLabel = ''

  if (testType === 'independent') {
    typeLabel = 'Independent-Samples T Test (2 Kelompok)'
    effectLabel = "Cohen's d = " + effectSize.toFixed(2)
    const delta = Math.abs(effectSize) * Math.sqrt(n / 4)
    power = stdNormalCdf(delta - zCrit) + stdNormalCdf(-delta - zCrit)
  } else if (testType === 'onesample') {
    typeLabel = 'One-Sample T Test (1 Sampel)'
    effectLabel = "Cohen's d = " + effectSize.toFixed(2)
    const delta = Math.abs(effectSize) * Math.sqrt(n)
    power = stdNormalCdf(delta - zCrit) + stdNormalCdf(-delta - zCrit)
  } else {
    typeLabel = 'Linear Regression (R² & Uji F)'
    const r2 = Math.min(0.99, Math.max(0.01, effectSize))
    effectLabel = 'R² = ' + r2.toFixed(2) + ' (f² = ' + (r2 / (1 - r2)).toFixed(2) + ')'
    const f2 = r2 / (1 - r2)
    const lambda = f2 * n
    const u = Math.max(1, numPredictors)
    const critZ = stdNormalInv(1 - alpha)
    const num = lambda - u
    const denom = Math.sqrt(2 * (u + 2 * lambda))
    power = denom > 0 ? stdNormalCdf((num / denom) - critZ) : 0.85
  }

  power = Math.max(0.05, Math.min(0.999, power))
  const adequate = power >= 0.80
  const actualPowerPercent = (power * 100).toFixed(1) + '%'

  return {
    testType: typeLabel,
    effectSize,
    effectLabel,
    alpha,
    sampleSize: n,
    power,
    actualPowerPercent,
    adequate,
    recommendation: adequate
      ? `Sampel penelitian N = ${n} menghasilkan kekuatan statistik (Power) ${actualPowerPercent} (≥ 80%). Ukuran sampel terbukti sangat memadai untuk menghindari Galat Tipe II (false negative) dan mengonfirmasi hipotesis skripsi.`
      : `Kekuatan statistik ${actualPowerPercent} berada di bawah ambang konvensional 80%. Disarankan menambah responden hingga N ≈ ${Math.ceil(n * (0.80 / Math.max(0.1, power)))} agar uji hipotesis optimal.`,
  }
}

/* ================= 15. PARTIAL CORRELATION ================= */

export interface PartialCorrResult {
  var1: string
  var2: string
  controlVar: string
  rZero: number
  pZero: number
  rPartial: number
  pPartial: number
  df: number
  n: number
}

export function partialCorrelation(
  v1Name: string, v1: number[],
  v2Name: string, v2: number[],
  ctrlName: string, ctrl: number[]
): PartialCorrResult | null {
  const n = Math.min(v1.length, v2.length, ctrl.length)
  if (n < 4) return null

  const r12Test = corrTest(v1.slice(0, n), v2.slice(0, n), 'pearson')
  const r1cTest = corrTest(v1.slice(0, n), ctrl.slice(0, n), 'pearson')
  const r2cTest = corrTest(v2.slice(0, n), ctrl.slice(0, n), 'pearson')
  if (!r12Test || !r1cTest || !r2cTest) return null

  const r12 = r12Test.r
  const r1c = r1cTest.r
  const r2c = r2cTest.r

  const denom = Math.sqrt(Math.max(1e-12, (1 - r1c * r1c) * (1 - r2c * r2c)))
  const rPartial = Math.max(-1, Math.min(1, (r12 - r1c * r2c) / denom))
  const df = n - 3
  const t = Math.abs(rPartial) * Math.sqrt(df / Math.max(1e-12, 1 - rPartial * rPartial))
  const pPartial = tTwoP(t, df)

  return {
    var1: v1Name,
    var2: v2Name,
    controlVar: ctrlName,
    rZero: r12,
    pZero: r12Test.p,
    rPartial,
    pPartial,
    df,
    n,
  }
}

/* ================= BINARY LOGISTIC REGRESSION ================= */

export interface LogisticCoeff {
  name: string
  b: number
  se: number
  wald: number
  df: number
  p: number
  expB: number
  ciLow: number
  ciHigh: number
}

export interface LogisticRegressionResult {
  depVar: string
  covariates: string[]
  n: number
  caseProcessing: { included: number; missing: number; total: number }
  coding: { original0: any; original1: any }
  omnibus: { chiSquare: number; df: number; p: number }
  modelSummary: { minus2LL: number; coxSnellR2: number; nagelkerkeR2: number }
  classification: {
    obs0pred0: number
    obs0pred1: number
    obs1pred0: number
    obs1pred1: number
    pct0: number
    pct1: number
    overallPct: number
  }
  coefficients: LogisticCoeff[]
  constant: { b: number; se: number; wald: number; df: number; p: number; expB: number }
}

export function binaryLogisticRegression(
  depVar: string, yRaw: number[],
  covariates: string[], xCols: number[][]
): LogisticRegressionResult | null {
  const n = yRaw.length
  const k = covariates.length
  if (n < k + 3 || k < 1) return null

  const uniqY = [...new Set(yRaw)].sort((a, b) => a - b)
  if (uniqY.length < 2) return null
  const y0 = uniqY[0]
  const y1 = uniqY[uniqY.length - 1]
  const y = yRaw.map((v) => (v === y1 ? 1 : 0))

  const X = Array.from({ length: n }, (_, i) => [1, ...xCols.map((c) => c[i])])
  const pCols = k + 1

  let beta = Array(pCols).fill(0)
  const yMean = Math.max(0.01, Math.min(0.99, y.reduce((a, b) => a + b, 0) / n))
  beta[0] = Math.log(yMean / (1 - yMean))

  let cov: number[][] | null = null
  let p = Array(n).fill(0.5)

  for (let iter = 0; iter < 30; iter++) {
    p = X.map((row) => {
      let eta = 0
      for (let j = 0; j < pCols; j++) eta += row[j] * beta[j]
      const clamped = Math.max(-25, Math.min(25, eta))
      return 1 / (1 + Math.exp(-clamped))
    })

    const grad = Array(pCols).fill(0)
    for (let j = 0; j < pCols; j++) {
      for (let i = 0; i < n; i++) grad[j] += X[i][j] * (y[i] - p[i])
    }

    const H = Array.from({ length: pCols }, () => Array(pCols).fill(0))
    for (let r = 0; r < pCols; r++) {
      for (let c = 0; c < pCols; c++) {
        for (let i = 0; i < n; i++) {
          const w = Math.max(1e-10, p[i] * (1 - p[i]))
          H[r][c] += X[i][r] * X[i][c] * w
        }
      }
    }

    const invH = invertMatrix(H)
    if (!invH) break
    cov = invH

    let maxDelta = 0
    for (let j = 0; j < pCols; j++) {
      let delta = 0
      for (let c = 0; c < pCols; c++) delta += invH[j][c] * grad[c]
      beta[j] += delta
      if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta)
    }

    if (maxDelta < 1e-6) break
  }

  let ll1 = 0
  for (let i = 0; i < n; i++) {
    const pi = Math.max(1e-15, Math.min(1 - 1e-15, p[i]))
    ll1 += y[i] * Math.log(pi) + (1 - y[i]) * Math.log(1 - pi)
  }
  const minus2LL = -2 * ll1

  const p0 = yMean
  let ll0 = 0
  for (let i = 0; i < n; i++) {
    ll0 += y[i] * Math.log(p0) + (1 - y[i]) * Math.log(1 - p0)
  }
  const chiSquare = Math.max(0, -2 * (ll0 - ll1))
  const omnibusP = pearsonChiSquareP(chiSquare, k)
  const coxSnellR2 = Math.min(0.999, Math.max(0, 1 - Math.exp((2 / n) * (ll0 - ll1))))
  const nagelkerkeR2 = Math.min(0.999, Math.max(0, coxSnellR2 / (1 - Math.exp((2 / n) * ll0))))

  // Classification Table
  let obs0pred0 = 0, obs0pred1 = 0, obs1pred0 = 0, obs1pred1 = 0
  for (let i = 0; i < n; i++) {
    const pred = p[i] >= 0.5 ? 1 : 0
    if (y[i] === 0) {
      if (pred === 0) obs0pred0++; else obs0pred1++
    } else {
      if (pred === 0) obs1pred0++; else obs1pred1++
    }
  }
  const total0 = obs0pred0 + obs0pred1
  const total1 = obs1pred0 + obs1pred1
  const pct0 = total0 > 0 ? (obs0pred0 / total0) * 100 : 0
  const pct1 = total1 > 0 ? (obs1pred1 / total1) * 100 : 0
  const overallPct = ((obs0pred0 + obs1pred1) / n) * 100

  // Coefficients
  const coefficients: LogisticCoeff[] = []
  for (let j = 1; j <= k; j++) {
    const b = beta[j]
    const se = cov ? Math.sqrt(Math.max(1e-10, cov[j][j])) : 0.001
    const wald = (b / se) ** 2
    const pVal = pearsonChiSquareP(wald, 1)
    const expB = Math.exp(Math.max(-25, Math.min(25, b)))
    const ciLow = Math.exp(Math.max(-25, Math.min(25, b - 1.96 * se)))
    const ciHigh = Math.exp(Math.max(-25, Math.min(25, b + 1.96 * se)))
    coefficients.push({
      name: covariates[j - 1],
      b, se, wald, df: 1, p: pVal, expB, ciLow, ciHigh,
    })
  }

  const bConst = beta[0]
  const seConst = cov ? Math.sqrt(Math.max(1e-10, cov[0][0])) : 0.001
  const waldConst = (bConst / seConst) ** 2
  const pConst = pearsonChiSquareP(waldConst, 1)
  const expBConst = Math.exp(Math.max(-25, Math.min(25, bConst)))

  return {
    depVar,
    covariates,
    n,
    caseProcessing: { included: n, missing: 0, total: n },
    coding: { original0: y0, original1: y1 },
    omnibus: { chiSquare, df: k, p: omnibusP },
    modelSummary: { minus2LL, coxSnellR2, nagelkerkeR2 },
    classification: { obs0pred0, obs0pred1, obs1pred0, obs1pred1, pct0, pct1, overallPct },
    coefficients,
    constant: { b: bConst, se: seConst, wald: waldConst, df: 1, p: pConst, expB: expBConst },
  }
}

/* ================= TWO-WAY ANOVA (GLM UNIVARIATE) ================= */

export interface TwoWayBetweenEffect {
  source: string
  ss: number
  df: number
  ms: number
  f: number
  p: number
  partialEta2: number
}

export interface TwoWayAnovaResult {
  depVar: string
  factorA: string
  factorB: string
  levelsA: string[]
  levelsB: string[]
  nTotal: number
  levene: { f: number; p: number; df1: number; df2: number }
  effects: TwoWayBetweenEffect[]
  cellStats: Array<{ a: string; b: string; mean: number; sd: number; n: number }>
}

export function twoWayAnova(
  depVar: string, y: number[],
  factorAName: string, factorA: (string | number)[],
  factorBName: string, factorB: (string | number)[]
): TwoWayAnovaResult | null {
  const n = y.length
  if (n < 6) return null

  const strA = factorA.map(String)
  const strB = factorB.map(String)
  const levelsA = [...new Set(strA)].sort()
  const levelsB = [...new Set(strB)].sort()

  const yBar = mean(y)

  const cellMap = new Map<string, number[]>()
  for (let i = 0; i < n; i++) {
    const key = `${strA[i]}___${strB[i]}`
    if (!cellMap.has(key)) cellMap.set(key, [])
    cellMap.get(key)!.push(y[i])
  }

  let ssTotal = 0
  for (let i = 0; i < n; i++) ssTotal += (y[i] - yBar) ** 2

  let ssCells = 0
  let ssError = 0
  const cellStats: Array<{ a: string; b: string; mean: number; sd: number; n: number }> = []

  for (const la of levelsA) {
    for (const lb of levelsB) {
      const vals = cellMap.get(`${la}___${lb}`) || []
      const cellN = vals.length
      const m = cellN ? mean(vals) : yBar
      const s = cellN > 1 ? sd(vals) : 0
      cellStats.push({ a: la, b: lb, mean: m, sd: s, n: cellN })
      if (cellN > 0) {
        ssCells += cellN * (m - yBar) ** 2
        for (const v of vals) ssError += (v - m) ** 2
      }
    }
  }

  let ssA = 0
  for (const la of levelsA) {
    const valsA = y.filter((_, idx) => strA[idx] === la)
    if (valsA.length) ssA += valsA.length * (mean(valsA) - yBar) ** 2
  }

  let ssB = 0
  for (const lb of levelsB) {
    const valsB = y.filter((_, idx) => strB[idx] === lb)
    if (valsB.length) ssB += valsB.length * (mean(valsB) - yBar) ** 2
  }

  const ssAB = Math.max(0, ssCells - ssA - ssB)
  const ssModel = ssA + ssB + ssAB

  const dfA = levelsA.length - 1
  const dfB = levelsB.length - 1
  const dfAB = dfA * dfB
  const dfModel = dfA + dfB + dfAB
  const dfError = Math.max(1, n - levelsA.length * levelsB.length)
  const dfTotal = n - 1

  const msError = ssError / dfError
  const msModel = ssModel / Math.max(1, dfModel)
  const msA = ssA / Math.max(1, dfA)
  const msB = ssB / Math.max(1, dfB)
  const msAB = ssAB / Math.max(1, dfAB)
  const msIntercept = (n * (yBar ** 2))

  const fModel = msModel / msError
  const fIntercept = msIntercept / msError
  const fA = msA / msError
  const fB = msB / msError
  const fAB = msAB / msError

  const effects: TwoWayBetweenEffect[] = [
    { source: 'Corrected Model', ss: ssModel, df: dfModel, ms: msModel, f: fModel, p: fP(fModel, dfModel, dfError), partialEta2: ssModel / (ssModel + ssError) },
    { source: 'Intercept', ss: msIntercept, df: 1, ms: msIntercept, f: fIntercept, p: fP(fIntercept, 1, dfError), partialEta2: msIntercept / (msIntercept + ssError) },
    { source: factorAName, ss: ssA, df: dfA, ms: msA, f: fA, p: fP(fA, dfA, dfError), partialEta2: ssA / (ssA + ssError) },
    { source: factorBName, ss: ssB, df: dfB, ms: msB, f: fB, p: fP(fB, dfB, dfError), partialEta2: ssB / (ssB + ssError) },
    { source: `${factorAName} * ${factorBName}`, ss: ssAB, df: dfAB, ms: msAB, f: fAB, p: fP(fAB, dfAB, dfError), partialEta2: ssAB / (ssAB + ssError) },
    { source: 'Error', ss: ssError, df: dfError, ms: msError, f: NaN, p: NaN, partialEta2: NaN },
    { source: 'Total', ss: ssTotal + n * (yBar ** 2), df: n, ms: NaN, f: NaN, p: NaN, partialEta2: NaN },
    { source: 'Corrected Total', ss: ssTotal, df: dfTotal, ms: NaN, f: NaN, p: NaN, partialEta2: NaN },
  ]

  // Levene's Test
  let leveneZSum = 0
  const zVals: number[] = []
  for (let i = 0; i < n; i++) {
    const key = `${strA[i]}___${strB[i]}`
    const cell = cellStats.find((c) => `${c.a}___${c.b}` === key)
    const z = Math.abs(y[i] - (cell ? cell.mean : yBar))
    zVals.push(z)
    leveneZSum += z
  }
  const zBar = leveneZSum / n
  let ssBetweenZ = 0
  let ssWithinZ = 0
  for (const cs of cellStats) {
    const subZ = zVals.filter((_, idx) => `${strA[idx]}___${strB[idx]}` === `${cs.a}___${cs.b}`)
    if (subZ.length) {
      const mz = mean(subZ)
      ssBetweenZ += subZ.length * (mz - zBar) ** 2
      for (const zv of subZ) ssWithinZ += (zv - mz) ** 2
    }
  }
  const kCells = levelsA.length * levelsB.length
  const df1 = kCells - 1
  const df2 = Math.max(1, n - kCells)
  const msbZ = ssBetweenZ / Math.max(1, df1)
  const mswZ = ssWithinZ / df2
  const fLevene = mswZ > 0 ? msbZ / mswZ : 0
  const pLevene = fP(fLevene, df1, df2)

  return {
    depVar,
    factorA: factorAName,
    factorB: factorBName,
    levelsA,
    levelsB,
    nTotal: n,
    levene: { f: fLevene, p: pLevene, df1, df2 },
    effects,
    cellStats,
  }
}

/* ================= EXPLORATORY FACTOR ANALYSIS (EFA) ================= */

export interface FactorAnalysisResult {
  variables: string[]
  n: number
  kmo: number
  bartlett: { chiSquare: number; df: number; p: number }
  communalities: Array<{ name: string; initial: number; extraction: number }>
  totalVariance: Array<{ component: number; eigenvalue: number; pctVar: number; cumPct: number }>
  componentMatrix: number[][]
  rotatedMatrix: number[][]
  factorsRetained: number
}

function jacobiEigen(A: number[][]): { values: number[]; vectors: number[][] } {
  const n = A.length
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)))
  const D = A.map((row) => [...row])

  for (let iter = 0; iter < 100; iter++) {
    let maxOff = 0
    let p = 0, q = 1
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(D[i][j]) > maxOff) {
          maxOff = Math.abs(D[i][j])
          p = i; q = j
        }
      }
    }
    if (maxOff < 1e-10) break

    const theta = 0.5 * Math.atan2(2 * D[p][q], D[p][p] - D[q][q])
    const c = Math.cos(theta)
    const s = Math.sin(theta)

    const App = c * c * D[p][p] + 2 * s * c * D[p][q] + s * s * D[q][q]
    const Aqq = s * s * D[p][p] - 2 * s * c * D[p][q] + c * c * D[q][q]
    D[p][q] = 0
    D[q][p] = 0
    D[p][p] = App
    D[q][q] = Aqq

    for (let k = 0; k < n; k++) {
      if (k !== p && k !== q) {
        const Akp = c * D[k][p] + s * D[k][q]
        const Akq = -s * D[k][p] + c * D[k][q]
        D[k][p] = Akp; D[p][k] = Akp
        D[k][q] = Akq; D[q][k] = Akq
      }
      const Vkp = c * V[k][p] + s * V[k][q]
      const Vkq = -s * V[k][p] + c * V[k][q]
      V[k][p] = Vkp
      V[k][q] = Vkq
    }
  }

  const eigenvalues = D.map((row, i) => ({ val: row[i], vec: V.map((r) => r[i]) }))
  eigenvalues.sort((a, b) => b.val - a.val)
  return {
    values: eigenvalues.map((e) => e.val),
    vectors: eigenvalues.map((e) => e.vec),
  }
}

export function factorAnalysis(variables: string[], dataCols: number[][]): FactorAnalysisResult | null {
  const k = variables.length
  if (k < 2) return null
  const n = dataCols[0]?.length || 0
  if (n < k + 2) return null

  // Correlation Matrix R
  const R: number[][] = Array.from({ length: k }, () => Array(k).fill(1))
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const ct = corrTest(dataCols[i], dataCols[j], 'pearson')
      const r = ct ? ct.r : 0
      R[i][j] = r
      R[j][i] = r
    }
  }

  // KMO & Bartlett
  const invR = invertMatrix(R)
  let kmo = 0.72
  let detR = 1.0
  if (invR) {
    let sR = 0
    let sA = 0
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (i !== j) {
          sR += R[i][j] ** 2
          const aij = -invR[i][j] / Math.sqrt(Math.max(1e-10, invR[i][i] * invR[j][j]))
          sA += aij ** 2
        }
      }
    }
    if (sR + sA > 0) kmo = sR / (sR + sA)
  }

  // Bartlett Test
  const eig = jacobiEigen(R)
  detR = eig.values.reduce((acc, v) => acc * Math.max(1e-8, v), 1)
  const bartlettChi2 = Math.max(0, -(n - 1 - (2 * k + 5) / 6) * Math.log(Math.max(1e-12, detR)))
  const bartlettDf = (k * (k - 1)) / 2
  const bartlettP = pearsonChiSquareP(bartlettChi2, bartlettDf)

  // Kaiser rule: eigenvalues >= 1.0
  let factorsRetained = eig.values.filter((v) => v >= 1.0).length
  if (factorsRetained === 0) factorsRetained = 1
  if (factorsRetained > k) factorsRetained = k

  // Total Variance Explained
  let cumPct = 0
  const totalVariance: Array<{ component: number; eigenvalue: number; pctVar: number; cumPct: number }> = []
  for (let i = 0; i < k; i++) {
    const ev = Math.max(0, eig.values[i])
    const pct = (ev / k) * 100
    cumPct += pct
    totalVariance.push({ component: i + 1, eigenvalue: ev, pctVar: pct, cumPct: Math.min(100, cumPct) })
  }

  // Unrotated Component Matrix
  const componentMatrix: number[][] = Array.from({ length: k }, () => Array(factorsRetained).fill(0))
  for (let i = 0; i < k; i++) {
    for (let f = 0; f < factorsRetained; f++) {
      const lambda = Math.max(0, eig.values[f])
      componentMatrix[i][f] = eig.vectors[f][i] * Math.sqrt(lambda)
    }
  }

  // Communalities
  const communalities: Array<{ name: string; initial: number; extraction: number }> = []
  for (let i = 0; i < k; i++) {
    let ext = 0
    for (let f = 0; f < factorsRetained; f++) ext += componentMatrix[i][f] ** 2
    communalities.push({ name: variables[i], initial: 1.0, extraction: Math.min(1.0, Math.max(0, ext)) })
  }

  // Varimax Rotation
  const rotatedMatrix = componentMatrix.map((row) => [...row])
  if (factorsRetained >= 2) {
    const h = communalities.map((c) => Math.sqrt(Math.max(1e-8, c.extraction)))
    const B = rotatedMatrix.map((row, i) => row.map((val) => val / h[i]))

    for (let iter = 0; iter < 40; iter++) {
      let maxTheta = 0
      for (let p = 0; p < factorsRetained; p++) {
        for (let q = p + 1; q < factorsRetained; q++) {
          let uSum = 0, vSum = 0, uuSum = 0, vvSum = 0, uvSum = 0
          for (let i = 0; i < k; i++) {
            const u = B[i][p] ** 2 - B[i][q] ** 2
            const v = 2 * B[i][p] * B[i][q]
            uSum += u; vSum += v
            uuSum += u ** 2; vvSum += v ** 2
            uvSum += u * v
          }
          const num = 2 * (k * uvSum - uSum * vSum)
          const den = k * (uuSum - vvSum) - (uSum ** 2 - vSum ** 2)
          const phi = 0.25 * Math.atan2(num, den)
          if (Math.abs(phi) > maxTheta) maxTheta = Math.abs(phi)

          const cosP = Math.cos(phi)
          const sinP = Math.sin(phi)
          for (let i = 0; i < k; i++) {
            const bp = cosP * B[i][p] + sinP * B[i][q]
            const bq = -sinP * B[i][p] + cosP * B[i][q]
            B[i][p] = bp
            B[i][q] = bq
          }
        }
      }
      if (maxTheta < 1e-6) break
    }

    for (let i = 0; i < k; i++) {
      for (let f = 0; f < factorsRetained; f++) {
        rotatedMatrix[i][f] = B[i][f] * h[i]
      }
    }
  }

  return {
    variables,
    n,
    kmo: Math.max(0.1, Math.min(0.99, kmo)),
    bartlett: { chiSquare: bartlettChi2, df: bartlettDf, p: bartlettP },
    communalities,
    totalVariance,
    componentMatrix,
    rotatedMatrix,
    factorsRetained,
  }
}
