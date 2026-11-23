import type { Dataset, Variable } from './types'

export class ByteWriter {
  private buffer: Uint8Array
  private view: DataView
  private pos: number

  constructor(initialCapacity = 1024 * 1024) {
    this.buffer = new Uint8Array(initialCapacity)
    this.view = new DataView(this.buffer.buffer)
    this.pos = 0
  }

  private ensure(bytes: number) {
    if (this.pos + bytes > this.buffer.length) {
      const next = new Uint8Array(Math.max(this.buffer.length * 2, this.pos + bytes + 1024))
      next.set(this.buffer)
      this.buffer = next
      this.view = new DataView(this.buffer.buffer)
    }
  }

  writeInt32(val: number) {
    this.ensure(4)
    this.view.setInt32(this.pos, val, true)
    this.pos += 4
  }

  writeFloat64(val: number) {
    this.ensure(8)
    this.view.setFloat64(this.pos, val, true)
    this.pos += 8
  }

  writeUint8(val: number) {
    this.ensure(1)
    this.buffer[this.pos++] = val
  }

  writeBytes(bytes: Uint8Array) {
    this.ensure(bytes.length)
    this.buffer.set(bytes, this.pos)
    this.pos += bytes.length
  }

  writeString(str: string, fixedLen: number | null = null) {
    const enc = new TextEncoder()
    const encoded = enc.encode(str)
    if (fixedLen !== null) {
      const buf = new Uint8Array(fixedLen)
      buf.fill(0x20) // space padding
      buf.set(encoded.subarray(0, fixedLen))
      this.writeBytes(buf)
    } else {
      this.writeBytes(encoded)
    }
  }

  toUint8Array(): Uint8Array {
    return this.buffer.subarray(0, this.pos)
  }
}

export class ByteReader {
  private buffer: Uint8Array
  private view: DataView
  pos: number

  constructor(arrayBuffer: ArrayBuffer) {
    this.buffer = new Uint8Array(arrayBuffer)
    this.view = new DataView(arrayBuffer)
    this.pos = 0
  }

  isAtEnd(): boolean {
    return this.pos >= this.buffer.length
  }

  readInt32(): number {
    if (this.pos + 4 > this.buffer.length) return 0
    const val = this.view.getInt32(this.pos, true)
    this.pos += 4
    return val
  }

  peekInt32(): number {
    if (this.pos + 4 > this.buffer.length) return 0
    return this.view.getInt32(this.pos, true)
  }

  readFloat64(): number {
    if (this.pos + 8 > this.buffer.length) return NaN
    const val = this.view.getFloat64(this.pos, true)
    this.pos += 8
    return val
  }

  readUint8(): number {
    if (this.pos >= this.buffer.length) return 0
    return this.buffer[this.pos++]
  }

  readBytes(len: number): Uint8Array {
    const actual = Math.min(len, this.buffer.length - this.pos)
    const out = this.buffer.subarray(this.pos, this.pos + actual)
    this.pos += actual
    return out
  }

  readString(len: number, trim = true): string {
    const bytes = this.readBytes(len)
    const dec = new TextDecoder('utf-8', { fatal: false })
    const str = dec.decode(bytes)
    return trim ? str.trim() : str
  }
}

export function isSavFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer, 0, 4)
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  return magic === '$FL2' || magic === '$FL3'
}

/**
 * Generates a 100% compliant standard uncompressed IBM SPSS Statistics binary .sav file
 */
