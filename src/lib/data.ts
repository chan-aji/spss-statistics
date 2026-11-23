import type { Dataset, Variable } from './types'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeGaussian(rand: () => number) {
  return () => {
    let u = 0
    let v = 0
    while (u === 0) u = rand()
    while (v === 0) v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export const likertValues: Record<number, string> = {
  1: 'Sangat tidak setuju',
  2: 'Tidak setuju',
  3: 'Netral',
  4: 'Setuju',
  5: 'Sangat setuju',
}

export const SURVEY_VARIABLES: Variable[] = [
  {
    id: 'v1', name: 'ID', label: 'Nomor responden', type: 'numeric', width: 6, columns: 6, decimals: 0,
    values: null, measure: 'Nominal', role: 'None', align: 'Right', missing: 'None',
  },
  {
    id: 'v2', name: 'Usia', label: 'Usia responden (tahun)', type: 'numeric', width: 8, columns: 8, decimals: 0,
    values: null, measure: 'Scale', role: 'Input', align: 'Right', missing: 'None',
  },
  {
    id: 'v3', name: 'JK', label: 'Jenis kelamin', type: 'numeric', width: 8, columns: 8, decimals: 0,
    values: { 1: 'Laki-laki', 2: 'Perempuan' }, measure: 'Nominal', role: 'Input', align: 'Right', missing: 'None',
  },
  {
    id: 'v4', name: 'X1_Harga', label: 'Harga produk', type: 'numeric', width: 10, columns: 10, decimals: 0,
    values: likertValues, measure: 'Scale', role: 'Input', align: 'Right', missing: 'None',
  },
  {
    id: 'v5', name: 'X2_Kualitas', label: 'Kualitas produk', type: 'numeric', width: 12, columns: 12, decimals: 0,
    values: likertValues, measure: 'Scale', role: 'Input', align: 'Right', missing: 'None',
  },
  {
    id: 'v6', name: 'X3_Promosi', label: 'Promosi', type: 'numeric', width: 11, columns: 11, decimals: 0,
    values: likertValues, measure: 'Scale', role: 'Input', align: 'Right', missing: 'None',
  },
  {
    id: 'v7', name: 'Y_Keputusan', label: 'Keputusan pembelian', type: 'numeric', width: 12, columns: 12, decimals: 0,
    values: likertValues, measure: 'Scale', role: 'Target', align: 'Right', missing: 'None',
  },
]

export function createSurveyDataset(): Dataset {
  const rand = mulberry32(20241121)
  const gauss = makeGaussian(rand)
  const rows: number[][] = []

  for (let i = 0; i < 100; i++) {
    const q = gauss()
    const e1 = gauss()
    const e2 = gauss()
    const e3 = gauss()
    const ey = gauss()

    const x1 = clamp(Math.round(3.45 + 0.5 * q + 0.82 * e1), 1, 5)
    const x2 = clamp(Math.round(3.6 + 0.86 * q + 0.5 * e2), 1, 5)
    const x3 = clamp(Math.round(3.35 + 0.68 * q + 0.7 * e3), 1, 5)

    const latent = 0.34 * (x1 - 3) + 0.56 * (x2 - 3) + 0.4 * (x3 - 3) + 0.5 * ey
    let y = clamp(Math.round(3.5 + latent), 1, 5)

    if (i % 23 === 7) y = Math.max(1, y - 1)
    if (i % 31 === 3) y = Math.min(5, y + 1)

    const usia = 18 + Math.floor(rand() * 8)
    const jk = rand() < 0.53 ? 2 : 1

    rows.push([i + 1, usia, jk, x1, x2, x3, y])
  }

  return {
    name: 'survei_keputusan_pembelian.sav',
    variables: SURVEY_VARIABLES.map((v) => ({ ...v, values: v.values ? { ...v.values } : null })),
    rows,
    filteredRows: new Array(100).fill(true),
  }
}

export function emptyDataset(): Dataset {
  return {
    name: 'Untitled1.sav',
    variables: SURVEY_VARIABLES.map((v) => ({ ...v, values: v.values ? { ...v.values } : null })),
    rows: [],
    filteredRows: [],
  }
}

export function cloneDataset(ds: Dataset): Dataset {
  return {
    name: ds.name,
    variables: ds.variables.map((v) => ({ ...v, values: v.values ? { ...v.values } : null })),
    rows: ds.rows.map((r) => [...r]),
    filteredRows: ds.filteredRows ? [...ds.filteredRows] : undefined,
  }
}

/* ================= COMPUTE VARIABLE LOGIC ================= */

export function executeComputeVariable(
  ds: Dataset,
  targetName: string,
  targetLabel: string,
  expression: string
): { dataset: Dataset; success: boolean; message?: string } {
  const safeName = targetName.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, 'V$1')
  if (!safeName) return { dataset: ds, success: false, message: 'Nama variabel target tidak valid.' }

  const next = cloneDataset(ds)
  const varIndex = next.variables.findIndex((v) => v.name.toLowerCase() === safeName.toLowerCase())

  const varMap = new Map<string, number>()
  next.variables.forEach((v, i) => varMap.set(v.name.toLowerCase(), i))

  const evaluateRow = (row: number[]): number => {
    let exp = expression

    exp = exp.replace(/SUM\s*\(([^)]+)\)/gi, (_, args) => {
      const cols = args.split(',').map((s: string) => s.trim().toLowerCase())
      const sum = cols.reduce((acc: number, cName: string) => {
        const i = varMap.get(cName)
        return acc + (i !== undefined ? (row[i] || 0) : 0)
      }, 0)
      return String(sum)
    })

    exp = exp.replace(/MEAN\s*\(([^)]+)\)/gi, (_, args) => {
      const cols = args.split(',').map((s: string) => s.trim().toLowerCase())
      let sum = 0
      let count = 0
      cols.forEach((cName: string) => {
        const i = varMap.get(cName)
        if (i !== undefined) {
          sum += row[i] || 0
          count++
        }
      })
      return String(count > 0 ? sum / count : 0)
    })

    next.variables.forEach((v, i) => {
      const regex = new RegExp('\\b' + v.name + '\\b', 'gi')
      exp = exp.replace(regex, String(row[i] ?? 0))
    })

    if (!/^[0-9\s+\-*/().,]+$/.test(exp)) {
      return NaN
    }
    try {
      // eslint-disable-next-line no-new-func
      const val = Function('"use strict"; return (' + exp.replace(/,/g, '.') + ')')()
      return typeof val === 'number' && Number.isFinite(val) ? val : NaN
    } catch {
      return NaN
    }
  }

  const newValues = next.rows.map(evaluateRow)

  if (varIndex >= 0) {
    next.variables[varIndex].label = targetLabel || next.variables[varIndex].label
    for (let r = 0; r < next.rows.length; r++) {
      next.rows[r][varIndex] = newValues[r]
    }
  } else {
    const hasDecimals = newValues.some((v) => Number.isFinite(v) && !Number.isInteger(v))
    next.variables.push({
      id: 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: safeName,
      label: targetLabel || safeName,
      type: 'numeric',
      width: 10,
      columns: 10,
      decimals: hasDecimals ? 2 : 0,
      values: null,
      measure: 'Scale',
      role: 'Input',
      align: 'Right',
      missing: 'None',
    })
    for (let r = 0; r < next.rows.length; r++) {
      next.rows[r].push(newValues[r])
    }
  }

  return { dataset: next, success: true }
}

