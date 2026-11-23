import { useState } from 'react'
import { BrandMark, Icon } from './Icons'

const navItems = [
  { label: 'Ringkasan', href: '#ringkasan' },
  { label: 'Kegunaan', href: '#kegunaan' },
  { label: 'Produk', href: '#produk' },
  { label: 'Cara kerja', href: '#cara-kerja' },
  { label: 'Perbandingan', href: '#perbandingan' },
]

const useCases = [
  {
    icon: 'survey',
    title: 'Mengolah data survei',
    example: 'Menghitung persentase kepuasan pelanggan',
    tag: 'Frequencies',
  },
  {
    icon: 'chart',
    title: 'Analisis deskriptif',
    example: 'Menghitung rata-rata usia atau pendapatan responden',
    tag: 'Descriptives',
  },
  {
    icon: 'check',
    title: 'Uji validitas dan reliabilitas',
    example: 'Memeriksa kualitas kuesioner penelitian',
    tag: 'Scale',
  },
  {
    icon: 'flask',
    title: 'Uji hipotesis',
    example: 'Menguji apakah dugaan penelitian terbukti secara statistik',
    tag: 'T-Test',
  },
  {
    icon: 'scatter',
    title: 'Analisis korelasi',
    example: 'Melihat hubungan antara harga dan minat beli',
    tag: 'Correlate',
  },
  {
    icon: 'trend',
    title: 'Analisis regresi',
    example: 'Mengetahui pengaruh promosi terhadap keputusan pembelian',
    tag: 'Regression',
  },
  {
    icon: 'spark',
    title: 'Prediksi',
    example: 'Memperkirakan tren berdasarkan data historis',
    tag: 'Modeler',
  },
]

const questions = [
  {
    q: 'Apakah harga memengaruhi keputusan pembelian?',
    short: 'Harga',
    stat: 'β = 0,345',
    p: 'p < 0,001',
    answer: 'Ya. Persepsi harga yang lebih baik berhubungan positif dengan keputusan pembelian.',
    value: 34,
  },
  {
    q: 'Apakah kualitas produk berpengaruh terhadap minat konsumen?',
    short: 'Kualitas',
    stat: 'β = 0,431',
    p: 'p < 0,001',
    answer: 'Ya, dan ini adalah pengaruh terkuat di antara ketiga variabel.',
    value: 100,
  },
  {
    q: 'Apakah promosi memiliki pengaruh signifikan?',
    short: 'Promosi',
    stat: 'β = 0,281',
    p: 'p < 0,001',
    answer: 'Ya. Promosi menambah penjelasan keputusan pembelian secara signifikan.',
    value: 65,
  },
  {
    q: 'Faktor mana yang paling kuat memengaruhi?',
    short: 'Terkuat',
    stat: 'Kualitas',
    p: 'β = 0,431',
    answer: 'Kualitas produk. Prioritaskan perbaikan rasa dan konsistensi sebelum menaikkan anggaran promosi.',
    value: 100,
  },
]

const products = [
  {
    name: 'IBM SPSS Statistics',
    badge: 'Paling umum untuk mahasiswa',
    desc: 'Mengolah data, melakukan uji statistik, menguji hipotesis, dan membuat analisis regresi.',
    art: 'stats',
    features: ['Data Editor & Variable View', 'Uji validitas, reliabilitas, korelasi', 'Regresi & uji hipotesis'],
  },
  {
    name: 'IBM SPSS Modeler',
    badge: 'Prediktif & machine learning',
    desc: 'Analisis prediktif, machine learning, dan alur pengolahan data yang dibangun secara visual.',
    art: 'modeler',
    features: ['Alur kerja visual', 'Model prediktif', 'Machine learning'],
  },
  {
    name: 'IBM SPSS Amos',
    badge: 'SEM & penelitian',
    desc: 'Structural Equation Modeling (SEM) untuk menganalisis hubungan kompleks antarvariabel.',
    art: 'amos',
    features: ['Path analysis', 'Model laten', 'Uji kecocokan model'],
  },
]

