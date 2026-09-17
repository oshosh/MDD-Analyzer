import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rootAgentsPath = resolve(repositoryRoot, 'AGENTS.md')
const antigravityAgentsPath = resolve(repositoryRoot, '.agents', 'AGENTS.md')
const antigravitySettingsPath = resolve(repositoryRoot, '.agents', 'settings.json')

function fail(message) {
  console.error(`✗ ${message}`)
  process.exitCode = 1
}

function readRequiredFile(path, label) {
  if (!existsSync(path)) {
    fail(`${label} 파일을 찾을 수 없습니다: ${path}`)
    return ''
  }

  return readFileSync(path, 'utf8')
}

function parseJsonWithLineComments(source) {
  return JSON.parse(source.replace(/^\s*\/\/.*$/gm, ''))
}

function collectTextValues(value) {
  if (typeof value === 'string') {
    return [value]
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectTextValues)
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectTextValues)
  }

  return []
}

const rootAgents = readRequiredFile(rootAgentsPath, 'Codex 지침')
const antigravityAgents = readRequiredFile(antigravityAgentsPath, 'Antigravity 지침')
const antigravitySettings = readRequiredFile(antigravitySettingsPath, 'Antigravity 설정')

if (!rootAgents || !antigravityAgents || !antigravitySettings) {
  process.exit(1)
}

if (!rootAgents.includes('Antigravity와 Codex가 하나의 개발 지침을 함께 사용합니다.')) {
  fail('루트 AGENTS.md에 두 하네스의 공용 지침 선언이 없습니다.')
}

if (!rootAgents.includes('.agents/AGENTS.md')) {
  fail('루트 AGENTS.md가 Antigravity의 원본 지침을 가리키지 않습니다.')
}

let settings
try {
  settings = parseJsonWithLineComments(antigravitySettings)
} catch (error) {
  fail(`.agents/settings.json을 JSONC로 해석할 수 없습니다: ${error.message}`)
}

if (!settings?.context?.fileName?.includes('AGENTS.md')) {
  fail('Antigravity 설정이 AGENTS.md를 컨텍스트 파일로 지정하지 않습니다.')
}

const referencedRules = [...antigravityAgents.matchAll(/^@(.+)$/gm)].map((match) => match[1])
for (const rulePath of referencedRules) {
  if (!existsSync(resolve(repositoryRoot, rulePath))) {
    fail(`Antigravity 원본 지침이 참조하는 규칙 파일이 없습니다: ${rulePath}`)
  }
}

const promptInput = spawnSync(
  'codex',
  ['debug', 'prompt-input', '에이전트 지침 주입 검증 전용입니다.'],
  { cwd: repositoryRoot, encoding: 'utf8', timeout: 30_000 },
)

if (promptInput.error) {
  fail(`Codex 하네스를 실행할 수 없습니다: ${promptInput.error.message}`)
} else if (promptInput.status !== 0) {
  fail(`Codex 하네스가 실패했습니다: ${promptInput.stderr.trim()}`)
} else {
  try {
    const modelInput = JSON.parse(promptInput.stdout)
    const textValues = collectTextValues(modelInput)

    if (!textValues.some((value) => value.includes('agents_md.instructions'))) {
      fail('Codex 모델 입력에서 AGENTS.md 주입 항목을 찾지 못했습니다.')
    }

    if (!textValues.some((value) => value.includes(rootAgents))) {
      fail('Codex 모델 입력에 저장소 루트 AGENTS.md 본문이 주입되지 않았습니다.')
    }
  } catch (error) {
    fail(`Codex 모델 입력을 JSON으로 해석할 수 없습니다: ${error.message}`)
  }
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log('✓ Antigravity 설정, 원본 규칙 참조, Codex 런타임 지침 주입을 모두 확인했습니다.')
