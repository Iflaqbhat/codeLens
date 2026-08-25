import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface TestCase {
  description: string
  input: string
  expectedOutput: string
}

export interface SandboxResult {
  total: number
  passed: number
  passRate: number
  results: {
    description: string
    passed: boolean
    expected: string
    actual: string
    error?: string
  }[]
}

export function runInSandbox(code: string, language: string, testCases: TestCase[]): SandboxResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-'))
  const inputFile = path.join(tmpDir, 'input.json')
  const outputFile = path.join(tmpDir, 'output.json')

  try {
    // Write input for the runner
    fs.writeFileSync(inputFile, JSON.stringify({ code, language, testCases }))

    // Run Docker with strict limits
    const dockerCmd = [
      'docker run --rm',
      '--network none',                    // No network access
      '--memory 256m',                     // Max 256MB RAM
      '--cpus 0.5',                        // Max 0.5 CPU
      '--read-only',                       // Read-only filesystem
      '--tmpfs /tmp:size=50m',             // 50MB writable tmp
      `--volume ${inputFile}:/input.json:ro`,
      `code-review-sandbox`,              // Image name
      'npx tsx runner.ts /input.json',
    ].join(' ')

    const output = execSync(dockerCmd, {
      timeout: 15000,  // 15s total timeout
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    // Parse the last line (JSON output)
    const lines = output.trim().split('\n')
    const jsonLine = lines[lines.length - 1]
    return JSON.parse(jsonLine) as SandboxResult
  } catch (error: any) {
    return {
      total: testCases.length,
      passed: 0,
      passRate: 0,
      results: testCases.map((tc) => ({
        description: tc.description,
        passed: false,
        expected: tc.expectedOutput,
        actual: '',
        error: error.message?.slice(0, 200) || 'Sandbox execution failed',
      })),
    }
  } finally {
    // Clean up temp files
    try { fs.rmSync(tmpDir, { recursive: true }) } catch {}
  }
}
