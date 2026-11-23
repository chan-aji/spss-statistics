import { Icon } from '../Icons'

interface GuideProps {
  onClose: () => void
  onRun: (kind: string) => void
  onOpenDialog: (name: string) => void
  onReset: () => void
  rows: number
}

// 8 core analyses in exact order for standard test suite
const coreSamples = [
  { kind: 'descriptives', icon: 'chart', title: 'Statistik deskriptif', desc: 'Rata-rata, minimum, maksimum, dan sebaran variabel numerik.', action: 'Atur variabel' },
  { kind: 'reliability', icon: 'check-circle', title: 'Validitas & reliabilitas', desc: "Cronbach's Alpha dan korelasi item-total untuk kualitas kuesioner.", action: 'Atur item' },
  { kind: 'correlation', icon: 'scatter', title: 'Korelasi', desc: 'Hubungan antar variabel dengan Pearson.', action: 'Atur variabel' },
  { kind: 'regression', icon: 'trend', title: 'Regresi linear', desc: 'Pengaruh beberapa prediktor terhadap variabel target.', action: 'Atur model' },
  { kind: 'frequencies', icon: 'survey', title: 'Frekuensi', desc: 'Persentase jawaban per kategori.', action: 'Atur variabel' },
  { kind: 'onesample', icon: 'flask', title: 'Uji t satu sampel', desc: 'Bandingkan rata-rata dengan nilai acuan.', action: 'Atur uji' },
  { kind: 'independent', icon: 'select', title: 'Uji t dua kelompok', desc: 'Bandingkan rata-rata dua kelompok, misalnya gender.', action: 'Atur uji' },
  { kind: 'crosstabs', icon: 'grid', title: 'Tabulasi silang', desc: 'Hubungan dua variabel kategori dengan Chi-Square.', action: 'Atur tabel' },
]

// Additional specialized tools for Skripsi Bab IV
const skripsiSamples = [
  { kind: 'assumptions', icon: 'flask', title: 'Uji Asumsi Klasik Lengkap', desc: 'Normalitas Residual (K-S & P-P Plot), Multikolinearitas (VIF), Heteroskedastisitas (Glejser), Durbin-Watson.', dialog: 'assumptions' },
  { kind: 'validity', icon: 'check-circle', title: 'Uji Validitas Butir (r-tabel)', desc: 'Bandingkan r-hitung Pearson butir instrumen dengan r-tabel taraf 5%.', dialog: 'validity' },
  { kind: 'normality', icon: 'chart', title: 'Uji Normalitas (K-S & Shapiro-Wilk)', desc: 'Uji sebaran normal prasyarat analisis parametrik.', dialog: 'normality' },
  { kind: 'anova', icon: 'grid', title: 'One-Way ANOVA (Tukey HSD)', desc: 'Bandingkan rata-rata 3 kelompok atau lebih dengan post-hoc.', dialog: 'anova' },
  { kind: 'paired', icon: 'refresh', title: 'Paired-Samples T-Test', desc: 'Uji beda data berpasangan (Pre-test vs Post-test eksperimen).', dialog: 'paired' },
]

export default function QuickGuide({ onClose, onRun, onOpenDialog, onReset, rows }: GuideProps) {
  return (
    <>
      <div className="guide-scrim" onClick={onClose} />
      <aside className="quick-guide" aria-label="Panduan cepat analisis skripsi">
        <div className="guide-head">
          <div>
            <p className="guide-eyebrow">Panduan Analisis Skripsi Kuantitatif</p>
            <h2>Mulai dari Sini</h2>
          </div>
          <button className="guide-close" onClick={onClose} aria-label="Tutup panduan"><Icon name="close" size={16} /></button>
        </div>
        <div className="guide-scroll">
          <ol className="guide-steps">
            <li>
              <span>1</span>
              <div>
                <strong>Lihat atau Paste Data Anda</strong>
                <p>{rows > 0 ? 'Data ' + rows + ' responden sudah siap di Data View. Anda juga bisa langsung copy-paste tabel dari Excel ke dalam sel data!' : 'Dataset masih kosong. Paste data dari Excel atau muat data survei contoh.'}</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Pilih Analisis Sesuai Bab IV Skripsi</strong>
                <p>Klik tombol analisis siap pakai di bawah, atau buka menu <strong>Analyze</strong> di toolbar atas.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Salin Hasil ke Microsoft Word</strong>
                <p>Output tabel SPSS dapat langsung disalin ke Word dengan tombol <em>Salin untuk Word</em>, lengkap dengan interpretasi pembahasan skripsi.</p>
              </div>
            </li>
          </ol>

          <div className="guide-section-title">Jalankan dengan satu klik</div>
          <div className="guide-cards">
            {coreSamples.map((s) => (
              <div className="guide-card" key={s.kind}>
                <div className="guide-card-icon"><Icon name={s.icon} size={17} /></div>
                <div className="guide-card-body">
                  <strong>{s.title}</strong>
                  <p>{s.desc}</p>
                </div>
                <div className="guide-card-actions">
                  <button className="guide-run" onClick={() => onRun(s.kind)}>Jalankan</button>
                  <button className="guide-config" onClick={() => onOpenDialog(s.kind)}>{s.action}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="guide-section-title">Uji Prasyarat &amp; Analisis Lanjutan Skripsi</div>
          <div className="guide-cards">
            {skripsiSamples.map((s) => (
              <div className="guide-extra-card" key={s.kind}>
                <div className="guide-card-icon"><Icon name={s.icon} size={17} /></div>
                <div className="guide-card-body">
                  <strong>{s.title}</strong>
                  <p>{s.desc}</p>
                </div>
                <div className="guide-card-actions">
                  <button className="guide-run" onClick={() => onRun(s.kind)}>Jalankan</button>
                  <button className="guide-config" onClick={() => onOpenDialog(s.dialog)}>Buka Dialog</button>
                </div>
              </div>
            ))}
          </div>

          <div className="guide-section-title">Standar Kelulusan Statistik Skripsi</div>
          <div className="guide-reading">
            <div><strong>Uji Validitas</strong><span>r hitung &gt; r tabel &amp; Sig. &lt; 0,05</span></div>
            <div><strong>Uji Reliabilitas</strong><span>Cronbach's Alpha &ge; 0,70</span></div>
            <div><strong>Uji Normalitas</strong><span>Sig. K-S / Shapiro &gt; 0,05</span></div>
            <div><strong>Multikolinearitas</strong><span>VIF &lt; 10 &amp; Tolerance &ge; 0,10</span></div>
            <div><strong>Heteroskedastisitas</strong><span>Glejser Sig. &gt; 0,05</span></div>
            <div><strong>Uji Hipotesis (t / F)</strong><span>Sig. &lt; 0,05 &rarr; Signifikan</span></div>
          </div>

          <div className="guide-footer">
            <button className="guide-reset" onClick={onReset}><Icon name="reset" size={14} /> Reset Data Contoh Skripsi</button>
            <span>Seluruh data aman dan berjalan di browser Anda.</span>
          </div>
        </div>
      </aside>
    </>
  )
}
