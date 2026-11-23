import { createSurveyDataset } from './src/lib/data.ts'
import { regression, corrTest, reliability, describe } from './src/lib/stats.ts'
const ds = createSurveyDataset()
const col = (n: string) => ds.rows.map((r) => r[ds.variables.findIndex((v) => v.name === n)])
const names = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi', 'Y_Keputusan']
for (const n of names) {
  const d = describe(n, n, col(n))
  console.log(n, 'mean', d.mean.toFixed(2), 'sd', d.sd.toFixed(2), 'min', d.min, 'max', d.max)
}
for (let i = 0; i < 3; i++) for (let j = i + 1; j < 4; j++) {
  const c = corrTest(col(names[i]), col(names[j]))
  console.log(names[i], names[j], 'r', c.r.toFixed(3), 'p', c.p.toFixed(5))
}
const reg = regression(col('Y_Keputusan'), [col('X1_Harga'), col('X2_Kualitas'), col('X3_Promosi')], ['X1', 'X2', 'X3'])
if (reg) {
  console.log('R2', reg.r2.toFixed(3), 'F', reg.f.toFixed(2), 'p', reg.p.toExponential(2))
  reg.coefficients.forEach((c) => console.log(c.name, 'b', c.b.toFixed(3), 'beta', c.beta.toFixed(3), 't', c.t.toFixed(2), 'p', c.p.toFixed(6), 'tol', c.tolerance.toFixed(2)))
}
const rel = reliability(['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].map((n) => ({ name: n, values: col(n) })))
if (rel) {
  console.log('alpha', rel.alpha.toFixed(3))
  rel.itemStats.forEach((s) => console.log(s.name, 'itemTotal', s.correctedItemTotal.toFixed(3), 'alphaDel', s.alphaIfDeleted.toFixed(3)))
}