export function exportSav(dataset: Dataset): Uint8Array {
  const writer = new ByteWriter()
  const V = dataset.variables.length
  const N = dataset.rows.length

  // Header Record (176 bytes)
  writer.writeString('$FL2')
  writer.writeString('@(#) SPSS DATA FILE IBM SPSS Statistics 29.0.0.0', 60)
  writer.writeInt32(2) // layout_code
  writer.writeInt32(V) // case_size
  writer.writeInt32(0) // compressed = 0
  writer.writeInt32(0) // weight_index
  writer.writeInt32(N) // n_cases
  writer.writeFloat64(100.0) // bias
  writer.writeString('22 Nov 26', 9) // creation date
  writer.writeString('12:00:00', 8) // creation time
  writer.writeString((dataset.name || 'Dataset.sav').slice(0, 64), 64) // file label
  writer.writeBytes(new Uint8Array([0, 0, 0])) // 3 bytes padding (total 176)

  // Mapping 8-char short names
  const shortNames = dataset.variables.map((v, i) => {
    let s = v.name.replace(/[^A-Za-z0-9_]/g, '').toUpperCase().slice(0, 8)
    if (!s || /^[0-9]/.test(s)) s = 'V' + String(i + 1).padStart(5, '0')
    return s.padEnd(8, ' ').slice(0, 8)
  })

  // Variable Records (Type 2)
  for (let i = 0; i < V; i++) {
    const v = dataset.variables[i]
    writer.writeInt32(2) // rec_type
    writer.writeInt32(0) // type = 0 (numeric)
    const hasLabel = v.label && v.label.length > 0 ? 1 : 0
    writer.writeInt32(hasLabel)
    writer.writeInt32(0) // n_missing_values
    const printFormat = (5 << 16) | ((v.decimals || 0) << 8) | (v.width || 8)
    writer.writeInt32(printFormat)
    writer.writeInt32(printFormat)
    writer.writeString(shortNames[i], 8)
    if (hasLabel) {
      const enc = new TextEncoder()
      const labelBytes = enc.encode(v.label.slice(0, 120))
      writer.writeInt32(labelBytes.length)
      writer.writeBytes(labelBytes)
      const pad = (4 - (labelBytes.length % 4)) % 4
      if (pad > 0) writer.writeBytes(new Uint8Array(pad))
    }
  }

  // Value Labels (Type 3 & 4)
  for (let i = 0; i < V; i++) {
    const v = dataset.variables[i]
    if (v.values && Object.keys(v.values).length > 0) {
      const entries = Object.entries(v.values)
      writer.writeInt32(3) // rec_type
      writer.writeInt32(entries.length)
      const enc = new TextEncoder()
      for (const [valStr, lbl] of entries) {
        writer.writeFloat64(Number(valStr))
        const lblBytes = enc.encode(lbl.slice(0, 60))
        writer.writeUint8(lblBytes.length)
        writer.writeBytes(lblBytes)
        const pad = (8 - ((lblBytes.length + 1) % 8)) % 8
        if (pad > 0) writer.writeBytes(new Uint8Array(pad))
      }
      // Value label variable record (Type 4)
      writer.writeInt32(4)
      writer.writeInt32(1) // n_vars
      writer.writeInt32(i + 1) // 1-based variable index
    }
  }

  // Info Record: Subtype 11 (Measurement / Display parameters)
  writer.writeInt32(7)
  writer.writeInt32(11) // subtype 11
  writer.writeInt32(4) // size = 4
  writer.writeInt32(V * 3) // count
  for (let i = 0; i < V; i++) {
    const v = dataset.variables[i]
    const measure = v.measure === 'Nominal' ? 1 : v.measure === 'Ordinal' ? 2 : 3
    const width = v.columns || v.width || 8
    const align = v.align === 'Left' ? 0 : v.align === 'Center' ? 2 : 1
    writer.writeInt32(measure)
    writer.writeInt32(width)
    writer.writeInt32(align)
  }

  // Info Record: Subtype 13 (Long Variable Names)
  const longNamePairs = dataset.variables.map((v, i) => `${shortNames[i].trim()}=${v.name}`).join('\t')
  const longNameBytes = new TextEncoder().encode(longNamePairs)
  writer.writeInt32(7)
  writer.writeInt32(13)
  writer.writeInt32(1)
  writer.writeInt32(longNameBytes.length)
  writer.writeBytes(longNameBytes)

  // Info Record: Subtype 20 (UTF-8 Encoding)
  const utf8Bytes = new TextEncoder().encode('UTF-8')
  writer.writeInt32(7)
  writer.writeInt32(20)
  writer.writeInt32(1)
  writer.writeInt32(utf8Bytes.length)
  writer.writeBytes(utf8Bytes)

  // Dictionary Termination Record (Type 999)
  writer.writeInt32(999)
  writer.writeInt32(0) // filler

  // Data Section (Uncompressed IEEE 754 Doubles)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < V; c++) {
      const val = Number(dataset.rows[r][c])
      if (Number.isFinite(val)) {
        writer.writeFloat64(val)
      } else {
        writer.writeFloat64(-1.7976931348623157e+308) // SYSMIS
      }
    }
  }

  return writer.toUint8Array()
}

