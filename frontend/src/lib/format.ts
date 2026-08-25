export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--success)'
  if (score >= 60) return 'var(--warning)'
  return 'var(--danger)'
}

export function scoreBadgeClass(score: number | null | undefined): string {
  if (score == null) return 'badge badge-gray'
  if (score >= 80) return 'badge badge-green'
  if (score >= 60) return 'badge badge-yellow'
  return 'badge badge-red'
}

const LANGUAGE_META: Record<string, { color: string; label: string }> = {
  javascript: { color: '#f1e05a', label: 'JavaScript' },
  typescript: { color: '#3178c6', label: 'TypeScript' },
  python: { color: '#3572A5', label: 'Python' },
  java: { color: '#b07219', label: 'Java' },
  go: { color: '#00ADD8', label: 'Go' },
  rust: { color: '#dea584', label: 'Rust' },
}

export function languageMeta(lang: string) {
  return LANGUAGE_META[lang] ?? { color: '#8b949e', label: lang }
}
