const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const test = require('node:test')
const ts = require('typescript')

// Only the browser storage boundary is replaced; exercise the actual source modules.
function createSettings(seed = {}) {
  const values = new Map(Object.entries(seed))
  const writes = []
  const batches = []
  let failNextWrite = false
  async function commit(entries) {
    if (failNextWrite) {
      failNextWrite = false
      throw new Error('storage-write-failed')
    }
    batches.push(Object.keys(entries))
    for (const [key, value] of Object.entries(entries)) {
      values.set(key, structuredClone(value))
      writes.push(key)
    }
  }
  const storage = {
    async get(key) {
      return structuredClone(values.get(key))
    },
    async set(key, value) {
      await commit({ [key]: value })
    },
    getNamespacedKey(key) {
      return key
    },
    isCopied() {
      return false
    },
    primaryClient: {
      async set(entries) {
        await commit(
          Object.fromEntries(
            Object.entries(entries).map(([key, value]) => [
              key,
              JSON.parse(value)
            ])
          )
        )
      }
    }
  }
  const modules = new Map([
    ['@/lib/storage/storage-instance', { STORAGE_INSTANCE: storage }]
  ])
  function load(name) {
    if (modules.has(name)) return modules.get(name)
    const path = resolve(__dirname, '../src', name.slice(2) + '.ts')
    if (!existsSync(path)) return {}
    const module = { exports: {} }
    const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    })
    new Function('require', 'module', 'exports', outputText)(
      (dependency) =>
        dependency.startsWith('@/') ? load(dependency) : require(dependency),
      module,
      module.exports
    )
    modules.set(name, module.exports)
    return module.exports
  }
  const api = load('@/lib/storage/email-formats')
  assert.equal(
    typeof api.initializeEmailFormatSettings,
    'function',
    'Saved email formats must have a migration and initialization API'
  )
  return {
    api,
    domains: load('@/lib/storage/email-domains'),
    values,
    writes,
    batches,
    failNextWrite() {
      failNextWrite = true
    }
  }
}

test('upgrades an existing custom format without changing its email domain', async () => {
  const { api, values } = createSettings({
    em_email_format: 'prefix-[random:8]@private.org'
  })
  const settings = await api.initializeEmailFormatSettings()
  assert.deepEqual(settings.formats, ['prefix-[random:8]'])
  assert.equal(settings.activeFormat, 'prefix-[random:8]')
  assert.equal(settings.activeDomain, 'private.org')
  assert.equal(values.get('em_email_format'), 'prefix-[random:8]@private.org')
})

test('format and domain selections remain independent after reopening', async () => {
  const { api, domains, values } = createSettings({
    em_email_format: '[domain].[random:5]@one.org'
  })
  await api.addEmailFormat('[words:2][numbers:3]')
  await domains.addEmailDomain('two.org', values.get('em_email_format'))
  const selected = await api.setActiveEmailFormat('[domain].[random:5]')
  assert.equal(selected.emailFormat, '[domain].[random:5]@two.org')
  const reopened = await api.initializeEmailFormatSettings()
  assert.deepEqual(reopened.formats, [
    '[domain].[random:5]',
    '[words:2][numbers:3]'
  ])
  assert.equal(reopened.activeFormat, '[domain].[random:5]')
  assert.equal(reopened.activeDomain, 'two.org')
  assert.deepEqual(reopened.domains, ['one.org', 'two.org'])
})

test('updating the selected preset preserves all other saved formats', async () => {
  const { api, values } = createSettings({ em_email_format: 'first@one.org' })
  await api.addEmailFormat('second')
  const updated = await api.updateEmailFormat(' second-[random:6] ')
  assert.deepEqual(updated.formats, ['first', 'second-[random:6]'])
  assert.equal(updated.activeFormat, 'second-[random:6]')
  assert.equal(values.get('em_email_format'), 'second-[random:6]@one.org')
})

test('rejects duplicate or invalid formats without changing the active email', async () => {
  const { api, values } = createSettings({ em_email_format: 'first@one.org' })
  await api.addEmailFormat('second')
  await assert.rejects(api.addEmailFormat(' first '), /duplicate-email-format/)
  await assert.rejects(api.updateEmailFormat('first'), /duplicate-email-format/)
  for (const invalid of ['', 'has space', 'full@other.org']) {
    await assert.rejects(api.addEmailFormat(invalid), /invalid-email-format/)
  }
  assert.equal(values.get('em_email_format'), 'second@one.org')
})

