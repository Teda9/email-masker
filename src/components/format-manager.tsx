import { Mail, Plus, Save, Tags, Trash2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import EmailDomainManager from '@/components/email-domain-manager'
import Info from '@/components/info'
import { Badge, Button, Input, Label } from '@/components/ui'
import { MAX_EMAIL_FORMATS } from '@/lib/constants'
import {
  addEmailDomain,
  removeEmailDomain,
  setActiveEmailDomain,
  type EmailDomainSettings
} from '@/lib/storage/email-domains'
import {
  addEmailFormat,
  initializeEmailFormatSettings,
  removeEmailFormat,
  setActiveEmailFormat,
  updateEmailFormat,
  type EmailFormatSettings
} from '@/lib/storage/email-formats'
import { lang } from '@/lib/utils'

const shortcodes = {
  domain: lang('shortcodeDomainDesc'),
  'random:length': lang('shortcodeRandomDesc'),
  'words:length': lang('shortcodeWordsDesc'),
  'numbers:length': lang('shortcodeNumbersDesc')
}

const errorMessages: Record<string, string> = {
  'invalid-email-domain': 'invalidEmailDomainToastDesc',
  'duplicate-email-domain': 'duplicateEmailDomainToastDesc',
  'last-email-domain': 'keepOneEmailDomainToastDesc',
  'invalid-email-format': 'invalidEmailFormatToastDesc',
  'duplicate-email-format': 'duplicateEmailFormatToastDesc',
  'email-format-limit': 'emailFormatLimitToastDesc',
  'last-email-format': 'keepOneEmailFormatToastDesc',
  'email-format-changed': 'emailFormatChangedToastDesc'
}

export default function FormatManager() {
  const [settings, setSettings] = useState<EmailFormatSettings | null>(null)
  const [draftPattern, setDraftPattern] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const actionInFlight = useRef(false)
  const emailInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let isMounted = true
    setLoadError(false)
    void initializeEmailFormatSettings()
      .then((loaded) => {
        if (!isMounted) return
        setSettings(loaded)
        setDraftPattern(loaded.activeFormat)
      })
      .catch(() => {
        if (isMounted) setLoadError(true)
      })
    return () => {
      isMounted = false
    }
  }, [loadAttempt])

  const performAction = async (
    action: () => Promise<EmailDomainSettings | EmailFormatSettings>,
    resetDraft: boolean,
    successMessage?: string
  ): Promise<boolean> => {
    if (actionInFlight.current) return false
    actionInFlight.current = true
    setIsBusy(true)
    try {
      const updated = await action()
      setSettings((previous) => (previous ? { ...previous, ...updated } : null))
      if (resetDraft && 'activeFormat' in updated)
        setDraftPattern(updated.activeFormat)
      if (successMessage) toast.success(lang(successMessage))
      return true
    } catch (error) {
      if (error instanceof Error && error.message === 'email-format-changed') {
        try {
          setSettings(await initializeEmailFormatSettings())
        } catch {
          // Retain the draft so a temporary storage failure cannot lose edits.
        }
      }
      const key =
        error instanceof Error ? errorMessages[error.message] : undefined
      toast.error(lang(key ?? 'settingsStorageError'))
      return false
    } finally {
      actionInFlight.current = false
      setIsBusy(false)
    }
  }

  const onShortcodeClick = (shortcode: string) => {
    setDraftPattern((previous) => `[${shortcode}]${previous}`)
    emailInputRef.current?.focus()
    toast.success(lang('shortcodeAddedToast'))
  }

  if (!settings) {
    return (
      <div role="status" className="grid gap-2 text-sm text-muted-foreground">
        <p>{lang(loadError ? 'settingsLoadError' : 'settingsLoading')}</p>
        {loadError && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLoadAttempt((previous) => previous + 1)
            }}>
            {lang('retryButton')}
          </Button>
        )}
      </div>
    )
  }

  const isDirty = draftPattern.trim() !== settings.activeFormat
  const canSaveAsNew =
    draftPattern.trim().length > 0 &&
    !settings.formats.includes(draftPattern.trim()) &&
    settings.formats.length < MAX_EMAIL_FORMATS

  return (
    <>
      <EmailDomainManager
        settings={settings}
        disabled={isBusy}
        onSelect={(domain) =>
          performAction(() => setActiveEmailDomain(domain), false)
        }
        onAdd={(domain) =>
          performAction(
            () => addEmailDomain(domain),
            false,
            'emailDomainAddedToast'
          )
        }
        onRemove={() =>
          performAction(
            () => removeEmailDomain(settings.activeDomain),
            false,
            'emailDomainRemovedToast'
          )
        }
      />

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="email-format-preset"
            className="flex items-center gap-1.5">
            <Mail size={20} strokeWidth={1.5} /> {lang('emailFormatLabel')}
          </Label>
          <Badge variant="secondary" title={lang('emailFormatLimitToastDesc')}>
            {settings.formats.length}/{MAX_EMAIL_FORMATS}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <select
            id="email-format-preset"
            aria-label={lang('savedEmailFormatsLabel')}
            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={settings.activeFormat}
            onChange={(event) => {
              const selected = event.target.value
              void performAction(() => setActiveEmailFormat(selected), true)
            }}
            disabled={isBusy}>
            {settings.formats.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
          <Info title={lang('removeEmailFormatTooltip')}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={lang('removeEmailFormatTooltip')}
              onClick={() => {
                void performAction(
                  () => removeEmailFormat(settings.activeFormat),
                  true,
                  'emailFormatRemovedToast'
                )
              }}
              disabled={isBusy || settings.formats.length <= 1}>
              <Trash2 size={18} className="text-destructive" />
            </Button>
          </Info>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (isDirty)
              void performAction(
                () => updateEmailFormat(draftPattern, settings.activeFormat),
                true,
                'emailFormatUpdatedToast'
              )
          }}>
          <Input
            id="email-pattern"
            type="text"
            className="min-w-0 font-mono"
            aria-label={lang('emailFormatPatternLabel')}
            aria-describedby="email-format-help"
            value={draftPattern}
            onChange={(event) => {
              setDraftPattern(event.target.value)
            }}
            ref={emailInputRef}
            disabled={isBusy}
          />
          <Info title={lang('saveEmailFormatTooltip')}>
            <Button
              type="submit"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={lang('saveEmailFormatTooltip')}
              disabled={isBusy || !isDirty}>
              <Save size={20} className="text-blue-500" />
            </Button>
          </Info>
        </form>

        <div className="flex items-start justify-between gap-3">
          <div
            id="email-format-help"
            className="min-w-0 text-xs text-muted-foreground">
            <p className="break-all font-mono">@{settings.activeDomain}</p>
            <p className={isDirty ? 'text-orange-500' : ''}>
              {lang(
                isDirty ? 'emailFormatUnsavedHint' : 'emailFormatSharedHint'
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => {
              void performAction(
                () => addEmailFormat(draftPattern),
                true,
                'emailFormatAddedToast'
              )
            }}
            disabled={isBusy || !canSaveAsNew}>
            <Plus size={16} /> {lang('saveEmailFormatAsNew')}
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="flex items-center gap-1.5">
          <Tags size={20} strokeWidth={1.5} /> {lang('shortcodesLabel')}
        </Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(shortcodes).map(([shortcode, description]) => (
            <Info key={shortcode} title={description}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                disabled={isBusy}
                onClick={() => {
                  onShortcodeClick(shortcode)
                }}>
                {`[${shortcode}]`}
              </Button>
            </Info>
          ))}
        </div>
      </div>
    </>
  )
}
