import {
  DEFAULT_EMAIL_FORMAT,
  MAX_EMAIL_FORMATS,
  STORE_KEYS
} from '@/lib/constants'
import {
  getEmailLocalPart,
  initializeEmailDomainSettings,
  type EmailDomainSettings
} from '@/lib/storage/email-domains'
import { STORAGE_INSTANCE } from '@/lib/storage/storage-instance'
import { saveStorageValues } from '@/lib/storage/storage-values'

export type EmailFormatSettings = EmailDomainSettings & {
  formats: string[]
  activeFormat: string
}

function normalizeEmailPattern(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const pattern = value.trim()
  return /^[^\s@]+$/.test(pattern) ? pattern : null
}

function requireEmailPattern(value: string): string {
  const pattern = normalizeEmailPattern(value)
  if (!pattern) throw new Error('invalid-email-format')
  return pattern
}

async function saveSettings(settings: EmailFormatSettings) {
  await saveStorageValues({
    [STORE_KEYS.EMAIL_FORMATS]: settings.formats,
    [STORE_KEYS.ACTIVE_EMAIL_FORMAT]: settings.activeFormat,
    [STORE_KEYS.EMAIL_FORMAT]: settings.emailFormat
  })
  return settings
}

export async function initializeEmailFormatSettings(): Promise<EmailFormatSettings> {
  const domainSettings = await initializeEmailDomainSettings()
  const [storedFormats, storedActiveFormat] = await Promise.all([
    STORAGE_INSTANCE.get(STORE_KEYS.EMAIL_FORMATS),
    STORAGE_INSTANCE.get(STORE_KEYS.ACTIVE_EMAIL_FORMAT)
  ])
  const formats = Array.isArray(storedFormats)
    ? [
        ...new Set(
          storedFormats
            .map(normalizeEmailPattern)
            .filter((pattern): pattern is string => pattern !== null)
        )
      ].slice(0, MAX_EMAIL_FORMATS)
    : []
  const currentPattern = normalizeEmailPattern(
    getEmailLocalPart(domainSettings.emailFormat)
  )

  // Import the legacy pattern on first migration or when no usable presets remain.
  // Once presets exist, a stale generation string must not revive a deleted one.
  if (
    currentPattern &&
    (!Array.isArray(storedFormats) || formats.length === 0) &&
    !formats.includes(currentPattern) &&
    formats.length < MAX_EMAIL_FORMATS
  ) {
    formats.push(currentPattern)
  }
  if (formats.length === 0)
    formats.push(getEmailLocalPart(DEFAULT_EMAIL_FORMAT))

  const savedActivePattern = normalizeEmailPattern(storedActiveFormat)
  const activeFormat =
    savedActivePattern && formats.includes(savedActivePattern)
      ? savedActivePattern
      : currentPattern && formats.includes(currentPattern)
        ? currentPattern
        : formats[0]!

  return saveSettings({
    ...domainSettings,
    formats,
    activeFormat,
    emailFormat: `${activeFormat}@${domainSettings.activeDomain}`
  })
}

export async function setActiveEmailFormat(
  format: string
): Promise<EmailFormatSettings> {
  const pattern = requireEmailPattern(format)
  const settings = await initializeEmailFormatSettings()
  if (!settings.formats.includes(pattern))
    throw new Error('unknown-email-format')
  return saveSettings({
    ...settings,
    activeFormat: pattern,
    emailFormat: `${pattern}@${settings.activeDomain}`
  })
}

export async function addEmailFormat(
  format: string
): Promise<EmailFormatSettings> {
  const pattern = requireEmailPattern(format)
  const settings = await initializeEmailFormatSettings()
  if (settings.formats.includes(pattern))
    throw new Error('duplicate-email-format')
  if (settings.formats.length >= MAX_EMAIL_FORMATS)
    throw new Error('email-format-limit')
  return saveSettings({
    ...settings,
    formats: [...settings.formats, pattern],
    activeFormat: pattern,
    emailFormat: `${pattern}@${settings.activeDomain}`
  })
}

export async function updateEmailFormat(
  format: string,
  originalFormat?: string
): Promise<EmailFormatSettings> {
  const pattern = requireEmailPattern(format)
  const settings = await initializeEmailFormatSettings()
  const target = originalFormat ?? settings.activeFormat
  if (!settings.formats.includes(target))
    throw new Error('email-format-changed')
  if (pattern !== target && settings.formats.includes(pattern)) {
    throw new Error('duplicate-email-format')
  }
  return saveSettings({
    ...settings,
    formats: settings.formats.map((saved) =>
      saved === target ? pattern : saved
    ),
    activeFormat: pattern,
    emailFormat: `${pattern}@${settings.activeDomain}`
  })
}

export async function removeEmailFormat(
  format: string
): Promise<EmailFormatSettings> {
  const pattern = requireEmailPattern(format)
  const settings = await initializeEmailFormatSettings()
  if (!settings.formats.includes(pattern))
    throw new Error('unknown-email-format')
  if (settings.formats.length <= 1) throw new Error('last-email-format')
  const formats = settings.formats.filter((saved) => saved !== pattern)
  const activeFormat =
    settings.activeFormat === pattern ? formats[0]! : settings.activeFormat
  return saveSettings({
    ...settings,
    formats,
    activeFormat,
    emailFormat: `${activeFormat}@${settings.activeDomain}`
  })
}
