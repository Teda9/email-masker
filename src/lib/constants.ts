export const STORE_KEYS = {
  EMAIL_FORMAT: 'em_email_format',
  EMAIL_FORMATS: 'em_email_formats',
  ACTIVE_EMAIL_FORMAT: 'em_active_email_format',
  EMAIL_DOMAINS: 'em_email_domains',
  ACTIVE_EMAIL_DOMAIN: 'em_active_email_domain',
  AUTOFILL: 'em_autofill',
  EXCLUDE_LIST: 'em_exclude_list',
  EXCLUDE_LIST_PATTERNS: 'em_exclude_list_patterns',
  THEME: 'em_theme'
}

export const DEFAULT_EMAIL_DOMAIN = 'example.com'
export const DEFAULT_EMAIL_FORMAT = `[domain].[random:5]@${DEFAULT_EMAIL_DOMAIN}`
export const MAX_EMAIL_FORMATS = 10
