import { useEffect, useRef, useState } from 'react'
import { Icon } from '../Icons'

interface MenuItem {
  label?: string
  action?: string
  shortcut?: string
  items?: MenuItem[]
  divider?: boolean
  checked?: boolean
  disabled?: boolean
}

function buildMenus(
  valueLabels: boolean,
  showGridLines: boolean,
  showStatusBar: boolean,
  hasFilter: boolean,
  windows: { output: boolean; syntax: boolean },
): { label: string; items: MenuItem[] }[] {
  return [
    {
      label: 'File',
      items: [
        { label: 'New', items: [
          { label: 'Data', action: 'file.new.empty', shortcut: 'Ctrl+N' },
          { label: 'Data Survei Contoh (100 Kasus)', action: 'file.new.sample' },
          { label: 'Syntax', action: 'file.new.syntax' },
          { label: 'Output', action: 'file.new.output' },
        ] },
        { label: 'Open', items: [
          { label: 'Data (*.sav, *.csv)…', action: 'file.open.data', shortcut: 'Ctrl+O' },
          { label: 'Data Survei Contoh Skripsi…', action: 'file.open.sample' },
          { label: 'Syntax…', action: 'file.open.syntax' },
          { label: 'Output…', action: 'file.open.output' },
        ] },
        { label: 'Open Database', items: [
          { label: 'New Query…', action: 'placeholder:Open Database - New Query' },
          { label: 'Edit Query…', action: 'placeholder:Open Database - Edit Query' },
          { label: 'Run Query…', action: 'placeholder:Open Database - Run Query' },
        ] },
        { label: 'Read Text Data…', action: 'file.open.data' },
        { label: 'Import Data', items: [
          { label: 'SPSS Data Document (*.sav)…', action: 'file.open.data' },
          { label: 'Excel Spreadsheet (*.xlsx, *.xls)…', action: 'file.open.data' },
          { label: 'CSV Data (*.csv)…', action: 'file.open.data' },
          { label: 'Text Data (*.txt, *.dat)…', action: 'file.open.data' },
          { label: 'SAS (*.sas7bdat, *.sd2)…', action: 'placeholder:Import SAS Data' },
          { label: 'Stata (*.dta)…', action: 'placeholder:Import Stata Data' },
        ] },
        { label: 'Close', action: 'file.exit', shortcut: 'Ctrl+F4' },
        { divider: true },
        { label: 'Save', action: 'file.save', shortcut: 'Ctrl+S' },
        { label: 'Save As…', action: 'file.saveas', shortcut: 'Ctrl+Shift+S' },
        { label: 'Save All Data', action: 'file.save' },
        { label: 'Export', items: [
          { label: 'SPSS Statistics Data File (*.sav)…', action: 'file.export.sav' },
          { label: 'Excel Spreadsheet (*.xlsx)…', action: 'file.export.excel' },
          { label: 'CSV Data (*.csv)…', action: 'file.export.csv' },
          { label: 'Output Document (Word / HTML)…', action: 'file.export.output' },
          { label: 'PDF Document (*.pdf)…', action: 'file.print' },
        ] },
        { divider: true },
        { label: 'Display Data File Information', items: [
          { label: 'Working File…', action: 'file.info.working' },
          { label: 'External File…', action: 'placeholder:Display Data File Information - External File' },
        ] },
        { label: 'Repository', items: [
          { label: 'Connect…', action: 'placeholder:Repository Connect' },
        ] },
        { divider: true },
        { label: 'Page Setup…', action: 'placeholder:Page Setup' },
        { label: 'Print Preview', action: 'file.print' },
        { label: 'Print…', action: 'file.print', shortcut: 'Ctrl+P' },
        { divider: true },
        { label: 'Reset Data Contoh Skripsi (100 Responden)', action: 'file.reset' },
        { label: 'Exit', action: 'file.exit', shortcut: 'Alt+F4' },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', action: 'edit.undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', action: 'edit.redo', shortcut: 'Ctrl+Y' },
        { divider: true },
        { label: 'Clear Case (Hapus Baris Kasus Aktif)', action: 'edit.clearcase', shortcut: 'Del' },
        { label: 'Copy Output Table (for Word)', action: 'edit.copyoutput', shortcut: 'Ctrl+C' },
        { divider: true },
        { label: 'Find…', action: 'edit.find', shortcut: 'Ctrl+F' },
        { label: 'Replace…', action: 'edit.replace', shortcut: 'Ctrl+H' },
        { label: 'Go to Case…', action: 'edit.goto' },
        { label: 'Go to Variable…', action: 'utilities.variables' },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Data View', action: 'view.data' },
        { label: 'Variable View', action: 'view.variable' },
        { divider: true },
        { label: 'Value Labels (Label Nilai)', action: 'view.labels', checked: valueLabels },
        { label: 'Grid Lines', action: 'view.grid', checked: showGridLines },
        { label: 'Status Bar', action: 'view.statusbar', checked: showStatusBar },
        { divider: true },
        { label: 'Output Viewer', action: 'view.output', checked: windows.output },
        { label: 'Syntax Editor', action: 'view.syntax', checked: windows.syntax },
      ],
    },
    {
      label: 'Data',
      items: [
        { label: 'Define Variable Properties…', action: 'utilities.variables' },
        { label: 'Set Measurement Level for Unknown…', action: 'utilities.variables' },
        { label: 'Copy Data Properties…', action: 'placeholder:Copy Data Properties' },
        { label: 'New Custom Attribute…', action: 'placeholder:New Custom Attribute' },
        { label: 'Define Multiple Response Sets…', action: 'placeholder:Multiple Response Sets' },
        { label: 'Copy Dataset', action: 'placeholder:Copy Dataset' },
        { label: 'Identify Duplicate Cases…', action: 'placeholder:Identify Duplicate Cases' },
        { label: 'Identify Unusual Cases…', action: 'placeholder:Identify Unusual Cases' },
        { label: 'Compare Datasets…', action: 'placeholder:Compare Datasets' },
        { divider: true },
        { label: 'Insert Case (Tambah Responden)', action: 'data.insertcase' },
        { label: 'Insert Variable (Tambah Variabel)', action: 'data.insertvar' },
        { label: 'Delete Case (Hapus Baris Kasus Aktif)', action: 'edit.clearcase' },
        { label: 'Go to Case…', action: 'edit.goto' },
        { divider: true },
        { label: 'Sort Cases…', action: 'data.sort' },
        { label: 'Sort Variables…', action: 'placeholder:Sort Variables' },
        { label: 'Transpose…', action: 'placeholder:Transpose Dataset' },
        { label: 'Merge Files', items: [
          { label: 'Add Cases…', action: 'placeholder:Merge Files - Add Cases' },
          { label: 'Add Variables…', action: 'placeholder:Merge Files - Add Variables' },
        ] },
        { label: 'Restructure…', action: 'placeholder:Restructure Data' },
        { label: 'Aggregate…', action: 'placeholder:Aggregate Data' },
        { label: 'Orthogonal Design', items: [
          { label: 'Generate…', action: 'placeholder:Generate Orthogonal Design' },
          { label: 'Display…', action: 'placeholder:Display Orthogonal Design' },
        ] },
        { divider: true },
        { label: 'Split File…', action: 'placeholder:Split File' },
        { label: 'Select Cases (Filter Data)…', action: 'data.select', checked: hasFilter },
        { label: 'Weight Cases…', action: 'placeholder:Weight Cases' },
        { label: 'Reset Filter (Gunakan Semua Kasus)', action: 'data.resetfilter' },
      ],
    },
    {
      label: 'Transform',
      items: [
        { label: 'Compute Variable (Hitung Skor Total / Rumus)…', action: 'transform.compute' },
        { label: 'Programmability Transformation…', action: 'placeholder:Programmability Transformation' },
        { label: 'Count Values within Cases…', action: 'placeholder:Count Values within Cases' },
        { label: 'Shift Values (Lag / Lead)…', action: 'placeholder:Shift Values' },
        { divider: true },
        { label: 'Recode into Same Variables…', action: 'transform.recode' },
        { label: 'Recode into Different Variables…', action: 'transform.recode' },
        { label: 'Automatic Recode…', action: 'placeholder:Automatic Recode' },
        { label: 'Create Dummy Variables…', action: 'placeholder:Create Dummy Variables' },
        { label: 'Visual Binning…', action: 'placeholder:Visual Binning' },
        { label: 'Optimal Binning…', action: 'placeholder:Optimal Binning' },
        { divider: true },
        { label: 'Prepare Data for Modeling', items: [
          { label: 'Automatic Data Preparation…', action: 'placeholder:Automatic Data Preparation' },
        ] },
        { label: 'Rank Cases…', action: 'placeholder:Rank Cases' },
        { label: 'Date and Time Wizard…', action: 'placeholder:Date and Time Wizard' },
        { label: 'Create Time Series…', action: 'placeholder:Create Time Series' },
        { label: 'Replace Missing Values…', action: 'placeholder:Replace Missing Values' },
        { label: 'Random Number Generators…', action: 'placeholder:Random Number Generators' },
      ],
    },
    {
      label: 'Analyze',
      items: [
        { label: 'Reports', items: [
          { label: 'OLAP Cubes…', action: 'placeholder:OLAP Cubes' },
          { label: 'Case Summaries…', action: 'placeholder:Case Summaries' },
          { label: 'Report Summaries in Rows…', action: 'placeholder:Report Summaries in Rows' },
          { label: 'Report Summaries in Columns…', action: 'placeholder:Report Summaries in Columns' },
        ] },
        { label: 'Descriptive Statistics', items: [
          { label: 'Frequencies…', action: 'analyze.frequencies' },
          { label: 'Descriptives…', action: 'analyze.descriptives' },
          { label: 'Explore / Uji Normalitas…', action: 'analyze.normality' },
          { label: 'Crosstabs…', action: 'analyze.crosstabs' },
          { label: 'TURF Analysis…', action: 'placeholder:TURF Analysis' },
          { label: 'Ratio…', action: 'placeholder:Ratio Statistics' },
          { label: 'P-P Plots…', action: 'analyze.assumptions' },
          { label: 'Q-Q Plots…', action: 'analyze.assumptions' },
        ] },
        { label: 'Tables', items: [
          { label: 'Custom Tables…', action: 'analyze.crosstabs' },
          { label: 'Multiple Response Sets…', action: 'placeholder:Multiple Response Sets' },
        ] },
        { label: 'Compare Means', items: [
          { label: 'Means…', action: 'analyze.descriptives' },
          { label: 'One-Sample T Test…', action: 'analyze.onesample' },
          { label: 'Independent-Samples T Test…', action: 'analyze.independent' },
          { label: 'Summary Independent-Samples T Test…', action: 'analyze.independent' },
          { label: 'Paired-Samples T Test (Pre-Post)…', action: 'analyze.paired' },
          { label: 'One-Way ANOVA (Tukey HSD)…', action: 'analyze.anova' },
        ] },
        { label: 'General Linear Model', items: [
          { label: 'Univariate (Two-Way ANOVA)…', action: 'analyze.twowayanova' },
          { label: 'Multivariate…', action: 'placeholder:GLM Multivariate' },
          { label: 'Repeated Measures…', action: 'analyze.paired' },
          { label: 'Variance Components…', action: 'placeholder:Variance Components' },
        ] },
        { label: 'Generalized Linear Models', items: [
          { label: 'Generalized Linear Models…', action: 'placeholder:Generalized Linear Models' },
          { label: 'Generalized Estimating Equations…', action: 'placeholder:Generalized Estimating Equations' },
        ] },
        { label: 'Mixed Models', items: [
          { label: 'Linear…', action: 'analyze.regression' },
          { label: 'Generalized Linear…', action: 'placeholder:Generalized Linear Mixed Models' },
        ] },
        { label: 'Correlate', items: [
          { label: 'Bivariate (Pearson / Spearman / Kendall)…', action: 'analyze.correlation' },
          { label: 'Partial…', action: 'analyze.partial' },
          { label: 'Distances…', action: 'placeholder:Distances' },
          { label: 'Canonical Correlation…', action: 'placeholder:Canonical Correlation' },
          { label: 'Uji Validitas Butir (r hitung vs r tabel)…', action: 'analyze.validity' },
        ] },
        { label: 'Regression', items: [
          { label: 'Linear Regression (Sederhana & Berganda)…', action: 'analyze.regression' },
          { label: 'Uji Asumsi Klasik (Normalitas, VIF, Glejser, D-W)…', action: 'analyze.assumptions' },
          { label: 'Curve Estimation…', action: 'analyze.regression' },
          { label: 'Partial Least Squares (PLS)…', action: 'placeholder:Partial Least Squares (PLS)' },
          { label: 'Binary Logistic…', action: 'analyze.logistic' },
          { label: 'Multinomial Logistic…', action: 'placeholder:Multinomial Logistic Regression' },
          { label: 'Ordinal…', action: 'placeholder:Ordinal Regression' },
          { label: 'Probit…', action: 'placeholder:Probit Analysis' },
          { label: 'Nonlinear…', action: 'placeholder:Nonlinear Regression' },
          { label: 'Weight Estimation…', action: 'analyze.regression' },
          { label: '2-Stage Least Squares…', action: 'placeholder:Two-Stage Least Squares' },
          { label: 'Optimal Scaling (CATREG)…', action: 'placeholder:Categorical Regression' },
        ] },
        { label: 'Loglinear', items: [
          { label: 'General…', action: 'placeholder:General Loglinear' },
          { label: 'Logit…', action: 'placeholder:Logit Loglinear' },
          { label: 'Model Selection…', action: 'placeholder:Model Selection Loglinear' },
        ] },
        { label: 'Neural Networks', items: [
          { label: 'Multilayer Perceptron…', action: 'placeholder:Multilayer Perceptron' },
          { label: 'Radial Basis Function…', action: 'placeholder:Radial Basis Function' },
        ] },
        { label: 'Classify', items: [
          { label: 'TwoStep Cluster…', action: 'placeholder:TwoStep Cluster' },
          { label: 'K-Means Cluster…', action: 'placeholder:K-Means Cluster' },
          { label: 'Hierarchical Cluster…', action: 'placeholder:Hierarchical Cluster' },
          { label: 'Discriminant…', action: 'placeholder:Discriminant Analysis' },
          { label: 'Tree…', action: 'placeholder:Decision Tree' },
        ] },
        { label: 'Dimension Reduction', items: [
          { label: 'Factor (Analisis Faktor EFA)…', action: 'analyze.factor' },
          { label: 'Correspondence Analysis…', action: 'placeholder:Correspondence Analysis' },
          { label: 'Optimal Scaling…', action: 'placeholder:Optimal Scaling' },
        ] },
        { label: 'Scale', items: [
          { label: 'Reliability Analysis…', action: 'analyze.reliability' },
          { label: 'Multidimensional Scaling (PROXSCAL)…', action: 'placeholder:PROXSCAL' },
          { label: 'Multidimensional Scaling (ALSCAL)…', action: 'placeholder:ALSCAL' },
          { label: 'Uji Validitas Butir (r hitung vs r tabel)…', action: 'analyze.validity' },
        ] },
        { label: 'Nonparametric Tests', items: [
          { label: 'One Sample…', action: 'analyze.onesample' },
          { label: 'Independent Samples…', action: 'analyze.mannwhitney' },
          { label: 'Related Samples…', action: 'analyze.wilcoxon' },
          { divider: true },
          { label: 'Legacy Dialogs', items: [
            { label: 'Chi-Square…', action: 'analyze.crosstabs' },
            { label: 'Binomial…', action: 'placeholder:Binomial Test' },
            { label: 'Runs…', action: 'placeholder:Runs Test' },
            { label: '1-Sample K-S (Kolmogorov-Smirnov)…', action: 'analyze.normality' },
            { label: '2 Independent Samples (Mann-Whitney U)…', action: 'analyze.mannwhitney' },
            { label: '2 Related Samples (Wilcoxon Signed-Rank)…', action: 'analyze.wilcoxon' },
            { label: 'K Independent Samples (Kruskal-Wallis)…', action: 'analyze.kruskalwallis' },
            { label: 'K Related Samples (Friedman)…', action: 'placeholder:Friedman Test' },
          ] },
        ] },
        { label: 'Forecasting', items: [
          { label: 'Create Traditional Models…', action: 'placeholder:Time Series Modeling' },
          { label: 'Apply Traditional Models…', action: 'placeholder:Apply Time Series Models' },
          { label: 'Seasonal Decomposition…', action: 'placeholder:Seasonal Decomposition' },
          { label: 'Spectral Analysis…', action: 'placeholder:Spectral Analysis' },
          { label: 'Autocorrelations…', action: 'analyze.assumptions' },
          { label: 'Cross-Correlations…', action: 'analyze.correlation' },
        ] },
        { label: 'Survival', items: [
          { label: 'Life Tables…', action: 'placeholder:Life Tables' },
          { label: 'Kaplan-Meier…', action: 'placeholder:Kaplan-Meier' },
          { label: 'Cox Regression…', action: 'placeholder:Cox Regression' },
          { label: 'Cox w/ Time-Dep Cov…', action: 'placeholder:Cox with Time-Dependent Covariates' },
        ] },
        { label: 'Multiple Response', items: [
          { label: 'Define Variable Sets…', action: 'placeholder:Define Variable Sets' },
          { label: 'Frequencies…', action: 'analyze.frequencies' },
          { label: 'Crosstabs…', action: 'analyze.crosstabs' },
        ] },
        { label: 'Missing Value Analysis…', action: 'placeholder:Missing Value Analysis' },
        { label: 'Multiple Imputation', items: [
          { label: 'Analyze Patterns…', action: 'placeholder:Analyze Missing Patterns' },
          { label: 'Impute Missing Data Values…', action: 'placeholder:Impute Missing Values' },
        ] },
        { label: 'Complex Samples', items: [
          { label: 'Select a Sample…', action: 'placeholder:Complex Samples Selection' },
          { label: 'Frequencies…', action: 'analyze.frequencies' },
          { label: 'Descriptives…', action: 'analyze.descriptives' },
          { label: 'Crosstabs…', action: 'analyze.crosstabs' },
        ] },
        { label: 'Quality Control', items: [
          { label: 'Control Charts…', action: 'placeholder:Control Charts' },
          { label: 'Pareto Charts…', action: 'placeholder:Pareto Charts' },
        ] },
        { label: 'ROC Analysis…', action: 'placeholder:ROC Analysis' },
        { label: 'Spatial and Temporal Modeling', items: [
          { label: 'Temporal Causal Modeling…', action: 'placeholder:Temporal Causal Modeling' },
          { label: 'Spatial Temporal Prediction…', action: 'placeholder:Spatial Temporal Prediction' },
        ] },
        { label: 'Simulation…', action: 'placeholder:Monte Carlo Simulation' },
        { label: 'Power Analysis', items: [
          { label: 'Power Analysis (Kekuatan Uji Statistik 2026)…', action: 'analyze.power' },
          { divider: true },
          { label: 'Means', items: [
            { label: 'One-Sample T Test…', action: 'analyze.power' },
            { label: 'Paired-Samples T Test…', action: 'analyze.power' },
            { label: 'Independent-Samples T Test…', action: 'analyze.power' },
            { label: 'One-Way ANOVA…', action: 'analyze.power' },
          ] },
          { label: 'Proportions…', action: 'placeholder:Power Proportions' },
          { label: 'Correlations (Pearson / Spearman)…', action: 'analyze.power' },
          { label: 'Regression (Linear)…', action: 'analyze.power' },
        ] },
      ],
    },
    {
      label: 'Graphs',
      items: [
        { label: 'Chart Builder…', action: 'graph.bar' },
        { label: 'Graphboard Template Chooser…', action: 'graph.bar' },
        { label: 'Compare Subgroups…', action: 'placeholder:Compare Subgroups' },
        { divider: true },
        { label: 'Legacy Dialogs', items: [
          { label: 'Bar Chart…', action: 'graph.bar' },
          { label: '3-D Bar…', action: 'graph.bar' },
          { label: 'Line…', action: 'placeholder:Line Chart' },
          { label: 'Area…', action: 'placeholder:Area Chart' },
          { label: 'Pie Chart…', action: 'graph.bar' },
          { label: 'High-Low…', action: 'placeholder:High-Low Chart' },
          { label: 'Boxplot…', action: 'placeholder:Boxplot' },
          { label: 'Error Bar…', action: 'placeholder:Error Bar' },
          { label: 'Population Pyramid…', action: 'placeholder:Population Pyramid' },
          { label: 'Scatter/Dot…', action: 'analyze.assumptions' },
          { label: 'Histogram…', action: 'graph.histogram' },
          { label: 'Normal P-P Plot (Uji Asumsi)…', action: 'analyze.assumptions' },
        ] },
      ],
    },
    {
      label: 'Utilities',
      items: [
        { label: 'Variables (Variable View)…', action: 'utilities.variables' },
        { label: 'OMS Control Panel…', action: 'placeholder:OMS Control Panel' },
        { label: 'OMS Requests…', action: 'placeholder:OMS Requests' },
        { label: 'Data File Comments…', action: 'placeholder:Data File Comments' },
        { label: 'Define Variable Sets…', action: 'placeholder:Define Variable Sets' },
        { label: 'Use Variable Sets…', action: 'placeholder:Use Variable Sets' },
        { label: 'Show All Variables', action: 'utilities.variables' },
        { label: 'Spelling…', action: 'placeholder:Spelling Check' },
      ],
    },
    {
      label: 'Extensions',
      items: [
        { label: 'Extension Hub…', action: 'placeholder:Extension Hub' },
        { label: 'Install Local Extension Bundle…', action: 'placeholder:Install Local Extension Bundle' },
        { label: 'Utilities', items: [
          { label: 'Custom Dialog Builder Mode', action: 'placeholder:Custom Dialog Builder' },
        ] },
      ],
    },
    {
      label: 'AI Agent',
      items: [
        { label: 'Buka AI Co-Pilot Panel…', action: 'agent.toggle', shortcut: 'Ctrl+Shift+A' },
        { divider: true },
        { label: 'Jalankan Analisis Skripsi Lengkap (Otomatis)', action: 'agent.auto.thesis' },
        { label: 'Uji Validitas & Reliabilitas Kuesioner', action: 'agent.auto.validity' },
        { label: 'Uji 4 Asumsi Klasik Regresi', action: 'agent.auto.assumptions' },
        { label: 'Regresi Linier Berganda & Uji Hipotesis', action: 'agent.auto.regression' },
        { divider: true },
        { label: 'Salin Seluruh Output ke Dokumen Word', action: 'file.export.output' },
        { label: 'Informasi Integrasi MCP Server Antigravity…', action: 'agent.mcp.guide' },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Data Editor', action: 'view.data', checked: true },
        { label: 'Variable View', action: 'view.variable' },
        { divider: true },
        { label: 'Output Viewer', action: 'view.output', checked: windows.output },
        { label: 'Syntax Editor', action: 'view.syntax', checked: windows.syntax },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Panduan Analisis Skripsi', action: 'help.guide', shortcut: 'F1' },
        { label: 'Cara Membaca Output Skripsi (Bab IV)', action: 'help.reading' },
        { divider: true },
        { label: 'About SPSS Statistics Recreation…', action: 'help.about' },
      ],
    },
  ]
}

