import {
  DEFAULT_EMAIL_DOMAIN,
  DEFAULT_EMAIL_FORMAT,
  STORE_KEYS
} from '@/lib/constants'
import { STORAGE_INSTANCE } from '@/lib/storage/storage-instance'
import { saveStorageValues } from '@/lib/storage/storage-values'

export type EmailDomainSettings = {
  domains: string[]
  activeDomain: string
  emailFormat: string
}

const emailDomainLabelPattern = /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i

export function normalizeEmailDomain(domain: string): string | null {
  const normalizedDomain = domain.trim().toLowerCase().replace(/\.$/, '')
  const labels = normalizedDomain.split('.')
  const isValidDomain =
    normalizedDomain.length <= 253 &&
    labels.length > 1 &&
    labels.every(
      (label) => label.length <= 63 && emailDomainLabelPattern.test(label)
    )

  return isValidDomain ? normalizedDomain : null
}

export function getEmailLocalPart(emailFormat: string): string {
  const separatorIndex = emailFormat.lastIndexOf('@')

  return separatorIndex === -1
    ? emailFormat
    : emailFormat.slice(0, separatorIndex)
}

function getFormatDomain(emailFormat: string): string | null {
  const separatorIndex = emailFormat.lastIndexOf('@')

  if (separatorIndex === -1) return null

  return normalizeEmailDomain(emailFormat.slice(separatorIndex + 1))
}

function replaceFormatDomain(emailFormat: string, domain: string): string {
  return `${getEmailLocalPart(emailFormat)}@${domain}`
}

function normalizeEmailDomains(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const normalizedDomains = new Set<string>()

  for (const domain of value as unknown[]) {
    if (typeof domain !== 'string') continue

    const normalizedDomain = normalizeEmailDomain(domain)

    if (normalizedDomain) normalizedDomains.add(normalizedDomain)
  }

  return [...normalizedDomains]
}

async function saveEmailDomainSettings(settings: EmailDomainSettings) {
  await saveStorageValues({
    [STORE_KEYS.EMAIL_DOMAINS]: settings.domains,
    [STORE_KEYS.ACTIVE_EMAIL_DOMAIN]: settings.activeDomain,
    [STORE_KEYS.EMAIL_FORMAT]: settings.emailFormat
  })
}

export async function initializeEmailDomainSettings(): Promise<EmailDomainSettings> {
  const [storedDomains, storedActiveDomain, storedEmailFormat] =
    await Promise.all([
      STORAGE_INSTANCE.get(STORE_KEYS.EMAIL_DOMAINS),
      STORAGE_INSTANCE.get(STORE_KEYS.ACTIVE_EMAIL_DOMAIN),
      STORAGE_INSTANCE.get(STORE_KEYS.EMAIL_FORMAT)
    ])

  const emailFormat =
    typeof storedEmailFormat === 'string' && storedEmailFormat.length > 0
      ? storedEmailFormat
      : DEFAULT_EMAIL_FORMAT
  const formatDomain = getFormatDomain(emailFormat)
  const domains = normalizeEmailDomains(storedDomains)
  const savedDomains =
    domains.length > 0 ? domains : [formatDomain ?? DEFAULT_EMAIL_DOMAIN]
  const normalizedActiveDomain =
    typeof storedActiveDomain === 'string'
      ? normalizeEmailDomain(storedActiveDomain)
      : null
  const activeDomain =
    normalizedActiveDomain && savedDomains.includes(normalizedActiveDomain)
      ? normalizedActiveDomain
      : formatDomain && savedDomains.includes(formatDomain)
        ? formatDomain
        : savedDomains[0] ?? DEFAULT_EMAIL_DOMAIN
  const alignedEmailFormat = replaceFormatDomain(emailFormat, activeDomain)
  const settings = {
    domains: savedDomains,
    activeDomain,
    emailFormat: alignedEmailFormat
  }

  await saveEmailDomainSettings(settings)

  return settings
}

export async function setActiveEmailDomain(
  domain: string,
  emailFormat?: string
): Promise<EmailDomainSettings> {
  const normalizedDomain = normalizeEmailDomain(domain)

  if (!normalizedDomain) throw new Error('invalid-email-domain')

  const settings = await initializeEmailDomainSettings()

  if (!settings.domains.includes(normalizedDomain)) {
    throw new Error('unknown-email-domain')
  }

  const updatedSettings = {
    ...settings,
    activeDomain: normalizedDomain,
    emailFormat: replaceFormatDomain(
      emailFormat ?? settings.emailFormat,
      normalizedDomain
    )
  }

  await saveEmailDomainSettings(updatedSettings)

  return updatedSettings
}

export async function addEmailDomain(
  domain: string,
  emailFormat?: string
): Promise<EmailDomainSettings> {
  const normalizedDomain = normalizeEmailDomain(domain)

  if (!normalizedDomain) throw new Error('invalid-email-domain')

  const settings = await initializeEmailDomainSettings()

  if (settings.domains.includes(normalizedDomain)) {
    throw new Error('duplicate-email-domain')
  }

  const updatedSettings = {
    domains: [...settings.domains, normalizedDomain],
    activeDomain: normalizedDomain,
    emailFormat: replaceFormatDomain(
      emailFormat ?? settings.emailFormat,
      normalizedDomain
    )
  }

  await saveEmailDomainSettings(updatedSettings)

  return updatedSettings
}

export async function removeEmailDomain(
  domain: string,
  emailFormat?: string
): Promise<EmailDomainSettings> {
  const normalizedDomain = normalizeEmailDomain(domain)

  if (!normalizedDomain) throw new Error('invalid-email-domain')

  const settings = await initializeEmailDomainSettings()

  if (settings.domains.length <= 1) throw new Error('last-email-domain')

  const domains = settings.domains.filter(
    (savedDomain) => savedDomain !== normalizedDomain
  )
  const activeDomain =
    settings.activeDomain === normalizedDomain
      ? domains[0] ?? DEFAULT_EMAIL_DOMAIN
      : settings.activeDomain
  const updatedSettings = {
    domains,
    activeDomain,
    emailFormat: replaceFormatDomain(
      emailFormat ?? settings.emailFormat,
      activeDomain
    )
  }

  await saveEmailDomainSettings(updatedSettings)

  return updatedSettings
}
