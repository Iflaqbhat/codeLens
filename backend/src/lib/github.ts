const API = 'https://api.github.com'
const MAX_CHARS = 60000 // keep submissions reviewable

export interface FetchedSource {
  kind: 'pull' | 'file' | 'gist'
  title: string
  language: string
  code: string
  truncated: boolean
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'codelens-review-app',
  }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  return headers
}

async function gh(path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: ghHeaders() })
  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}))
    throw new Error(
      res.status === 404 ? 'Not found on GitHub (private repo or wrong URL?)' :
      res.status === 403 ? 'GitHub rate limit hit — add GITHUB_TOKEN to .env for 5000 req/hr' :
      body.message || `GitHub request failed (${res.status})`
    )
  }
  return res.json()
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', go: 'go', rs: 'rust',
  }
  return map[ext] ?? 'javascript'
}

function parseUrl(raw: string): { kind: 'pull' | 'file' | 'gist'; parts: string[] } {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('Invalid URL')
  }

  const segs = url.pathname.split('/').filter(Boolean)

  if (url.hostname === 'gist.github.com') {
    if (segs.length < 2) throw new Error('Gist URL should look like gist.github.com/user/id')
    return { kind: 'gist', parts: [segs[1]] }
  }

  if (url.hostname !== 'github.com') {
    throw new Error('Only github.com and gist.github.com URLs are supported')
  }

  // github.com/owner/repo/pull/123
  if (segs[2] === 'pull' && segs[3]) {
    return { kind: 'pull', parts: [segs[0], segs[1], segs[3]] }
  }

  // github.com/owner/repo/blob/ref/path/to/file.ext
  if ((segs[2] === 'blob' || segs[2] === 'raw') && segs.length > 4) {
    return { kind: 'file', parts: [segs[0], segs[1], segs.slice(3).join('/')] }
  }

  throw new Error('Unsupported GitHub URL. Try a PR link, a file blob link, or a gist.')
}

async function fetchPullRequest(owner: string, repo: string, num: string): Promise<FetchedSource> {
  const pr = await gh(`/repos/${owner}/${repo}/pulls/${num}`)
  const files = await gh(`/repos/${owner}/${repo}/pulls/${num}/files?per_page=100`)

  // Concatenate the diffs of changed code files (skip binary/noise)
  let code = ''
  let truncated = false
  const skippedExt = ['.lock', '.svg', '.png', '.jpg', '.json']

  for (const f of files) {
    if (!f.patch) continue
    if (skippedExt.some((e) => f.filename.endsWith(e))) continue

    const chunk = `\n// ===== ${f.filename} (+${f.additions}/-${f.deletions}) =====\n${f.patch}\n`
    if (code.length + chunk.length > MAX_CHARS) {
      truncated = true
      break
    }
    code += chunk
  }

  if (!code) throw new Error('This PR has no reviewable code changes (merge commits only?)')

  return {
    kind: 'pull',
    title: `${pr.title} (#${num})`,
    language: files[0] ? detectLanguage(files[0].filename) : 'javascript',
    code,
    truncated,
  }
}

async function fetchFile(parts: string[]): Promise<FetchedSource> {
  const [owner, repo, refAndPath] = parts
  const slashIdx = refAndPath.indexOf('/')
  const ref = refAndPath.slice(0, slashIdx)
  const path = refAndPath.slice(slashIdx + 1)
  const filename = path.split('/').pop()!

  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`,
    { headers: ghHeaders() }
  )
  if (!res.ok) throw new Error(`Could not fetch file (${res.status})`)

  const full = await res.text()
  const truncated = full.length > MAX_CHARS

  return {
    kind: 'file',
    title: `${filename} @ ${ref}`,
    language: detectLanguage(filename),
    code: truncated ? full.slice(0, MAX_CHARS) : full,
    truncated,
  }
}

async function fetchGist(id: string): Promise<FetchedSource> {
  const gist = await gh(`/gists/${id}`)
  const fileEntry = Object.values(gist.files ?? {})[0] as any
  if (!fileEntry?.content) throw new Error('Gist has no readable file content')

  const filename = fileEntry.filename ?? 'gist.txt'
  const truncated = fileEntry.content.length > MAX_CHARS

  return {
    kind: 'gist',
    title: gist.description || filename,
    language: detectLanguage(filename),
    code: truncated ? fileEntry.content.slice(0, MAX_CHARS) : fileEntry.content,
    truncated,
  }
}

export async function fetchFromGitHubUrl(rawUrl: string): Promise<FetchedSource> {
  const { kind, parts } = parseUrl(rawUrl)
  switch (kind) {
    case 'pull': return fetchPullRequest(parts[0], parts[1], parts[2])
    case 'file': return fetchFile(parts)
    case 'gist': return fetchGist(parts[0])
  }
}
