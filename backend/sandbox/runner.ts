import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface TestCase {
  description: string
  input: string
  expectedOutput: string
}

interface TestResult {
  description: string
  passed: boolean
  expected: string
  actual: string
  error?: string
}

const TIMEOUT_MS = 5000

function runJavaScript(code: string, input: string): string {
  const wrappedCode = `
    const input = ${JSON.stringify(input)};
    ${code}
  `
  const tmpFile = path.join('/tmp', `test_${Date.now()}.js`)
  fs.writeFileSync(tmpFile, wrappedCode)
  try {
    return execSync(`node ${tmpFile}`, { timeout: TIMEOUT_MS, encoding: 'utf-8' }).trim()
  } finally {
    fs.unlinkSync(tmpFile)
  }
}

function runPython(code: string, input: string): string {
  const wrappedCode = `import sys\ninput_data = ${JSON.stringify(input)}\n${code}`
  const tmpFile = path.join('/tmp', `test_${Date.now()}.py`)
  fs.writeFileSync(tmpFile, wrappedCode)
  try {
    return execSync(`python3 ${tmpFile}`, { timeout: TIMEOUT_MS, encoding: 'utf-8' }).trim()
  } finally {
    fs.unlinkSync(tmpFile)
  }
}

const runners: Record<string, (code: string, input: string) => string> = {
  javascript: runJavaScript,
  python: runPython,
}

// Main
const inputPath = process.argv[2]
if (!inputPath) {
  console.error('Usage: runner <input.json>')
  process.exit(1)
}

const input = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
const { code, language, testCases } = input as {
  code: string
  language: string
  testCases: TestCase[]
}

const runner = runners[language]
if (!runner) {
  console.error(`Unsupported language: ${language}`)
  process.exit(1)
}

const results: TestResult[] = []

for (const tc of testCases) {
  try {
    const actual = runner(code, tc.input)
    results.push({
      description: tc.description,
      passed: actual === tc.expectedOutput.trim(),
      expected: tc.expectedOutput,
      actual,
    })
  } catch (err: any) {
    results.push({
      description: tc.description,
      passed: false,
      expected: tc.expectedOutput,
      actual: '',
      error: err.message?.slice(0, 200) || 'Execution error',
    })
  }
}

const passed = results.filter((r) => r.passed).length
const output = {
  total: results.length,
  passed,
  passRate: results.length > 0 ? passed / results.length : 0,
  results,
}

console.log(JSON.stringify(output))