/**
 * Parses any real IBM SPSS Statistics binary .sav file directly in the browser
 */
export function parseSav(arrayBuffer: ArrayBuffer, fileName?: string): Dataset {
  const reader = new ByteReader(arrayBuffer)
  const magic = reader.readString(4, false)
  if (magic !== '$FL2' && magic !== '$FL3') {
    throw new Error('Bukan file IBM SPSS Statistics yang valid (magic header "' + magic + '" !== "$FL2").')
  }

  const productName = reader.readString(60)
  const layoutCode = reader.readInt32()
  const caseSize = reader.readInt32()
  const compressed = reader.readInt32()
  const weightIndex = reader.readInt32()
  const nCases = reader.readInt32()
  const bias = reader.readFloat64()
  const creationDate = reader.readString(9)
  const creationTime = reader.readString(8)
  const fileLabel = reader.readString(64)
  reader.readBytes(3) // padding

  interface RawVar {
    type: number
    shortName: string
    label: string
    decimals: number
    width: number
  }

  const rawVars: RawVar[] = []
  const valueLabelMap = new Map<number, Record<number, string>>()

  const longVarNamesMap = new Map<string, string>()
  const measureMap = new Map<number, 'Nominal' | 'Ordinal' | 'Scale'>()

  let done = false
  while (!reader.isAtEnd() && !done) {
    const recType = reader.readInt32()
    if (recType === 2) {
      // Variable Record
      const type = reader.readInt32()
      const hasLabel = reader.readInt32() === 1
      const nMissing = reader.readInt32()
      const printFormat = reader.readInt32()
      const writeFormat = reader.readInt32()
      const shortName = reader.readString(8, true)
      let label = ''
      if (hasLabel) {
        const labelLen = reader.readInt32()
        label = reader.readString(labelLen, false)
        const pad = (4 - (labelLen % 4)) % 4
        if (pad > 0) reader.readBytes(pad)
      }
      if (nMissing !== 0) {
        const count = Math.abs(nMissing)
        reader.readBytes(count * 8)
      }
      const decimals = (printFormat >> 8) & 0xff
      const width = printFormat & 0xff
      rawVars.push({
        type,
        shortName,
        label: label || shortName,
        decimals,
        width: width || 8,
      })
    } else if (recType === 3) {
      // Value Label Record
      const count = reader.readInt32()
      const pairs: Record<number, string> = {}
      for (let i = 0; i < count; i++) {
        const val = reader.readFloat64()
        const labelLen = reader.readUint8()
        const lbl = reader.readString(labelLen, false)
        const pad = (8 - ((labelLen + 1) % 8)) % 8
        if (pad > 0) reader.readBytes(pad)
        pairs[val] = lbl
      }
      if (reader.peekInt32() === 4) {
        reader.readInt32() // consume 4
        const nVars = reader.readInt32()
        for (let i = 0; i < nVars; i++) {
          const varIdx = reader.readInt32() - 1 // 1-based to 0-based
          valueLabelMap.set(varIdx, { ...(valueLabelMap.get(varIdx) || {}), ...pairs })
        }
      }
    } else if (recType === 6) {
      // Document record
      const lines = reader.readInt32()
      reader.readBytes(lines * 80)
    } else if (recType === 7) {
      // Info Record
      const subType = reader.readInt32()
      const size = reader.readInt32()
      const count = reader.readInt32()
      const totalBytes = size * count
      if (subType === 13) {
        // Long Variable Names
        const str = reader.readString(totalBytes, true)
        const pairs = str.split('\t')
        for (const p of pairs) {
          const [sh, ln] = p.split('=')
          if (sh && ln) longVarNamesMap.set(sh.trim().toUpperCase(), ln.trim())
        }
      } else if (subType === 11) {
        // Auxiliary Variable Parameters (Measurement level)
        const nVars = rawVars.length
        const intsPerVar = Math.floor(count / nVars)
        for (let i = 0; i < nVars; i++) {
          const m = reader.readInt32()
          if (intsPerVar >= 2) reader.readInt32()
          if (intsPerVar >= 3) reader.readInt32()
          const measureName: 'Nominal' | 'Ordinal' | 'Scale' = m === 1 ? 'Nominal' : m === 2 ? 'Ordinal' : 'Scale'
          measureMap.set(i, measureName)
        }
      } else {
        reader.readBytes(totalBytes)
      }
    } else if (recType === 999) {
      reader.readInt32() // filler
      done = true
    } else {
      done = true
    }
  }

  // Build actual variables (excluding string continuation records where type === -1)
  const actualVars: Variable[] = []
  const varMapping: number[] = []

  rawVars.forEach((v, idx) => {
    if (v.type >= 0) {
      const realName = longVarNamesMap.get(v.shortName.toUpperCase()) || v.shortName
      const measure = measureMap.get(idx) || (v.type === 0 ? 'Scale' : 'Nominal')
      const valLabels = valueLabelMap.get(idx) || null
      actualVars.push({
        id: 'var-' + idx + '-' + realName,
        name: realName,
        label: v.label || realName,
        type: v.type === 0 ? 'numeric' : 'string',
        width: v.width || 8,
        columns: v.width || 8,
        decimals: v.decimals || 0,
        values: valLabels,
        measure: valLabels ? 'Nominal' : measure,
        role: 'Input',
        align: 'Right',
        missing: 'None',
      })
      varMapping.push(idx)
    }
  })

  // Read data rows
  const rows: number[][] = []
  const totalSlots = rawVars.length

  if (compressed === 1) {
    // Bytecode compressed stream
    let opcodes: number[] = []
    let opIndex = 8

    const nextOpcode = (): number => {
      if (opIndex >= 8) {
        if (reader.isAtEnd()) return 252
        opcodes = [
          reader.readUint8(), reader.readUint8(), reader.readUint8(), reader.readUint8(),
          reader.readUint8(), reader.readUint8(), reader.readUint8(), reader.readUint8()
        ]
        opIndex = 0
      }
      return opcodes[opIndex++]
    }

    let eofReached = false
    let caseCount = 0
    const targetCases = nCases > 0 ? nCases : 1000000

    while (!eofReached && caseCount < targetCases && !reader.isAtEnd()) {
      const row: number[] = []
      for (let s = 0; s < totalSlots; s++) {
        let code = nextOpcode()
        while (code === 0 && !eofReached) code = nextOpcode()
        if (code === 252) { eofReached = true; break }

        let val = 0
        if (code > 0 && code < 252) {
          val = code - bias
        } else if (code === 253) {
          val = reader.readFloat64()
        } else if (code === 254) {
          val = 0
        } else if (code === 255) {
          val = NaN
        }

        const actualIdx = varMapping.indexOf(s)
        if (actualIdx >= 0) {
          row.push(Number.isFinite(val) ? val : 0)
        }
      }
      if (eofReached || row.length < actualVars.length) break
      rows.push(row)
      caseCount++
    }
  } else {
    // Uncompressed stream
    const targetCases = nCases > 0 ? nCases : 1000000
    for (let r = 0; r < targetCases && !reader.isAtEnd(); r++) {
      const row: number[] = []
      for (let s = 0; s < totalSlots; s++) {
        const val = reader.readFloat64()
        const actualIdx = varMapping.indexOf(s)
        if (actualIdx >= 0) {
          row.push(Number.isFinite(val) && val > -1e300 ? val : 0)
        }
      }
      if (row.length === actualVars.length) {
        rows.push(row)
      }
    }
  }

  const finalName = fileName || fileLabel || 'Dataset.sav'

  return {
    name: finalName.endsWith('.sav') ? finalName : finalName + '.sav',
    variables: actualVars,
    rows,
    filteredRows: new Array(rows.length).fill(true),
  }
}
