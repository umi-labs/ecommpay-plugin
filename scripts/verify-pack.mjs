#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const repoRoot = process.cwd()
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'))
const pkgName = pkg.name

console.log(`[verify-pack] Packing ${pkgName}@${pkg.version}…`)
const packOutput = execSync('pnpm pack --pack-destination .', { cwd: repoRoot }).toString().trim()
const tarballName = packOutput.split('\n').filter(Boolean).pop()
const tarballPath = join(repoRoot, tarballName)
console.log(`[verify-pack] Tarball: ${tarballPath}`)

const sandbox = mkdtempSync(join(tmpdir(), 'verify-pack-'))
try {
  execSync(`npm init -y`, { cwd: sandbox, stdio: 'ignore' })
  execSync(`npm install --no-save --ignore-scripts --legacy-peer-deps "${tarballPath}"`, {
    cwd: sandbox,
    stdio: 'inherit',
  })

  const installedPkgDir = join(sandbox, 'node_modules', ...pkgName.split('/'))
  const installedPkg = JSON.parse(readFileSync(join(installedPkgDir, 'package.json'), 'utf8'))

  const stringified = JSON.stringify({
    exports: installedPkg.exports,
    main: installedPkg.main,
    types: installedPkg.types,
  })
  if (stringified.includes('./src/')) {
    console.error('[verify-pack] FAIL: installed package.json references ./src/ paths:')
    console.error(stringified)
    process.exit(1)
  }

  const errors = []
  const checkRelativePath = (label, relPath) => {
    if (!relPath || typeof relPath !== 'string') return
    if (!relPath.startsWith('./')) {
      errors.push(`${label}: expected a relative path starting with "./", got "${relPath}"`)
      return
    }
    const absPath = join(installedPkgDir, relPath)
    if (!existsSync(absPath)) {
      errors.push(`${label}: file does not exist in tarball: ${relPath}`)
    } else {
      console.log(`[verify-pack]   OK ${label} -> ${relPath}`)
    }
  }

  const walkExports = (node, prefix) => {
    if (!node) return
    if (typeof node === 'string') {
      checkRelativePath(prefix, node)
      return
    }
    if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        walkExports(value, `${prefix}[${key}]`)
      }
    }
  }

  console.log(`[verify-pack] Checking installed entrypoint files in ${installedPkgDir}…`)
  walkExports(installedPkg.exports, 'exports')
  checkRelativePath('main', installedPkg.main)
  checkRelativePath('types', installedPkg.types)

  if (errors.length > 0) {
    console.error('[verify-pack] FAIL:')
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }

  const subpaths = Object.keys(installedPkg.exports ?? { '.': '.' })
  for (const sub of subpaths) {
    const specifier = sub === '.' ? pkgName : `${pkgName}/${sub.replace(/^\.\//, '')}`
    const resolved = execSync(
      `node --input-type=module -e "console.log(import.meta.resolve('${specifier}'))"`,
      { cwd: sandbox },
    )
      .toString()
      .trim()
    if (resolved.includes('/src/')) {
      errors.push(`${specifier} resolved to a /src/ path: ${resolved}`)
    } else {
      console.log(`[verify-pack]   OK ${specifier} -> ${resolved}`)
    }
  }

  if (errors.length > 0) {
    console.error('[verify-pack] FAIL:')
    for (const e of errors) console.error('  - ' + e)
    process.exit(1)
  }

  console.log('[verify-pack] All entrypoints resolved successfully.')
} finally {
  rmSync(sandbox, { recursive: true, force: true })
  rmSync(tarballPath, { force: true })
}
