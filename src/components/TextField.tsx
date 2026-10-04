import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Message d'erreur affiché sous le champ. */
  error?: string | null
  /** Aide affichée sous le champ quand il n'y a pas d'erreur. */
  hint?: string
  /** Élément placé à droite dans le champ (bouton afficher / masquer...). */
  trailing?: ReactNode
}

/** Champ de saisie avec libellé, aide et message d'erreur reliés pour l'accessibilité. */
export function TextField({ label, error, hint, trailing, className = '', ...inputProps }: TextFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error || hint

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-base font-medium">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`h-14 w-full rounded-xl border bg-paper px-4 text-lg text-ink placeholder:text-ink-soft/70 disabled:bg-mist ${
            error ? 'border-danger' : 'border-line'
          } ${trailing ? 'pr-14' : ''}`}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
      </div>
      {message && (
        <p id={messageId} className={`mt-1.5 text-base ${error ? 'text-danger' : 'text-ink-soft'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing'>

/** Champ mot de passe avec un bouton pour afficher ou masquer la saisie. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          className="flex size-12 items-center justify-center rounded-lg text-ink-soft active:bg-mist"
        >
          {visible ? <EyeOff className="size-6" aria-hidden="true" /> : <Eye className="size-6" aria-hidden="true" />}
        </button>
      }
    />
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | null
  hint?: string
}

/** Zone de texte sur plusieurs lignes, avec les mêmes libellé, aide et erreur que TextField. */
export function TextAreaField({ label, error, hint, className = '', rows = 4, ...textareaProps }: TextAreaFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error || hint

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-base font-medium">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`mt-1.5 block w-full rounded-xl border bg-paper px-4 py-3 text-lg text-ink placeholder:text-ink-soft/70 disabled:bg-mist ${
          error ? 'border-danger' : 'border-line'
        }`}
        {...textareaProps}
      />
      {message && (
        <p id={messageId} className={`mt-1.5 text-base ${error ? 'text-danger' : 'text-ink-soft'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
