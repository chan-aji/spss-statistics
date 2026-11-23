interface IconProps {
  name: string
  size?: number
  className?: string
}

export function MeasureIcon({ measure, size = 14 }: { measure: 'Nominal' | 'Ordinal' | 'Scale'; size?: number }) {
  if (measure === 'Scale') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Scale" role="img" className="measure-icon">
        <g transform="rotate(-45 8 8)">
          <rect x="2.1" y="6.2" width="11.8" height="3.6" fill="#e4d59a" stroke="#8a7a3d" strokeWidth="0.8" />
          <path d="M4.2 6.4v2M6.2 6.4v1.4M8.2 6.4v2M10.2 6.4v1.4M12.2 6.4v2" stroke="#8a7a3d" strokeWidth="0.7" />
        </g>
      </svg>
    )
  }
  if (measure === 'Ordinal') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Ordinal" role="img" className="measure-icon">
        <path d="M2.5 13.2h11" stroke="#7c8792" strokeWidth="0.8" />
        <rect x="3" y="8.2" width="2.5" height="5" fill="#8fb5dc" stroke="#5d7f9f" strokeWidth="0.5" />
        <rect x="6.7" y="5.5" width="2.5" height="7.7" fill="#e7c95c" stroke="#9a8230" strokeWidth="0.5" />
        <rect x="10.4" y="3" width="2.5" height="10.2" fill="#8fbd72" stroke="#5f8645" strokeWidth="0.5" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-label="Nominal" role="img" className="measure-icon">
      <circle cx="5.4" cy="6.2" r="2.7" fill="#e2574c" stroke="#a6352d" strokeWidth="0.6" />
      <circle cx="10.6" cy="6.2" r="2.7" fill="#5cae5c" stroke="#357b35" strokeWidth="0.6" />
      <circle cx="8" cy="10.3" r="2.7" fill="#4c86cf" stroke="#2c5f9e" strokeWidth="0.6" />
    </svg>
  )
}

export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="brand-mark" aria-hidden="true">
      <rect width="32" height="32" fill="#0f62fe" />
      <rect x="7" y="17" width="4" height="8" fill="#ffffff" />
      <rect x="14" y="12" width="4" height="13" fill="#ffffff" opacity="0.82" />
      <rect x="21" y="7" width="4" height="18" fill="#ffffff" opacity="0.64" />
    </svg>
  )
}