const steps = [
  { n: '01', title: 'Mengumpulkan data', desc: 'Google Forms, kuesioner, Excel, atau database.', icon: 'survey' },
  { n: '02', title: 'Memasukkan data', desc: 'Menyusun variabel dan data responden di Data Editor.', icon: 'table' },
  { n: '03', title: 'Menganalisis', desc: 'Uji validitas, reliabilitas, korelasi, regresi, dan lainnya.', icon: 'flask' },
  { n: '04', title: 'Mendapatkan hasil', desc: 'Tabel, angka statistik, grafik, dan hasil pengujian.', icon: 'chart' },
  { n: '05', title: 'Menginterpretasikan', desc: 'Menarik kesimpulan untuk penelitian atau keputusan bisnis.', icon: 'insight' },
]

const comparison = [
  { name: 'Microsoft Excel', focus: 'Pengolahan data, tabel, dan perhitungan', fit: 'Rekap harian & laporan sederhana' },
  { name: 'IBM SPSS', focus: 'Analisis statistik dan pengujian hipotesis', fit: 'Penelitian, skripsi, riset pasar', highlight: true },
  { name: 'Python', focus: 'Analisis data, otomatisasi, dan machine learning', fit: 'Pipeline data berskala besar' },
  { name: 'Power BI', focus: 'Visualisasi data dan dashboard bisnis', fit: 'Monitoring kinerja & presentasi' },
]

function goWorkspace() {
  window.location.hash = '#/workspace'
}

function HeroPreview() {
  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-orbit hero-orbit-a" />
      <div className="hero-orbit hero-orbit-b" />
      <div className="mock-window">
        <div className="mock-titlebar">
          <span className="mock-app-icon"><i /><i /><i /></span>
          <span>Output1 — SPSS Statistics</span>
          <span className="mock-window-buttons"><b /><b /><b /></span>
        </div>
        <div className="mock-menu">File&nbsp;&nbsp;Edit&nbsp;&nbsp;View&nbsp;&nbsp;Data&nbsp;&nbsp;Transform&nbsp;&nbsp;Analyze&nbsp;&nbsp;Graphs</div>
        <div className="mock-body">
          <div className="mock-tree">
            <p className="mock-tree-title">Output</p>
            <p className="mock-tree-item active">Regression</p>
            <p className="mock-tree-item">Correlations</p>
            <p className="mock-tree-item">Reliability</p>
            <p className="mock-tree-item">Descriptives</p>
            <div className="mock-tree-spacer" />
            <p className="mock-tree-note">N = 100<br />responden</p>
          </div>
          <div className="mock-content">
            <p className="mock-kicker">Model Summary</p>
            <div className="mock-table">
              <div className="mock-tr mock-th">
                <span>Model</span><span>R</span><span>R Square</span><span>Sig.</span>
              </div>
              <div className="mock-tr">
                <span>1</span><span>0,860</span><span className="mock-em">0,740</span><span>&lt; 0,001</span>
              </div>
              <div className="mock-tr">
                <span>a</span><span>Predictors</span><span>X1, X2, X3</span><span>Y</span>
              </div>
            </div>
            <p className="mock-kicker mock-kicker-2">Coefficients</p>
            <div className="mock-bars">
              {[
                { label: 'Harga', w: 80, v: '0,345' },
                { label: 'Kualitas', w: 100, v: '0,431' },
                { label: 'Promosi', w: 65, v: '0,281' },
              ].map((b) => (
                <div className="mock-bar-row" key={b.label}>
                  <span>{b.label}</span>
                  <span className="mock-bar"><i style={{ width: b.w + '%' }} /></span>
                  <b>{b.v}</b>
                </div>
              ))}
            </div>
            <div className="mock-chart">
              <div className="mock-axis"><i /><i /><i /><i /></div>
              <div className="mock-scatter">
                {[[12, 68], [22, 58], [31, 62], [41, 48], [50, 50], [58, 38], [68, 36], [76, 24], [84, 28], [90, 14]].map(([x, y], i) => (
                  <i key={i} style={{ left: x + '%', top: y + '%', animationDelay: (i * 60) + 'ms' }} />
                ))}
                <span className="mock-trend" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="float-card float-r2">
        <span className="float-label">R Square</span>
        <strong>0,740</strong>
        <span className="float-sub">74% variasi dijelaskan</span>
      </div>
      <div className="float-card float-sig">
        <span className="sig-dot" />
        <div><strong>Sig. &lt; 0,001</strong><span>Model signifikan</span></div>
      </div>
    </div>
  )
}

