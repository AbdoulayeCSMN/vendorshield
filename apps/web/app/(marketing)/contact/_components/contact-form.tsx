'use client';

import { useActionState } from 'react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import { sendContactMessageAction } from '~/lib/actions/contact.actions';

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    sendContactMessageAction,
    null,
  );

  if (state?.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        <Trans i18nKey="marketing:contactSuccess" />
        <p className="mt-1 text-green-600">
          <Trans i18nKey="marketing:contactSuccessDescription" />
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      {state && !state.success && state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor="contact-name">
          <Trans i18nKey="marketing:contactName" />
        </Label>
        <Input id="contact-name" name="name" required minLength={2} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="contact-email">
          <Trans i18nKey="marketing:contactEmail" />
        </Label>
        <Input id="contact-email" name="email" type="email" required />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="contact-message">
          <Trans i18nKey="marketing:contactMessage" />
        </Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          rows={6}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? '…' : <Trans i18nKey="marketing:sendMessage" />}
      </Button>
    </form>
  );
}
