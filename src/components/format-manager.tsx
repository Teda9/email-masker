import { AtSign, Mail, Plus, Save, Tags, Trash2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useStorage } from '@plasmohq/storage/hook'
import Info from '@/components/info'
import { Badge, Button, Input, Label } from '@/components/ui'
import { DEFAULT_EMAIL_DOMAIN } from '@/lib/constants'
import {
  DEFAULT_EMAIL_FORMAT,
  STORAGE_EMAIL_FORMAT,
  setEmailFormat
} from '@/lib/storage/email-format'
import {
  addEmailDomain,
  getEmailLocalPart,
  initializeEmailDomainSettings,
  normalizeEmailDomain,
  removeEmailDomain,
  setActiveEmailDomain,
  type EmailDomainSettings
} from '@/lib/storage/email-domains'
import { isEmail, lang } from '@/lib/utils'

const shortcodes = {
  domain: lang('shortcodeDomainDesc'),
  'random:length': lang('shortcodeRandomDesc'),
  'words:length': lang('shortcodeWordsDesc'),
  'numbers:length': lang('shortcodeNumbersDesc')
}

export default function FormatManager() {
  const [emailFormat, , { setRenderValue }] = useStorage(
    STORAGE_EMAIL_FORMAT,
    DEFAULT_EMAIL_FORMAT
  )
  const [emailDomains, setEmailDomains] = useState<string[]>([])
  const [activeEmailDomain, setActiveEmailDomainValue] = useState('')
  const [newEmailDomain, setNewEmailDomain] = useState('')
  const [isReady, setIsReady] = useState(false)
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const setRenderValueRef = useRef(setRenderValue)
  const emailFormatLocalPart = getEmailLocalPart(emailFormat)
  setRenderValueRef.current = setRenderValue

  useEffect(() => {
    let isMounted = true

    void initializeEmailDomainSettings().then((settings) => {
      if (!isMounted) return

      setEmailDomains(settings.domains)
      setActiveEmailDomainValue(settings.activeDomain)
      setRenderValueRef.current(settings.emailFormat)
      setIsReady(true)
    }).catch(() => {
      if (!isMounted) return

      setEmailDomains([DEFAULT_EMAIL_DOMAIN])
      setActiveEmailDomainValue(DEFAULT_EMAIL_DOMAIN)
      setIsReady(true)
      toast.error(lang('invalidEmailDomainToastDesc'))
    })

    return () => {
      isMounted = false
    }
  }, [])

  const applyEmailDomainSettings = (settings: EmailDomainSettings) => {
    setEmailDomains(settings.domains)
    setActiveEmailDomainValue(settings.activeDomain)
    setRenderValue(settings.emailFormat)
  }

  const onShortcodeClick = (shortcode: string): void => {
    if (emailInputRef.current) {
      const newText = `[${shortcode}]${emailFormatLocalPart}`
      setRenderValue(`${newText}@${activeEmailDomain || DEFAULT_EMAIL_DOMAIN}`)

      emailInputRef.current.focus()

      toast.success(lang('shortcodeAddedToast'))
    }
  }

  const handleEmailDomainChange = async (
    element: React.ChangeEvent<HTMLSelectElement>
  ) => {
    try {
      const settings = await setActiveEmailDomain(
        element.target.value,
        emailFormat
      )
      applyEmailDomainSettings(settings)
    } catch {
      toast.error(lang('invalidEmailDomainToastDesc'))
    }
  }

  const handleEmailDomainAdd = async (
    element: React.FormEvent<HTMLFormElement>
  ) => {
    element.preventDefault()

    const normalizedDomain = normalizeEmailDomain(newEmailDomain)

    if (!normalizedDomain) {
      toast.error(lang('invalidEmailDomainToastDesc'))
      return
    }

    if (emailDomains.includes(normalizedDomain)) {
      toast.error(lang('duplicateEmailDomainToastDesc'))
      return
    }

    try {
      const settings = await addEmailDomain(normalizedDomain, emailFormat)
      applyEmailDomainSettings(settings)
      setNewEmailDomain('')
      toast.success(lang('emailDomainAddedToast'))
    } catch {
      toast.error(lang('invalidEmailDomainToastDesc'))
    }
  }

  const handleEmailDomainRemove = async () => {
    if (emailDomains.length <= 1) {
      toast.error(lang('keepOneEmailDomainToastDesc'))
      return
    }

    try {
      const settings = await removeEmailDomain(
        activeEmailDomain,
        emailFormat
      )
      applyEmailDomainSettings(settings)
      toast.success(lang('emailDomainRemovedToast'))
    } catch {
      toast.error(lang('invalidEmailDomainToastDesc'))
    }
  }

  const handleEmailFormatSave = async () => {
    const selectedDomain = activeEmailDomain || DEFAULT_EMAIL_DOMAIN
    const updatedEmailFormat = `${emailFormatLocalPart}@${selectedDomain}`

    if (!isEmail(updatedEmailFormat)) {
      toast.error(lang('invalidEmailFormatToastDesc'), {
        id: 'invalid-email-format-toast'
      })

      return
    }

    await setEmailFormat(updatedEmailFormat)
    setRenderValue(updatedEmailFormat)
    toast.success(lang('emailFormatUpdatedToast'), {
      id: 'email-format-updated-toast'
    })
  }

  const handleEmailFormatChange = (
    element: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedDomain = activeEmailDomain || DEFAULT_EMAIL_DOMAIN

    setRenderValue(`${element.target.value}@${selectedDomain}`)
  }

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="email-domain" className="flex items-center gap-1.5">
          <AtSign size={20} strokeWidth={1.5} /> {lang('emailDomainLabel')}
        </Label>
        <div className="flex items-center space-x-2">
          <select
            id="email-domain"
            className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={activeEmailDomain}
            onChange={(element) => {
              void handleEmailDomainChange(element)
            }}
            disabled={!isReady}>
            {emailDomains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          <Info title={lang('removeEmailDomainTooltip')}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={lang('removeEmailDomainTooltip')}
              onClick={() => {
                void handleEmailDomainRemove()
              }}
              disabled={!isReady || emailDomains.length <= 1}>
              <Trash2 size={18} className="text-destructive" />
            </Button>
          </Info>
        </div>
        <form
          className="flex items-center space-x-2"
          onSubmit={(element) => {
            void handleEmailDomainAdd(element)
          }}>
          <Input
            type="text"
            aria-label={lang('newEmailDomainLabel')}
            placeholder={lang('addEmailDomainPlaceholder')}
            value={newEmailDomain}
            onChange={(element) => {
              setNewEmailDomain(element.target.value)
            }}
            disabled={!isReady}
          />
          <Info title={lang('addEmailDomainTooltip')}>
            <Button
              type="submit"
              variant="outline"
              size="icon"
              aria-label={lang('addEmailDomainTooltip')}
              disabled={!isReady}>
              <Plus size={20} />
            </Button>
          </Info>
        </form>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" className="flex items-center gap-1.5">
          <Mail size={20} strokeWidth={1.5} /> {lang('emailFormatLabel')}
        </Label>
        <div className="flex items-center space-x-2">
          <Input
            id="email"
            type="text"
            placeholder={getEmailLocalPart(DEFAULT_EMAIL_FORMAT)}
            value={emailFormatLocalPart}
            onChange={handleEmailFormatChange}
            ref={emailInputRef}
            disabled={!isReady}
          />
          <span className="flex h-10 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            @{activeEmailDomain || DEFAULT_EMAIL_DOMAIN}
          </span>
          <Info title={lang('saveEmailFormatTooltip')}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleEmailFormatSave()
              }}
              disabled={!isReady}>
              <Save size={22} className="text-blue-500" />
            </Button>
          </Info>
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="flex items-center gap-1.5">
          <Tags size={20} strokeWidth={1.5} /> {lang('shortcodesLabel')}
        </Label>
        <div className="flex items-center gap-2">
          {Object.keys(shortcodes).map((shortcode) => (
            <Badge
              key={shortcode}
              variant="secondary"
              className={
                isReady
                  ? 'cursor-pointer hover:bg-orange-500'
                  : 'cursor-not-allowed opacity-50'
              }
              onClick={() => {
                if (isReady) onShortcodeClick(shortcode)
              }}>
              <Info title={shortcodes[shortcode] as string}>
                <div>{`[${shortcode}]`}</div>
              </Info>
            </Badge>
          ))}
        </div>
      </div>
    </>
  )
}