function ProductArt({ kind }: { kind: string }) {
  if (kind === 'stats') {
    return (
      <svg viewBox="0 0 260 120" className="product-art" role="img" aria-label="Ilustrasi tabel dan grafik statistik">
        <rect x="8" y="12" width="150" height="96" rx="2" fill="#ffffff" stroke="#c6c6c6" />
        <rect x="8" y="12" width="150" height="18" fill="#e8e8e8" />
        {[0, 1, 2, 3].map((r) => <line key={r} x1="8" y1={40 + r * 17} x2="158" y2={40 + r * 17} stroke="#e0e0e0" />)}
        {[0, 1, 2].map((c) => <line key={c} x1={44 + c * 38} y1="12" x2={44 + c * 38} y2="108" stroke="#e0e0e0" />)}
        <rect x="16" y="18" width="22" height="5" fill="#8d8d8d" />
        <rect x="52" y="18" width="18" height="5" fill="#8d8d8d" />
        <rect x="90" y="18" width="20" height="5" fill="#8d8d8d" />
        <rect x="128" y="18" width="18" height="5" fill="#8d8d8d" />
        <rect x="172" y="52" width="12" height="56" fill="#a6c8ff" />
        <rect x="192" y="36" width="12" height="72" fill="#78a9ff" />
        <rect x="212" y="20" width="12" height="88" fill="#0f62fe" />
        <path d="M172 48 L198 38 L218 22 L238 16" fill="none" stroke="#161616" strokeWidth="2" />
        <circle cx="238" cy="16" r="3" fill="#161616" />
      </svg>
    )
  }
  if (kind === 'modeler') {
    return (
      <svg viewBox="0 0 260 120" className="product-art" role="img" aria-label="Ilustrasi alur kerja prediktif">
        <path d="M48 60 H92 M128 60 H172 M188 44 L218 32 M188 76 L218 88" stroke="#8d8d8d" strokeDasharray="4 4" />
        <rect x="18" y="44" width="34" height="32" rx="2" fill="#e8e8e8" stroke="#8d8d8d" />
        <circle cx="110" cy="60" r="22" fill="#edf5ff" stroke="#0f62fe" />
        <circle cx="110" cy="60" r="8" fill="#0f62fe" />
        <rect x="154" y="42" width="40" height="36" rx="2" fill="#ffffff" stroke="#8d8d8d" />
        <path d="M162 52 h24 M162 60 h24 M162 68 h16" stroke="#a6c8ff" strokeWidth="3" />
        <circle cx="230" cy="28" r="10" fill="#0f62fe" />
        <circle cx="230" cy="92" r="10" fill="#a6c8ff" />
        <path d="M40 18 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#78a9ff" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 260 120" className="product-art" role="img" aria-label="Ilustrasi model persamaan struktural">
      <path d="M70 44 L112 30 M112 30 L158 46 M70 44 L96 82 M158 46 L186 80 M96 82 L186 80" stroke="#8d8d8d" />
      <path d="M146 30 l6 -2 -2 6" fill="none" stroke="#8d8d8d" />
      <ellipse cx="52" cy="44" rx="24" ry="14" fill="#edf5ff" stroke="#0f62fe" />
      <ellipse cx="112" cy="28" rx="22" ry="13" fill="#ffffff" stroke="#8d8d8d" />
      <ellipse cx="168" cy="46" rx="24" ry="14" fill="#edf5ff" stroke="#0f62fe" />
      <ellipse cx="92" cy="86" rx="22" ry="13" fill="#ffffff" stroke="#8d8d8d" />
      <ellipse cx="198" cy="82" rx="24" ry="14" fill="#0f62fe" />
      <text x="52" y="48" textAnchor="middle" fontSize="8" fill="#0f62fe">X1</text>
      <text x="112" y="32" textAnchor="middle" fontSize="8" fill="#525252">X2</text>
      <text x="168" y="50" textAnchor="middle" fontSize="8" fill="#0f62fe">X3</text>
      <text x="92" y="90" textAnchor="middle" fontSize="8" fill="#525252">e1</text>
      <text x="198" y="86" textAnchor="middle" fontSize="8" fill="#ffffff">Y</text>
    </svg>
  )
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [question, setQuestion] = useState(1)

  const scrollTo = (href: string) => {
    setMenuOpen(false)
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const active = questions[question]

  return (
    <div className="site">
      <a className="skip-link" href="#kegunaan">Lompat ke konten</a>
      <header className="masthead">
        <div className="masthead-inner">
          <a className="brand" href="#ringkasan" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <BrandMark />
            <span className="brand-text">
              <strong>SPSS Statistics</strong>
              <span>Analytics workspace</span>
            </span>
          </a>
          <nav className={'main-nav' + (menuOpen ? ' open' : '')} aria-label="Navigasi utama">
            {navItems.map((n) => (
              <button key={n.href} className="nav-link" onClick={() => scrollTo(n.href)}>{n.label}</button>
            ))}
            <button className="nav-link nav-cta" onClick={goWorkspace}>Buka aplikasi</button>
          </nav>
          <div className="masthead-actions">
            <button className="btn btn-ghost masthead-demo" onClick={goWorkspace}>
              Buka aplikasi <Icon name="arrow-right" size={16} />
            </button>
            <button className="menu-toggle" aria-label="Buka menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" id="ringkasan">
          <div className="hero-grid page">
            <div className="hero-copy">
              <p className="crumbs"><span>Analitik data</span><Icon name="chevron" size={12} /><span>SPSS Statistics</span></p>
              <p className="eyebrow"><span className="eyebrow-rule" /> IBM SPSS Statistics</p>
              <h1>Ubah data survei menjadi <em>keputusan</em> yang yakin.</h1>
              <p className="lede">
                SPSS membantu mengubah sekumpulan angka atau jawaban survei menjadi informasi yang bisa
                digunakan untuk penelitian maupun pengambilan keputusan bisnis. Sekarang, seluruh alurnya
                bisa Anda coba langsung di browser.
              </p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={goWorkspace}>
                  Coba SPSS di browser <Icon name="arrow-right" size={16} />
                </button>
                <button className="btn btn-tertiary" onClick={() => scrollTo('#kegunaan')}>
                  Pelajari kegunaannya
                </button>
              </div>
              <dl className="hero-facts">
                <div><dt>100</dt><dd>responden contoh</dd></div>
                <div><dt>7</dt><dd>variabel survei</dd></div>
                <div><dt>8</dt><dd>uji statistik siap pakai</dd></div>
              </dl>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="method-strip" aria-label="Metode yang didukung">
          <div className="page method-inner">
            <span className="method-label">Metode yang didukung</span>
            <ul>
              {['Regresi', 'Korelasi', 'Uji hipotesis', 'Reliabilitas', 'Deskriptif', 'Multivariat', 'Prediktif'].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section page" id="kegunaan">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow"><span className="eyebrow-rule" /> 01 — Kegunaan</p>
              <h2>Sebenarnya, SPSS digunakan untuk apa?</h2>
            </div>
            <p className="section-intro">
              Tujuh pekerjaan analisis yang paling sering muncul di penelitian dan bisnis. Enam di
              antaranya bisa Anda jalankan langsung di aplikasi dengan data contoh; prediksi dibahas
              sebagai kemampuan SPSS Modeler.
            </p>
          </div>
          <div className="use-table" role="table" data-reveal>
            <div className="use-row use-head" role="row">
              <span role="columnheader">Kegunaan</span>
              <span role="columnheader">Contoh</span>
              <span role="columnheader">Menu di SPSS</span>
            </div>
            {useCases.map((u) => (
              <div className="use-row" role="row" key={u.title}>
                <span className="use-title" role="cell">
                  <span className="use-icon"><Icon name={u.icon} size={18} /></span>
                  {u.title}
                </span>
                <span role="cell">{u.example}</span>
                <span role="cell"><span className="tag">{u.tag}</span></span>
              </div>
            ))}
          </div>
          <div className="section-note" data-reveal>
            <Icon name="info" size={18} />
            <p>SPSS mendukung regresi, pengujian hipotesis, analisis multivariat, dan pemodelan prediktif — bukan hanya satu jenis uji.</p>
          </div>
        </section>

        <section className="section section-tint" id="contoh">
          <div className="page">
            <div className="section-head" data-reveal>
              <div>
                <p className="eyebrow"><span className="eyebrow-rule" /> 02 — Contoh bisnis</p>
                <h2>Satu survei, empat pertanyaan bisnis.</h2>
              </div>
              <p className="section-intro">
                Bayangkan bisnis minuman Anda menyebar kuesioner ke 100 konsumen. Data masuk ke SPSS,
                lalu setiap pertanyaan dijawab dengan angka — bukan tebakan.
              </p>
            </div>
            <div className="case-grid">
              <div className="case-scenario" data-reveal>
                <div className="case-top">
                  <span className="case-file">survei_keputusan_pembelian.sav</span>
                  <span className="case-rows">100 baris · 7 variabel</span>
                </div>
                <div className="case-vars">
                  {[
                    ['X1', 'Harga produk', 'Independen'],
                    ['X2', 'Kualitas produk', 'Independen'],
                    ['X3', 'Promosi', 'Independen'],
                    ['Y', 'Keputusan pembelian', 'Dependen'],
                  ].map(([code, name, role]) => (
                    <div className={'case-var' + (code === 'Y' ? ' is-target' : '')} key={code}>
                      <span className="case-code">{code}</span>
                      <span className="case-name">{name}</span>
                      <span className="case-role">{role}</span>
                    </div>
                  ))}
                </div>
                <div className="case-method">
                  <span className="case-method-label">Metode</span>
                  <strong>Regresi linear berganda</strong>
                  <span>Y = a + b₁X1 + b₂X2 + b₃X3</span>
                </div>
                <button className="text-link" onClick={goWorkspace}>
                  Jalankan analisis ini <Icon name="arrow-right" size={14} />
                </button>
              </div>
              <div className="case-answers" data-reveal>
                <div className="answer-tabs" role="tablist" aria-label="Pertanyaan bisnis">
                  {questions.map((q, i) => (
                    <button
                      key={q.short}
                      role="tab"
                      aria-selected={question === i}
                      className={'answer-tab' + (question === i ? ' active' : '')}
                      onClick={() => setQuestion(i)}
                    >
                      <span>0{i + 1}</span>{q.short}
                    </button>
                  ))}
                </div>
                <div className="answer-card" role="tabpanel">
                  <p className="answer-q">{active.q}</p>
                  <div className="answer-metric">
                    <strong>{active.stat}</strong>
                    <span>{active.p}</span>
                  </div>
                  <div className="answer-bar"><i style={{ width: active.value + '%' }} /></div>
                  <p className="answer-text">{active.answer}</p>
                  <div className="answer-foot">
                    <span><Icon name="check-circle" size={15} /> Terbaca dari tabel Coefficients</span>
                    <button className="text-link" onClick={goWorkspace}>Lihat output <Icon name="arrow-right" size={14} /></button>
                  </div>
                </div>
                <p className="case-caption">*Angka contoh dari dataset bawaan aplikasi. Nilai sebenarnya dihitung ulang saat Anda membuka output.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section page" id="produk">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow"><span className="eyebrow-rule" /> 03 — Keluarga produk</p>
              <h2>Bukan satu aplikasi, tapi satu keluarga.</h2>
            </div>
            <p className="section-intro">
              Halaman produk SPSS sebenarnya membahas beberapa perangkat dengan fungsi berbeda. Pilih
              yang sesuai dengan pekerjaan Anda.
            </p>
          </div>
          <div className="product-grid">
            {products.map((p, i) => (
              <article className={'product-card' + (i === 0 ? ' featured' : '')} key={p.name} data-reveal>
                <div className="product-head">
                  <span className="product-badge">{p.badge}</span>
                  {i === 0 && <span className="product-flag">Direkomendasikan</span>}
                </div>
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
                <div className="product-visual"><ProductArt kind={p.art} /></div>
                <ul className="product-features">
                  {p.features.map((f) => <li key={f}><Icon name="check" size={14} />{f}</li>)}
                </ul>
                {i === 0 ? (
                  <button className="btn btn-primary product-cta" onClick={goWorkspace}>Buka Statistics <Icon name="arrow-right" size={16} /></button>
                ) : (
                  <button className="btn btn-tertiary product-cta" onClick={() => scrollTo('#cara-kerja')}>Pelajari alurnya</button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="section section-dark" id="cara-kerja">
          <div className="page">
            <div className="section-head section-head-dark" data-reveal>
              <div>
                <p className="eyebrow eyebrow-dark"><span className="eyebrow-rule" /> 04 — Cara kerja</p>
                <h2>Dari kuesioner ke kesimpulan, dalam lima langkah.</h2>
              </div>
              <p className="section-intro">
                Alur yang sama dipakai di aplikasi ini: data contoh sudah tersedia, Anda tinggal memilih
                analisis dan membaca hasilnya.
              </p>
            </div>
            <ol className="step-grid">
              {steps.map((s) => (
                <li className="step-card" key={s.n} data-reveal>
                  <div className="step-top">
                    <span className="step-number">{s.n}</span>
                    <span className="step-icon"><Icon name={s.icon} size={20} /></span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <span className="step-line" />
                </li>
              ))}
            </ol>
            <div className="flow-cta" data-reveal>
              <div>
                <strong>Siap mencoba langkah 3?</strong>
                <span>Semua uji berjalan di browser Anda, tanpa unggah data ke mana pun.</span>
              </div>
              <button className="btn btn-inverse" onClick={goWorkspace}>Buka Data Editor <Icon name="arrow-right" size={16} /></button>
            </div>
          </div>
        </section>

        <section className="section page" id="perbandingan">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow"><span className="eyebrow-rule" /> 05 — Perbandingan</p>
              <h2>Apakah SPSS penting untuk mahasiswa Bisnis Digital?</h2>
            </div>
            <p className="section-intro">
              Cukup penting, terutama saat mulai mengerjakan penelitian, skripsi, riset pasar, atau
              analisis perilaku konsumen. Ini posisi SPSS dibanding alat lain.
            </p>
          </div>
          <div className="compare-table" role="table" data-reveal>
            <div className="compare-row compare-head" role="row">
              <span role="columnheader">Software</span>
              <span role="columnheader">Fokus utama</span>
              <span role="columnheader">Paling cocok untuk</span>
            </div>
            {comparison.map((c) => (
              <div className={'compare-row' + (c.highlight ? ' highlight' : '')} role="row" key={c.name}>
                <span className="compare-name" role="cell">
                  {c.highlight && <span className="compare-dot" />}
                  {c.name}
                  {c.highlight && <span className="compare-pill">di aplikasi ini</span>}
                </span>
                <span role="cell">{c.focus}</span>
                <span role="cell">{c.fit}</span>
              </div>
            ))}
          </div>
          <div className="conclusion" data-reveal>
            <p className="conclusion-label">Kesimpulan</p>
            <p>
              SPSS bukan aplikasi untuk membuat website, desain, atau mengelola bisnis secara langsung.
              SPSS adalah alat bantu analisis data agar keputusan yang dibuat memiliki dasar statistik,
              bukan sekadar tebakan.
            </p>
            <button className="text-link" onClick={goWorkspace}>Mulai dari data contoh <Icon name="arrow-right" size={15} /></button>
          </div>
        </section>

        <section className="final-cta">
          <div className="page final-inner" data-reveal>
            <div>
              <p className="eyebrow eyebrow-dark"><span className="eyebrow-rule" /> Siap dipakai</p>
              <h2>Buka Data Editor. Pilih analisis. Baca hasilnya.</h2>
              <p>Data 100 responden sudah dimuat. Tidak perlu instalasi, tidak perlu akun.</p>
            </div>
            <button className="btn btn-inverse btn-lg" onClick={goWorkspace}>
              Coba SPSS sekarang <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="page footer-grid">
          <div className="footer-brand">
            <BrandMark />
            <p>Ruang kerja statistik untuk mengubah data survei menjadi keputusan yang bisa dipertanggungjawabkan.</p>
          </div>
          <div className="footer-col">
            <h4>Jelajahi</h4>
            <button onClick={() => scrollTo('#kegunaan')}>Kegunaan</button>
            <button onClick={() => scrollTo('#produk')}>Produk</button>
            <button onClick={() => scrollTo('#cara-kerja')}>Cara kerja</button>
          </div>
          <div className="footer-col">
            <h4>Aplikasi</h4>
            <button onClick={goWorkspace}>Data Editor</button>
            <button onClick={goWorkspace}>Output Viewer</button>
            <button onClick={goWorkspace}>Panduan cepat</button>
          </div>
          <div className="footer-col">
            <h4>Catatan</h4>
            <p className="footer-small">Rekonstruksi edukatif independen. Bukan produk, situs, atau afiliasi resmi IBM. Data contoh dibuat untuk latihan.</p>
            <p className="footer-small footer-source">Rujukan materi: ibm.com, IBM Community, dan dokumentasi IBM SPSS Statistics.</p>
          </div>
        </div>
        <div className="page footer-bottom">
          <span>© 2026 SPSS Statistics Workspace</span>
          <span>Dibuat untuk pembelajaran statistik</span>
        </div>
      </footer>
    </div>
  )
}
