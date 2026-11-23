# IBM SPSS Statistics MCP Server & AI Agent Integration

Server MCP (Model Context Protocol) resmi untuk **IBM SPSS Statistics Recreation**. Memungkinkan AI Agent (seperti Antigravity, Claude, Cursor, dll.) untuk mengeksekusi olah data statistik, regresi linier, uji asumsi klasik, uji hipotesis, dan ekspor laporan skripsi (Bab IV) secara otomatis dan presisi.

---

## 🚀 Fitur Utama MCP Server

1. **`spss_get_dataset_info`**: Memeriksa daftar variabel, tipe data, jumlah responden ($N$), dan struktur data aktif.
2. **`spss_run_regression`**: Regresi Linier Berganda lengkap dengan ANOVA (Uji F simultan), Coefficients (Uji t parsial), R Square, Multikolinearitas (Tolerance & VIF), dan Durbin-Watson.
3. **`spss_run_validity_reliability`**: Uji Validitas Butir Instrumen Kuesioner (Pearson $r$-hitung vs $r$-tabel) dan Reliabilitas Cronbach's Alpha.
4. **`spss_run_classical_assumptions`**: 4 Uji Asumsi Klasik Skripsi:
   - Normalitas (Kolmogorov-Smirnov)
   - Multikolinearitas (VIF & Tolerance)
   - Heteroskedastisitas (Uji Glejser)
   - Autokorelasi (Durbin-Watson)
5. **`spss_run_t_test`**: Uji Beda Dua Rata-rata (Independent-Samples T-Test dengan Uji Homogenitas Levene).
6. **`spss_run_anova`**: Uji One-Way ANOVA untuk membandingkan rata-rata antarkelompok.
7. **`spss_compute_variable`**: Menghitung variabel komposit / skor total dari beberapa butir pertanyaan.
8. **`spss_export_word_report`**: Menghasilkan dokumen laporan format Microsoft Word (.doc / HTML) dengan tabel standar APA dan narasi pembahasan Bab IV.

---

## 🛠️ Konfigurasi di Claude Desktop / Antigravity / Cursor

Tambahkan konfigurasi berikut ke file konfigurasi MCP Anda (misalnya `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "spss-statistics": {
      "command": "node",
      "args": [
        "d:\\spss\\mcp-server\\index.mjs"
      ]
    }
  }
}
```

---

## 🌐 Integrasi AI Agent Langsung di Halaman Web (In-Page)

Selain melalui MCP server stdio di atas, aplikasi web SPSS juga menyediakan dua cara langsung di browser:

### 1. Panel AI Co-Pilot (Tampilan Antarmuka)
- Klik tombol ungu **AI Agent** di Toolbar atau menu **AI Agent > Buka AI Co-Pilot Panel** (Shortcut: `Ctrl+Shift+A`).
- Anda dapat memilih tombol 1-klik:
  - `⚡ Analisis Skripsi Lengkap`
  - `📊 Validitas & Reliabilitas`
  - `📈 Regresi Linier Berganda`
  - `🔬 4 Uji Asumsi Klasik`
  - `👥 Uji Beda t-Test`
  - `🏛️ One-Way ANOVA`
  - `➕ Hitung Skor Total`
  - `📝 Ekspor Word Bab IV`
- Atau mengetik perintah bebas dalam Bahasa Indonesia, contoh:
  > *"Tolong uji regresi linier berganda X1, X2, dan X3 terhadap Y dan jelaskan apakah hipotesis diterima."*

### 2. Programmatic Browser API (`window.__SPSS_AGENT_API__`)
AI Agent eksternal (Playwright, Puppeteer, Chrome DevTools Protocol) dapat berinteraksi langsung dengan aplikasi yang sedang terbuka di:
`https://chan-aji.github.io/spss-statistics/#/workspace`

```javascript
// Membaca dataset
const dataset = window.__SPSS_AGENT_API__.getDataset();

// Menjalankan analisis regresi
window.__SPSS_AGENT_API__.runAnalysis('regression');

// Eksekusi instruksi bahasa alami
window.__SPSS_AGENT_API__.executeInstruction('Uji validitas dan reliabilitas instrumen');

// Ekspor ke format Word
window.__SPSS_AGENT_API__.exportWord();
```
