import { useState, useRef, useEffect } from 'react'
import type { Dataset, OutputNode } from '../../lib/types'
import { Icon } from '../Icons'
import {
  runRegression,
  runClassicalAssumptions,
  runValidity,
  runReliability,
  runIndependentT,
  runOneWayAnova,
  runCorrelations,
  runDescriptives,
  DEFAULT_DESC_OPTIONS,
} from '../../lib/analyses'
import { executeComputeVariable, cloneDataset } from '../../lib/data'

export interface AgentMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  text: string
  timestamp: string
  actions?: { label: string; onClick: () => void }[]
}

interface AIAgentPanelProps {
  dataset: Dataset
  setDataset: React.Dispatch<React.SetStateAction<Dataset>>
  runResult: (result: any) => void
  outputs: OutputNode[]
  setView: (view: 'data' | 'variable' | 'output' | 'syntax') => void
  onExportWord: () => void
  onClose: () => void
}

export function AIAgentPanel({
  dataset,
  setDataset,
  runResult,
  outputs,
  setView,
  onExportWord,
  onClose,
}: AIAgentPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'm-welcome',
      role: 'agent',
      text: `Halo! Saya **Asisten AI SPSS Co-Pilot**. Saya siap membantu menganalisis data, menjalankan uji hipotesis skripsi, mengecek asumsi klasik, hingga menyusun interpretasi Bab IV secara otomatis.\n\nKlik tombol aksi cepat di bawah atau ketik perintah Anda dalam bahasa sehari-hari.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (role: 'user' | 'agent' | 'system', text: string, actions?: { label: string; onClick: () => void }[]) => {
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        role,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions,
      },
    ])
  }

  // Helper to extract numeric columns excluding ID
  const getNumericVars = () => {
    return dataset.variables
      .filter((v) => v.type === 'numeric' && v.name !== 'ID')
      .map((v) => v.name)
  }

  // Quick Action 1: Full Thesis Analysis Pack
  const handleFullThesisAnalysis = () => {
    setIsBusy(true)
    addMessage('user', 'Jalankan Analisis Skripsi Lengkap (Otomatis)')

    setTimeout(() => {
      try {
        const numVars = getNumericVars()
        const scaleVars = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi', 'Y_Keputusan'].filter((n) =>
          dataset.variables.some((v) => v.name === n)
        )
        const items = scaleVars.length >= 3 ? scaleVars : numVars.slice(0, 4)
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : items[items.length - 1]
        const indeps = items.filter((n) => n !== dep)

        // 1. Deskriptif
        const resDesc = runDescriptives(dataset, items, DEFAULT_DESC_OPTIONS)
        runResult(resDesc)

        // 2. Validitas & Reliabilitas
        if (indeps.length >= 2) {
          const resVal = runValidity(dataset, indeps, 0.05)
          runResult(resVal)
          const resRel = runReliability(dataset, indeps, { scale: true, itemDeleted: true, itemStats: true })
          runResult(resRel)
        }

        // 3. Uji Asumsi Klasik
        const resAsump = runClassicalAssumptions(dataset, dep, indeps)
        runResult(resAsump)

        // 4. Regresi Linier Berganda
        const resReg = runRegression(dataset, dep, indeps, { descriptives: true, collinearity: true, durbinWatson: true })
        runResult(resReg)

        setView('output')
        addMessage(
          'agent',
          `✅ **Analisis Skripsi Lengkap Berhasil Selesai!**\n\n` +
            `Berikut rangkaian pengujian yang baru saja dieksekusi secara otomatis:\n` +
            `1. **Statistik Deskriptif** (${items.join(', ')})\n` +
            `2. **Uji Validitas Butir** (Pearson r-hitung vs r-tabel)\n` +
            `3. **Uji Reliabilitas** (Cronbach's Alpha)\n` +
            `4. **Uji 4 Asumsi Klasik** (Normalitas K-S, Multikolinearitas VIF, Heteroskedastisitas Glejser, Autokorelasi D-W)\n` +
            `5. **Regresi Linier Berganda & Uji Hipotesis** (Uji F Simultan & Uji t Parsial)\n\n` +
            `Hasil lengkap beserta **Pedoman Narasi Bab IV Skripsi** sudah dibuka di tab **Output Viewer**.`,
          [
            { label: 'Lihat Output Viewer', onClick: () => setView('output') },
            { label: 'Salin / Ekspor ke Word', onClick: onExportWord },
          ]
        )
      } catch (err: any) {
        addMessage('agent', `❌ Gagal menjalankan analisis otomatis: ${err.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 400)
  }

  // Quick Action 2: Validity & Reliability
  const handleValidityReliability = () => {
    setIsBusy(true)
    addMessage('user', 'Uji Validitas dan Reliabilitas Kuesioner')
    setTimeout(() => {
      try {
        const numVars = getNumericVars()
        const scaleVars = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi', 'Y_Keputusan'].filter((n) =>
          dataset.variables.some((v) => v.name === n)
        )
        const items = scaleVars.length >= 2 ? scaleVars : numVars.slice(0, 4)
        if (items.length < 2) {
          throw new Error('Dataset membutuhkan minimal 2 variabel berskala untuk diuji.')
        }

        const resVal = runValidity(dataset, items, 0.05)
        runResult(resVal)
        const resRel = runReliability(dataset, items, { scale: true, itemDeleted: true, itemStats: true })
        runResult(resRel)
        setView('output')

        addMessage(
          'agent',
          `✅ **Uji Validitas & Reliabilitas Berhasil Dihitung!**\n\n` +
            `- **Variabel diuji:** ${items.join(', ')}\n` +
            `- **Kriteria Validitas:** Butir dinyatakan valid jika r-hitung > r-tabel (df = N-2) dan Sig. < 0,05.\n` +
            `- **Kriteria Reliabilitas:** Instrumen andal/reliabel jika Cronbach's Alpha ≥ 0,70.\n\n` +
            `Tabel hasil r-hitung, corrected item-total correlation, dan pedoman Bab IV telah dimuat di Output Viewer.`,
          [{ label: 'Buka Output', onClick: () => setView('output') }]
        )
      } catch (e: any) {
        addMessage('agent', `❌ ${e.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 300)
  }

  // Quick Action 3: Multiple Regression
  const handleRegression = () => {
    setIsBusy(true)
    addMessage('user', 'Uji Regresi Linier Berganda & Uji Hipotesis')
    setTimeout(() => {
      try {
        const numVars = getNumericVars()
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : numVars[numVars.length - 1]
        const indeps = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n))
        const finalIndeps = indeps.length > 0 ? indeps : numVars.filter((n) => n !== dep)

        const res = runRegression(dataset, dep, finalIndeps, {
          descriptives: true,
          collinearity: true,
          durbinWatson: true,
        })
        runResult(res)
        setView('output')

        addMessage(
          'agent',
          `✅ **Analisis Regresi Linier Berganda Berhasil!**\n\n` +
            `- **Variabel Dependen (Y):** ${dep}\n` +
            `- **Variabel Independen (X):** ${finalIndeps.join(', ')}\n\n` +
            `Output memuat Model Summary (R, R Square), ANOVA (Uji F simultan), Coefficients (Uji t parsial & persamaan regresi), serta Uji Multikolinearitas (Tolerance & VIF).`,
          [{ label: 'Lihat Output Viewer', onClick: () => setView('output') }]
        )
      } catch (e: any) {
        addMessage('agent', `❌ ${e.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 300)
  }

  // Quick Action 4: Classical Assumptions
  const handleClassicalAssumptions = () => {
    setIsBusy(true)
    addMessage('user', 'Uji Asumsi Klasik 4-in-1 Lengkap')
    setTimeout(() => {
      try {
        const numVars = getNumericVars()
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : numVars[numVars.length - 1]
        const indeps = ['X1_Harga', 'X2_Kualitas', 'X3_Promosi'].filter((n) => dataset.variables.some((v) => v.name === n))
        const finalIndeps = indeps.length > 0 ? indeps : numVars.filter((n) => n !== dep)

        const res = runClassicalAssumptions(dataset, dep, finalIndeps)
        runResult(res)
        setView('output')

        addMessage(
          'agent',
          `✅ **Uji Asumsi Klasik Selesai!**\n\n` +
            `1. **Normalitas:** One-Sample Kolmogorov-Smirnov pada residual model.\n` +
            `2. **Multikolinearitas:** Uji Tolerance (> 0,10) dan VIF (< 10).\n` +
            `3. **Heteroskedastisitas:** Uji Glejser (Regresi residual absolut terhadap prediktor).\n` +
            `4. **Autokorelasi:** Statistik Durbin-Watson (rentang 1,5 - 2,5).\n\n` +
            `Diagram Normal P-P Plot dan tabel rangkuman kelayakan model skripsi siap disalin ke Word.`,
          [{ label: 'Lihat Hasil Asumsi', onClick: () => setView('output') }]
        )
      } catch (e: any) {
        addMessage('agent', `❌ ${e.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 300)
  }

  // Quick Action 5: T-Test
  const handleTTest = () => {
    setIsBusy(true)
    addMessage('user', 'Uji Beda Dua Kelompok (Independent-Samples T-Test)')
    setTimeout(() => {
      try {
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : getNumericVars()[0]
        const grp = dataset.variables.some((v) => v.name === 'JK') ? 'JK' : dataset.variables[1]?.name
        const res = runIndependentT(dataset, [dep], grp, 1, 2)
        runResult(res)
        setView('output')

        addMessage(
          'agent',
          `✅ **Independent-Samples T Test Berhasil!**\n\n` +
            `- **Variabel Uji:** ${dep}\n` +
            `- **Grouping Variable:** ${grp} (Kelompok 1 vs 2)\n\n` +
            `Output menyajikan Group Statistics dan Independent Samples Test (Levene's Test for Equality of Variances serta nilai t hitung dua sisi).`,
          [{ label: 'Buka Output', onClick: () => setView('output') }]
        )
      } catch (e: any) {
        addMessage('agent', `❌ ${e.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 300)
  }

  // Quick Action 6: ANOVA
  const handleAnova = () => {
    setIsBusy(true)
    addMessage('user', 'Uji Perbedaan Rata-rata Banyak Kelompok (One-Way ANOVA)')
    setTimeout(() => {
      try {
        const dep = dataset.variables.some((v) => v.name === 'Y_Keputusan') ? 'Y_Keputusan' : getNumericVars()[0]
        const factor = dataset.variables.some((v) => v.name === 'JK') ? 'JK' : dataset.variables[1]?.name
        const res = runOneWayAnova(dataset, dep, factor)
        runResult(res)
        setView('output')

        addMessage(
          'agent',
          `✅ **One-Way ANOVA Berhasil Dihitung!**\n\n` +
            `- **Dependen:** ${dep}\n` +
            `- **Faktor Kelompok:** ${factor}\n\n` +
            `Tabel Descriptives dan ANOVA (Sum of Squares, df, Mean Square, F hitung, dan Sig.) telah ditampilkan.`,
          [{ label: 'Buka Output', onClick: () => setView('output') }]
        )
      } catch (e: any) {
        addMessage('agent', `❌ ${e.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 300)
  }

  // Quick Action 7: Compute Variable
  const handleComputeTotal = () => {
    setIsBusy(true)
    addMessage('user', 'Hitung Variabel Skor Total (Compute Variable)')
    setTimeout(() => {
      try {
        const numVars = getNumericVars()
        const xVars = numVars.filter((v) => v.startsWith('X') || v.startsWith('Y'))
        const targetList = xVars.length >= 2 ? xVars : numVars.slice(0, 3)
        const expr = targetList.join(' + ')
        const res = executeComputeVariable(dataset, 'TOTAL_SKOR', 'Total Skor Variabel Penelitian', expr)
        if (res.success) {
          setDataset(res.dataset)
          setView('data')
          addMessage(
            'agent',
            `✅ **Variabel TOTAL_SKOR Berhasil Dihitung!**\n\n` +
              `- **Rumus:** \`TOTAL_SKOR = ${expr}\`\n` +
              `- Kolom baru telah ditambahkan ke **Data View** dan dapat langsung digunakan untuk analisis regresi atau uji beda.`,
            [{ label: 'Buka Data View', onClick: () => setView('data') }]
          )
        } else {
          throw new Error(res.message || 'Gagal mengevaluasi formula.')
        }
      } catch (e: any) {
        addMessage('agent', `❌ ${e.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 300)
  }

  // NLP Natural Language Command Dispatcher
  const handleSendCommand = (textToSend?: string) => {
    const raw = (textToSend || input).trim()
    if (!raw) return
    setInput('')
    addMessage('user', raw)
    setIsBusy(true)

    setTimeout(() => {
      try {
        const lower = raw.toLowerCase()
        const numVars = getNumericVars()

        // Match Intent
        if (lower.includes('skripsi') || lower.includes('lengkap') || lower.includes('semua uji')) {
          handleFullThesisAnalysis()
          return
        }

        if (lower.includes('validitas') || lower.includes('reliabilitas') || lower.includes('alpha') || lower.includes('kuesioner')) {
          handleValidityReliability()
          return
        }

        if (lower.includes('asumsi') || lower.includes('normalitas') || lower.includes('hetero') || lower.includes('kolin') || lower.includes('durbin')) {
          handleClassicalAssumptions()
          return
        }

        if (lower.includes('regresi') || lower.includes('pengaruh') || lower.includes('prediktor') || lower.includes('linear')) {
          handleRegression()
          return
        }

        if (lower.includes('t test') || lower.includes('t-test') || lower.includes('uji beda') || lower.includes('kelamin') || lower.includes('gender')) {
          handleTTest()
          return
        }

        if (lower.includes('anova') || lower.includes('varians') || lower.includes('f test')) {
          handleAnova()
          return
        }

        if (lower.includes('korelasi') || lower.includes('hubungan') || lower.includes('pearson')) {
          const res = runCorrelations(dataset, numVars.slice(0, 4), { method: 'pearson', tails: 2, flag: true })
          runResult(res)
          setView('output')
          addMessage('agent', `✅ **Uji Korelasi Bivariate Pearson Berhasil!**\nOutput telah ditambahkan ke Output Viewer.`, [{ label: 'Buka Output', onClick: () => setView('output') }])
          return
        }

        if (lower.includes('deskriptif') || lower.includes('rata-rata') || lower.includes('mean') || lower.includes('sebaran')) {
          const res = runDescriptives(dataset, numVars, DEFAULT_DESC_OPTIONS)
          runResult(res)
          setView('output')
          addMessage('agent', `✅ **Statistik Deskriptif Berhasil Dihitung!**\nOutput telah ditambahkan ke Output Viewer.`, [{ label: 'Buka Output', onClick: () => setView('output') }])
          return
        }

        if (lower.includes('compute') || lower.includes('hitung') || lower.includes('total') || lower.includes('jumlah')) {
          handleComputeTotal()
          return
        }

        if (lower.includes('word') || lower.includes('ekspor') || lower.includes('salin') || lower.includes('bab iv') || lower.includes('laporan')) {
          onExportWord()
          addMessage('agent', `✅ **File Laporan Skripsi Word (.doc / HTML) Berhasil Dibuat dan Diunduh!**\nTabel dan pembahasan Bab IV siap langsung disalin ke skripsi Anda.`)
          return
        }

        // Generic fallback advice with dataset inspection
        addMessage(
          'agent',
          `Saya memahami instruksi Anda: *"${raw}"*.\n\n` +
            `Dataset saat ini memiliki **${dataset.rows.length} responden** dan **${dataset.variables.length} variabel** (${dataset.variables.map((v) => v.name).join(', ')}).\n\n` +
            `Untuk mengeksekusi analisis statistik secara spesifik, Anda dapat memilih salah satu opsi berikut:`,
          [
            { label: 'Analisis Skripsi Lengkap', onClick: handleFullThesisAnalysis },
            { label: 'Uji Validitas & Reliabilitas', onClick: handleValidityReliability },
            { label: 'Regresi Berganda', onClick: handleRegression },
            { label: 'Uji Asumsi Klasik', onClick: handleClassicalAssumptions },
            { label: 'Uji Beda T-Test', onClick: handleTTest },
          ]
        )
      } catch (err: any) {
        addMessage('agent', `❌ Terjadi kesalahan saat memproses instruksi: ${err.message}`)
      } finally {
        setIsBusy(false)
      }
    }, 400)
  }

  return (
    <aside className="spss-ai-agent-panel" aria-label="Asisten AI SPSS Statistics Co-Pilot">
      {/* Header */}
      <div className="spss-ai-header">
        <div className="spss-ai-title">
          <div className="spss-ai-badge">
            <Icon name="spark" size={15} />
            <span>AI Co-Pilot</span>
          </div>
          <span className="spss-mcp-status" title="MCP (Model Context Protocol) terhubung dan siap menerima instruksi">
            <span className="status-dot-active" /> MCP Ready
          </span>
        </div>
        <button className="spss-ai-close-btn" onClick={onClose} title="Tutup Asisten AI" aria-label="Tutup Panel AI">
          ✕
        </button>
      </div>

      {/* Dataset Context Bar */}
      <div className="spss-ai-context">
        <span>Dataset: <strong>{dataset.name}</strong> ({dataset.rows.length} Kasus &bull; {dataset.variables.length} Variabel)</span>
        <button
          className="spss-ai-clear-btn"
          onClick={() => {
            setMessages([
              {
                id: 'm-reset',
                role: 'agent',
                text: 'Riwayat percakapan telah dibersihkan. Silakan beri perintah analisis baru.',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }}
          title="Bersihkan riwayat percakapan"
        >
          Bersihkan
        </button>
      </div>

      {/* Quick Action Chips */}
      <div className="spss-ai-chips-wrap">
        <div className="spss-ai-chips-label">Aksi Cepat Skripsi (1-Klik):</div>
        <div className="spss-ai-chips">
          <button className="spss-chip chip-primary" onClick={handleFullThesisAnalysis} disabled={isBusy}>
            ⚡ Analisis Skripsi Lengkap
          </button>
          <button className="spss-chip" onClick={handleValidityReliability} disabled={isBusy}>
            📊 Validitas &amp; Reliabilitas
          </button>
          <button className="spss-chip" onClick={handleRegression} disabled={isBusy}>
            📈 Regresi Linier Berganda
          </button>
          <button className="spss-chip" onClick={handleClassicalAssumptions} disabled={isBusy}>
            🔬 4 Uji Asumsi Klasik
          </button>
          <button className="spss-chip" onClick={handleTTest} disabled={isBusy}>
            👥 Uji Beda t-Test
          </button>
          <button className="spss-chip" onClick={handleAnova} disabled={isBusy}>
            🏛️ One-Way ANOVA
          </button>
          <button className="spss-chip" onClick={handleComputeTotal} disabled={isBusy}>
            ➕ Hitung Skor Total
          </button>
          <button className="spss-chip" onClick={onExportWord} disabled={isBusy}>
            📝 Ekspor Word Bab IV
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="spss-ai-messages">
        {messages.map((m) => (
          <div key={m.id} className={`spss-msg-row ${m.role}`}>
            <div className="spss-msg-bubble">
              <div className="spss-msg-meta">
                <span className="spss-msg-author">{m.role === 'agent' ? 'SPSS Agent Co-Pilot' : 'Anda'}</span>
                <span className="spss-msg-time">{m.timestamp}</span>
              </div>
              <div className="spss-msg-body">
                {m.text.split('\n\n').map((paragraph, pi) => (
                  <p key={pi} style={{ margin: '0 0 8px 0', lineHeight: 1.5 }}>
                    {paragraph.split('\n').map((line, li) => (
                      <span key={li}>
                        {renderFormattedText(line)}
                        {li < paragraph.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
              {m.actions && m.actions.length > 0 && (
                <div className="spss-msg-actions">
                  {m.actions.map((act, ai) => (
                    <button key={ai} className="spss-msg-action-btn" onClick={act.onClick}>
                      {act.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isBusy && (
          <div className="spss-msg-row agent">
            <div className="spss-msg-bubble busy">
              <span className="spss-typing-indicator">
                <span /><span /><span />
              </span>
              <span style={{ fontSize: 12, color: '#525252' }}>Agent sedang menganalisis dataset...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="spss-ai-input-bar">
        <textarea
          className="spss-ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendCommand()
            }
          }}
          placeholder="Ketik perintah statistik, misal: 'Uji regresi berganda X1-X3 ke Y'..."
          rows={2}
          disabled={isBusy}
        />
        <button
          className="spss-ai-send-btn"
          onClick={() => handleSendCommand()}
          disabled={!input.trim() || isBusy}
          title="Kirim instruksi ke Agent AI"
        >
          <Icon name="spark" size={15} /> Kirim
        </button>
      </div>

      <div className="spss-ai-footer-note">
        💡 <strong>Programmatic Agent API Active:</strong> <code>window.__SPSS_AGENT_API__</code> siap diakses oleh MCP Server, Puppeteer, atau Agent Antigravity langsung di halaman ini.
      </div>
    </aside>
  )
}

// Simple text formatter for bold and code
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: '#e0e0e0',
            padding: '1px 5px',
            borderRadius: 3,
            fontSize: '11px',
            fontFamily: 'Consolas, monospace',
          }}
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}