function MenuItems({ items, onAction }: { items: MenuItem[]; onAction: (action: string) => void }) {
  return (
    <div className="menu-dropdown">
      {items.map((item, i) => {
        if (item.divider) return <div className="menu-divider" key={'d' + i} />
        if (item.items) {
          return (
            <div className="menu-sub-wrap" key={i}>
              <button className={'menu-item has-sub' + (item.disabled ? ' disabled' : '')} type="button" disabled={item.disabled}>
                <span className="menu-check">{item.checked ? '✓' : ''}</span>
                <span className="menu-label">{item.label}</span>
                <Icon name="chevron-right" size={11} />
              </button>
              <div className="menu-submenu">
                <MenuItems items={item.items} onAction={onAction} />
              </div>
            </div>
          )
        }
        return (
          <button
            key={i}
            className={'menu-item' + (item.disabled ? ' disabled' : '')}
            type="button"
            disabled={item.disabled}
            onClick={() => item.action && onAction(item.action)}
          >
            <span className="menu-check">{item.checked ? '✓' : ''}</span>
            <span className="menu-label">{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function MenuBar({ onAction, valueLabels, showGridLines, showStatusBar, hasFilter = false, windows = { output: false, syntax: false } }: {
  onAction: (action: string) => void
  valueLabels: boolean
  showGridLines: boolean
  showStatusBar: boolean
  hasFilter?: boolean
  windows?: { output: boolean; syntax: boolean }
}) {
  const [open, setOpen] = useState<string | null>(null)
  const menus = buildMenus(valueLabels, showGridLines, showStatusBar, hasFilter, windows)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div className="spss-menubar" ref={barRef} role="menubar">
      {menus.map((menu) => (
        <div
          className="menu-wrap"
          key={menu.label}
          onMouseEnter={() => { if (open) setOpen(menu.label) }}
        >
          <button
            type="button"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={open === menu.label}
            className={'menu-top' + (open === menu.label ? ' open' : '')}
            onClick={() => setOpen(open === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>
          {open === menu.label && (
            <MenuItems items={menu.items} onAction={(a) => { setOpen(null); onAction(a) }} />
          )}
        </div>
      ))}
    </div>
  )
}

const toolGroups: { icon: string; action: string; title: string }[][] = [
  [
    { icon: 'open', action: 'file.open.data', title: 'Open Data Document (*.sav, *.csv)' },
    { icon: 'save', action: 'file.saveas', title: 'Save Data As (*.sav, *.xlsx, *.csv)' },
    { icon: 'print', action: 'file.print', title: 'Print / Export PDF' },
  ],
  [
    { icon: 'undo', action: 'edit.undo', title: 'Undo (Ctrl+Z)' },
    { icon: 'redo', action: 'edit.redo', title: 'Redo (Ctrl+Y)' },
  ],
  [
    { icon: 'goto', action: 'edit.goto', title: 'Go to Case' },
    { icon: 'find', action: 'edit.find', title: 'Find' },
  ],
  [
    { icon: 'insert-case', action: 'data.insertcase', title: 'Insert Case' },
    { icon: 'insert-variable', action: 'data.insertvar', title: 'Insert Variable' },
    { icon: 'select', action: 'data.select', title: 'Select Cases (Filter)' },
  ],
  [
    { icon: 'labels', action: 'view.labels', title: 'Value Labels' },
    { icon: 'descriptives', action: 'analyze.descriptives', title: 'Descriptives' },
    { icon: 'trend', action: 'analyze.regression', title: 'Linear Regression' },
    { icon: 'check-circle', action: 'analyze.reliability', title: 'Uji Reliabilitas & Validitas' },
    { icon: 'chart', action: 'graph.bar', title: 'Bar Chart' },
  ],
]

export function Toolbar({ onAction }: { onAction: (action: string) => void }) {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="spss-toolbar">
      {toolGroups.map((group, gi) => (
        <div className="tool-group" key={gi}>
          {group.map((t) => (
            <button key={t.action + t.title} className="tool-btn" title={t.title} aria-label={t.title} onClick={() => onAction(t.action)}>
              <Icon name={t.icon} size={18} />
            </button>
          ))}
        </div>
      ))}
      <button className="toolbar-guide" onClick={() => onAction('help.guide')} title="Panduan Cepat Skripsi">
        <Icon name="info" size={14} /> Panduan cepat
      </button>
      <button className="tool-text-btn" onClick={() => onAction('analyze.assumptions')} title="Uji Asumsi Klasik Regresi Lengkap">
        <Icon name="flask" size={16} /> Asumsi Klasik…
      </button>
      <button className="tool-text-btn" onClick={() => onAction('transform.compute')} title="Compute Variable (Hitung Skor Total)">
        <Icon name="spark" size={16} /> Compute…
      </button>
      <button className="tool-ai-btn" onClick={() => onAction('agent.toggle')} title="Buka Asisten AI SPSS Co-Pilot (MCP Agent - Analisis Otomatis)">
        <Icon name="spark" size={16} /> <strong>AI Agent</strong>
      </button>
      <div className="toolbar-spacer" />
      <label className="toolbar-search">
        <Icon name="search" size={15} />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const term = search.trim()
              setSearch('')
              onAction(term ? 'search.term:' + term : 'edit.find')
            }
          }}
          placeholder="Cari menu / kasus..."
          aria-label="Cari menu atau kasus"
        />
      </label>
    </div>
  )
}

export function TitleBar({ title, datasetName, onExit, onNote }: {
  title: string
  datasetName: string
  onExit: () => void
  onNote: (msg: string) => void
}) {
  return (
    <div className="spss-titlebar">
      <span className="spss-app-icon" aria-hidden="true"><i /><i /><i /></span>
      <span className="spss-title-text">{datasetName} [DataSet1] - {title}</span>
      <div className="spss-window-buttons">
        <button aria-label="Minimize" title="Minimize" onClick={() => onNote('Aplikasi berjalan penuh di dalam browser.')}><span className="win-min" /></button>
        <button aria-label="Maximize" title="Maximize" onClick={() => onNote('Gunakan F11 untuk layar penuh.')}><span className="win-max" /></button>
        <button aria-label="Close" title="Kembali ke landing page" onClick={onExit}><span className="win-close" /></button>
      </div>
    </div>
  )
}

export function StatusBar({ activeRow, totalRows, vars, view, hasFilter, message }: {
  activeRow: number
  totalRows: number
  vars: number
  view: string
  hasFilter?: boolean
  message?: string
}) {
  return (
    <div className="spss-statusbar">
      <span className="status-ready-dot" aria-hidden="true" />
      <span className="status-main">{message ?? 'IBM SPSS Statistics Processor is ready'}</span>
      <span className="status-spacer" />
      <span className="status-muted">Case {activeRow} of {totalRows}</span>
      <span className="status-sep" />
      <span className="status-muted">Filter: {hasFilter ? 'ON' : 'OFF'}</span>
      <span className="status-sep" />
      <span className="status-muted">View: {view}</span>
      <span className="status-sep" />
      <span className="status-muted">Visible: {vars} of {vars} Variables</span>
      <span className="status-sep" />
      <span className="status-muted">Unicode: ON</span>
    </div>
  )
}
