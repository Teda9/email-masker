import { AtSign, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import Info from '@/components/info'
import { Button, Input, Label } from '@/components/ui'
import type { EmailDomainSettings } from '@/lib/storage/email-domains'
import { lang } from '@/lib/utils'

type Props = {
  settings: EmailDomainSettings
  disabled: boolean
  onSelect: (domain: string) => Promise<boolean>
  onAdd: (domain: string) => Promise<boolean>
  onRemove: () => Promise<boolean>
}

export default function EmailDomainManager({
  settings,
  disabled,
  onSelect,
  onAdd,
  onRemove
}: Props) {
  const [newDomain, setNewDomain] = useState('')

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (await onAdd(newDomain)) setNewDomain('')
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="email-domain" className="flex items-center gap-1.5">
        <AtSign size={20} strokeWidth={1.5} /> {lang('emailDomainLabel')}
      </Label>
      <div className="flex items-center gap-2">
        <select
          id="email-domain"
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          value={settings.activeDomain}
          onChange={(event) => {
            void onSelect(event.target.value)
          }}
          disabled={disabled}>
          {settings.domains.map((domain) => (
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
            className="shrink-0"
            aria-label={lang('removeEmailDomainTooltip')}
            onClick={() => {
              void onRemove()
            }}
            disabled={disabled || settings.domains.length <= 1}>
            <Trash2 size={18} className="text-destructive" />
          </Button>
        </Info>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          void handleAdd(event)
        }}>
        <Input
          type="text"
          className="min-w-0"
          aria-label={lang('newEmailDomainLabel')}
          placeholder={lang('addEmailDomainPlaceholder')}
          value={newDomain}
          onChange={(event) => {
            setNewDomain(event.target.value)
          }}
          disabled={disabled}
        />
        <Info title={lang('addEmailDomainTooltip')}>
          <Button
            type="submit"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={lang('addEmailDomainTooltip')}
            disabled={disabled || !newDomain.trim()}>
            <Plus size={20} />
          </Button>
        </Info>
      </form>
    </div>
  )
}