test('allows ten saved formats but rejects an eleventh', async () => {
  const { api, values } = createSettings({ em_email_format: 'format1@one.org' })
  for (let index = 2; index <= 10; index++) {
    await api.addEmailFormat(`format${index}`)
  }
  await assert.rejects(api.addEmailFormat('format11'), /email-format-limit/)
  assert.equal(values.get('em_email_formats').length, 10)
  assert.equal(values.get('em_email_format'), 'format10@one.org')
})

test('deleting the active format selects a remaining format and keeps the domain', async () => {
  const { api, values } = createSettings({ em_email_format: 'first@one.org' })
  await api.addEmailFormat('second')
  const removed = await api.removeEmailFormat('second')
  assert.deepEqual(removed.formats, ['first'])
  assert.equal(removed.activeFormat, 'first')
  assert.equal(values.get('em_email_format'), 'first@one.org')
  await assert.rejects(api.removeEmailFormat('first'), /last-email-format/)
})

test('opening an already migrated popup does not rewrite synced settings', async () => {
  const { api, writes } = createSettings({ em_email_format: 'first@one.org' })
  await api.initializeEmailFormatSettings()
  writes.length = 0
  await api.initializeEmailFormatSettings()
  assert.equal(writes.length, 0)
})

test('unknown selections cannot replace the active format', async () => {
  const { api, values } = createSettings({ em_email_format: 'first@one.org' })
  await api.initializeEmailFormatSettings()
  await assert.rejects(
    api.setActiveEmailFormat('not-saved'),
    /unknown-email-format/
  )
  await assert.rejects(
    api.removeEmailFormat('not-saved'),
    /unknown-email-format/
  )
  assert.equal(values.get('em_email_format'), 'first@one.org')
})

test('domain controls retain the saved pattern when no edited draft is supplied', async () => {
  const { api, domains, values } = createSettings({
    em_email_format: 'first@one.org'
  })
  await api.addEmailFormat('second')
  await domains.addEmailDomain('two.org')
  assert.equal(values.get('em_email_format'), 'second@two.org')
  await domains.setActiveEmailDomain('one.org')
  assert.equal(values.get('em_email_format'), 'second@one.org')
  await domains.removeEmailDomain('one.org')
  assert.equal(values.get('em_email_format'), 'second@two.org')
  assert.deepEqual(values.get('em_email_formats'), ['first', 'second'])
})

test('recovers usable presets from malformed or duplicated stored entries', async () => {
  const { api } = createSettings({
    em_email_format: 'current@one.org',
    em_email_formats: [null, 12, '', ' spaced value ', ' current ', 'current'],
    em_active_email_format: 'missing'
  })
  const settings = await api.initializeEmailFormatSettings()
  assert.deepEqual(settings.formats, ['current'])
  assert.equal(settings.activeFormat, 'current')
  assert.equal(settings.emailFormat, 'current@one.org')
})

test('commits related preset keys together and leaves them unchanged if saving fails', async () => {
  const { api, values, batches, failNextWrite } = createSettings({
    em_email_format: 'first@one.org'
  })
  await api.addEmailFormat('second')
  batches.length = 0
  await api.removeEmailFormat('second')
  assert.equal(batches.length, 1)
  assert.deepEqual(
    new Set(batches[0]),
    new Set(['em_email_formats', 'em_active_email_format', 'em_email_format'])
  )
  const before = structuredClone(Object.fromEntries(values))
  failNextWrite()
  await assert.rejects(
    api.updateEmailFormat('replacement'),
    /storage-write-failed/
  )
  assert.deepEqual(Object.fromEntries(values), before)
})

test('already migrated settings do not reimport a stale generation pattern', async () => {
  const { api } = createSettings({
    em_email_format: 'deleted@one.org',
    em_email_formats: ['kept'],
    em_active_email_format: 'kept'
  })
  const reopened = await api.initializeEmailFormatSettings()
  assert.deepEqual(reopened.formats, ['kept'])
  assert.equal(reopened.emailFormat, 'kept@one.org')
})

test('updating an explicitly displayed pattern never overwrites a newly synced selection', async () => {
  const { api, values } = createSettings({ em_email_format: 'first@one.org' })
  await api.addEmailFormat('second')
  const updated = await api.updateEmailFormat('edited-first', 'first')
  assert.deepEqual(updated.formats, ['edited-first', 'second'])
  await assert.rejects(
    api.updateEmailFormat('stale-edit', 'first'),
    /email-format-changed/
  )
  assert.deepEqual(values.get('em_email_formats'), ['edited-first', 'second'])
})
