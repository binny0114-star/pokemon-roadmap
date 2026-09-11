import { readFile } from 'node:fs/promises'

const registryUrl = new URL('../src/data/version-registry.json', import.meta.url)
export const registry = JSON.parse(await readFile(registryUrl, 'utf8'))
export const revision = registry.source.revision
export const csvBase = `${registry.source.repository}/raw/${revision}/data/v2/csv`
export const legacyPlannerSnapshot = registry.legacyPlannerSnapshot

export const catalogVersionIds = [
  ...new Set(registry.games.flatMap((game) => game.sourceVersionIds ?? [game.versionId])),
].sort((a, b) => a - b)

export const catalogVersionGroupIds = [
  ...new Set(registry.games.flatMap((game) => game.dataVersionGroupIds)),
].sort((a, b) => a - b)

export const plannerVersionIds = [
  ...new Set(
    registry.games
      .filter((game) => game.plannerSupport.status === 'full')
      .map((game) => game.versionId),
  ),
].sort((a, b) => a - b)

export const plannerVersionGroupIds = [
  ...new Set(
    registry.games
      .filter((game) => game.plannerSupport.status === 'full')
      .map((game) => game.versionGroupId),
  ),
].sort((a, b) => a - b)

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }
  const [headers, ...values] = rows
  return values
    .filter((value) => value.length === headers.length)
    .map((value) => Object.fromEntries(headers.map((header, index) => [header, value[index]])))
}

export async function fetchCsv(name) {
  const response = await fetch(`${csvBase}/${name}.csv`)
  if (!response.ok) throw new Error(`${name}.csv: ${response.status}`)
  return parseCsv(await response.text())
}

export async function fetchLegacyPlannerSnapshot(path) {
  const base = `${legacyPlannerSnapshot.repository}/raw/${legacyPlannerSnapshot.revision}`
  const response = await fetch(`${base}/${path}`)
  if (!response.ok) throw new Error(`legacy planner snapshot ${path}: ${response.status}`)
  return response.json()
}

export function provenance(files) {
  return {
    source: registry.source.name,
    repository: registry.source.repository,
    revision,
    files: files.map((file) => `data/v2/csv/${file}.csv`),
    compatibilitySnapshot: legacyPlannerSnapshot,
  }
}