export function Icon({ name, size = 20, className }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
  switch (name) {
    case 'arrow-right':
      return <svg {...common}><path d="M4 12h15M13 6l6 6-6 6" /></svg>
    case 'arrow-left':
      return <svg {...common}><path d="M20 12H5M11 6l-6 6 6 6" /></svg>
    case 'arrow-up':
      return <svg {...common}><path d="M12 20V5M6 11l6-6 6 6" /></svg>
    case 'chevron':
      return <svg {...common}><path d="M9 6l6 6-6 6" /></svg>
    case 'chevron-down':
      return <svg {...common}><path d="M6 9l6 6 6-6" /></svg>
    case 'chevron-right':
      return <svg {...common}><path d="M9 6l6 6-6 6" /></svg>
    case 'close':
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case 'check':
      return <svg {...common}><path d="M4 12l5 5L20 6" /></svg>
    case 'check-circle':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></svg>
    case 'info':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
    case 'help':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.6 2.6 0 115 0c0 2-2.5 2-2.5 4M12 17h.01" /></svg>
    case 'survey':
      return <svg {...common}><path d="M8 4h8a2 2 0 012 2v14H6V6a2 2 0 012-2z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>
    case 'chart':
      return <svg {...common}><path d="M4 20h16M7 17V9M12 17V5M17 17v-5" /></svg>
    case 'table':
      return <svg {...common}><rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M3.5 9h17M9 9v10.5M15 9v10.5M3.5 14.5h17" /></svg>
    case 'flask':
      return <svg {...common}><path d="M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3" /><path d="M7.5 15h9" /></svg>
    case 'scatter':
      return <svg {...common}><path d="M4 20V4M4 20h16" /><circle cx="9" cy="14" r="1.4" /><circle cx="13" cy="9" r="1.4" /><circle cx="17" cy="12" r="1.4" /><circle cx="19" cy="6" r="1.4" /><circle cx="11" cy="17" r="1.4" /></svg>
    case 'trend':
      return <svg {...common}><path d="M3 17l5-5 4 3 7-9" /><path d="M15 6h4v4" /></svg>
    case 'spark':
      return <svg {...common}><path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" /></svg>
    case 'insight':
      return <svg {...common}><path d="M9 18h6M10 21h4" /><path d="M8 14a6 6 0 116 0c-.8.7-1 1.5-1 3H9c0-1.5-.2-2.3-1-3z" /></svg>
    case 'open':
      return <svg {...common}><path d="M3 7a1 1 0 011-1h5l2 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1z" /></svg>
    case 'save':
      return <svg {...common}><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h7V3M8 21v-7h8v7" /></svg>
    case 'print':
      return <svg {...common}><path d="M7 8V3h10v5M7 17H4V9h16v8h-3" /><rect x="7" y="14" width="10" height="7" /></svg>
    case 'undo':
      return <svg {...common}><path d="M4 8h10a5 5 0 110 10H8" /><path d="M8 4L4 8l4 4" /></svg>
    case 'redo':
      return <svg {...common}><path d="M20 8H10a5 5 0 100 10h6" /><path d="M16 4l4 4-4 4" /></svg>
    case 'find':
      return <svg {...common}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg>
    case 'goto':
      return <svg {...common}><path d="M4 5h16M4 12h10M4 19h7" /><path d="M17 12h4M19 9v6" /></svg>
    case 'insert-case':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M9 9v11" /><path d="M16 13v5M13.5 15.5h5" /></svg>
    case 'insert-variable':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M12 9v11" /><path d="M16 13v5M13.5 15.5h5" /></svg>
    case 'select':
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="1" strokeDasharray="3 2" /><path d="M8 12l3 3 5-6" /></svg>
    case 'split':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M12 4v16M3 12h18" /></svg>
    case 'weight':
      return <svg {...common}><path d="M12 3v3M7 21h10l-1.5-9h-7z" /><circle cx="12" cy="7" r="2" /></svg>
    case 'labels':
      return <svg {...common}><path d="M4 5h11l5 7-5 7H4z" /><path d="M8 10h5M8 14h4" /></svg>
    case 'descriptives':
      return <svg {...common}><path d="M4 20h16M6 16v-4M10 16V7M14 16v-6M18 16V5" /><path d="M4 4h3" /></svg>
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
    case 'play':
      return <svg {...common}><path d="M7 4l13 8-13 8z" /></svg>
    case 'copy':
      return <svg {...common}><rect x="8" y="8" width="12" height="13" rx="1" /><path d="M16 8V3H4v13h4" /></svg>
    case 'download':
      return <svg {...common}><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></svg>
    case 'reset':
      return <svg {...common}><path d="M4 4v6h6" /><path d="M5 10a8 8 0 111 9" /></svg>
    case 'grid':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
    case 'database':
      return <svg {...common}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></svg>
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
    case 'minus':
      return <svg {...common}><path d="M5 12h14" /></svg>
    case 'search':
      return <svg {...common}><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></svg>
    case 'window':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 8h18" /></svg>
    case 'folder':
      return <svg {...common}><path d="M3 6.5h6l2 2h10v9.5H3z" /><path d="M3 6.5V5h6l2 2" /></svg>
    case 'doc':
      return <svg {...common}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 11h6M9 15h6" /></svg>
    case 'refresh':
      return <svg {...common}><path d="M20 11a8 8 0 10-2.3 5.7" /><path d="M20 5v6h-6" /></svg>
    case 'paste':
      return <svg {...common}><path d="M9 5H5v16h14V5h-4" /><rect x="8" y="3" width="8" height="4" rx="1" /></svg>
    case 'trash':
      return <svg {...common}><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
    case 'replace':
      return <svg {...common}><circle cx="10" cy="10" r="5" /><path d="M14 14l5 5M17 5l4 4-4 4" /></svg>
    default:
      return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>
  }
}