/* ================= RECODE VARIABLE LOGIC ================= */

export interface RecodeRule {
  oldVal: number
  newVal: number
}

export { exportSav, parseSav, isSavFile } from './sav'

export function datasetToExcelXML(ds: Dataset): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const headerCells = ds.variables.map((v) => `<Cell><Data ss:Type="String">${esc(v.name)}</Data></Cell>`).join('')
  const rows = ds.rows.map((r) => {
    const cells = r.map((c) => `<Cell><Data ss:Type="Number">${c}</Data></Cell>`).join('')
    return `<Row>${cells}</Row>`
  }).join('')
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="SPSS_Data">
  <Table>
   <Row>${headerCells}</Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`
}

export function executeRecode(
  ds: Dataset,
  sourceVar: string,
  targetVar: string,
  rules: RecodeRule[],
  intoSame: boolean
): { dataset: Dataset; success: boolean; message?: string } {
  const next = cloneDataset(ds)
  const srcIdx = next.variables.findIndex((v) => v.name === sourceVar)
  if (srcIdx < 0) return { dataset: ds, success: false, message: 'Variabel sumber tidak ditemukan.' }

  const ruleMap = new Map<number, number>()
  rules.forEach((r) => ruleMap.set(r.oldVal, r.newVal))

  const recodedCol = next.rows.map((r) => {
    const orig = r[srcIdx]
    return ruleMap.has(orig) ? ruleMap.get(orig)! : orig
  })

  if (intoSame) {
    for (let i = 0; i < next.rows.length; i++) {
      next.rows[i][srcIdx] = recodedCol[i]
    }
  } else {
    const safeTarget = targetVar.trim().replace(/[^A-Za-z0-9_]/g, '_')
    if (!safeTarget) return { dataset: ds, success: false, message: 'Nama variabel baru tidak valid.' }
    const targetIdx = next.variables.findIndex((v) => v.name === safeTarget)
    if (targetIdx >= 0) {
      for (let i = 0; i < next.rows.length; i++) {
        next.rows[i][targetIdx] = recodedCol[i]
      }
    } else {
      const srcVar = next.variables[srcIdx]
      next.variables.push({
        id: 'v-recode-' + Date.now(),
        name: safeTarget,
        label: safeTarget + ' (Recoded from ' + sourceVar + ')',
        type: 'numeric',
        width: srcVar.width,
        columns: srcVar.columns,
        decimals: srcVar.decimals,
        values: null,
        measure: srcVar.measure,
        role: 'Input',
        align: srcVar.align,
        missing: 'None',
      })
      for (let i = 0; i < next.rows.length; i++) {
        next.rows[i].push(recodedCol[i])
      }
    }
  }

  return { dataset: next, success: true }
}
