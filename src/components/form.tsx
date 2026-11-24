"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, type ButtonVariants } from "@/components/ui";
import type { ActionState } from "@/lib/types";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;
const FormCtx = createContext<ActionState>({});
export const useFormState = () => useContext(FormCtx);

/**
 * Progressive-enhancement form bound to a server action. Shows a summary message,
 * per-field errors (via <Field>) and keeps entered values after validation errors.
 */
export function ActionForm({
  action, children, className, resetOnSuccess = false, successMessage = true, ...rest
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successMessage?: boolean;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "children">) {
  const [state, formAction] = useActionState(action, {} as ActionState);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.redirectTo) router.push(state.redirectTo);
    if (state.error) ref.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state, resetOnSuccess, router]);
  return (
    <FormCtx.Provider value={state}>
      <form ref={ref} action={formAction} className={className} noValidate {...rest}>
        {state.error ? (
          <div role="alert" className="mb-5 rounded-xl border border-danger/25 bg-danger-50 px-4 py-3 text-sm text-danger">{state.error}</div>
        ) : null}
        {state.ok && state.message && successMessage ? (
          <div role="status" className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{state.message}</div>
        ) : null}
        {children}
      </form>
    </FormCtx.Provider>
  );
}

const control =
  "block w-full rounded-lg border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/15 disabled:bg-canvas aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/10";

type FieldProps = {
  name: string;
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
};

function useField(name: string, defaultValue?: string | number | null) {
  const state = useFormState();
  const id = useId();
  const error = state.fieldErrors?.[name]?.[0];
  const value = state.values && name in state.values ? state.values[name] : defaultValue ?? undefined;
  return { id, error, value: value === null ? undefined : value };
}

function FieldShell({ id, label, hint, optional, error, className, children }: FieldProps & { id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-heading">
        {label} {optional ? <span className="font-normal text-muted">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  name, label, hint, optional, className, defaultValue, ...input
}: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "defaultValue"> & { defaultValue?: string | number | null }) {
  const f = useField(name, defaultValue);
  return (
    <FieldShell id={f.id} name={name} label={label} hint={hint} optional={optional} error={f.error} className={className}>
      <input
        id={f.id}
        name={name}
        key={String(f.value ?? "")}
        defaultValue={f.value}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${f.id}-error` : hint ? `${f.id}-hint` : undefined}
        className={cn(control, "h-11")}
        {...input}
      />
    </FieldShell>
  );
}

export function TextareaField({
  name, label, hint, optional, className, defaultValue, rows = 5, ...input
}: FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "defaultValue"> & { defaultValue?: string | null }) {
  const f = useField(name, defaultValue);
  return (
    <FieldShell id={f.id} name={name} label={label} hint={hint} optional={optional} error={f.error} className={className}>
      <textarea
        id={f.id}
        name={name}
        rows={rows}
        key={String(f.value ?? "")}
        defaultValue={f.value as string | undefined}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.error ? `${f.id}-error` : hint ? `${f.id}-hint` : undefined}
        className={cn(control, "py-2.5 leading-relaxed")}
        {...input}
      />
    </FieldShell>
  );
}

export function SelectField({
  name, label, hint, optional, className, defaultValue, options, placeholder, ...input
}: FieldProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "defaultValue"> & {
    defaultValue?: string | null;
    options: readonly { value: string; label: string }[] | { group: string; options: { value: string; label: string }[] }[];
    placeholder?: string;
  }) {
  const f = useField(name, defaultValue);
  return (
    <FieldShell id={f.id} name={name} label={label} hint={hint} optional={optional} error={f.error} className={className}>
      <select
        id={f.id}
        name={name}
        key={String(f.value ?? "")}
        defaultValue={(f.value as string) ?? ""}
        aria-invalid={f.error ? true : undefined}
        className={cn(control, "h-11 pr-9")}
        {...input}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o, i) =>
          "group" in o ? (
            <optgroup key={i} label={o.group}>
              {o.options.map((x) => (
                <option key={x.value} value={x.value}>{x.label}</option>
              ))}
            </optgroup>
          ) : (
            <option key={o.value} value={o.value}>{o.label}</option>
          ),
        )}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name, label, description, defaultChecked, className,
}: { name: string; label: React.ReactNode; description?: React.ReactNode; defaultChecked?: boolean; className?: string }) {
  const state = useFormState();
  const id = useId();
  const error = state.fieldErrors?.[name]?.[0];
  const checked = state.values ? state.values[name] === "on" : defaultChecked;
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          key={String(checked)}
          defaultChecked={checked}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-[18px] shrink-0 rounded border-line accent-emerald-600"
        />
        <span className="text-sm">
          <span className="text-ink">{label}</span>
          {description ? <span className="mt-0.5 block text-[13px] text-muted">{description}</span> : null}
        </span>
      </label>
      {error ? <p className="mt-1 pl-[30px] text-[13px] text-danger">{error}</p> : null}
    </div>
  );
}

/** Hidden field that bots tend to fill. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function SubmitButton({
  children, pendingText, className, variant, size, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || props.disabled} aria-disabled={pending} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Small inline form for one-click server actions (e.g. archive, approve). */
export function ConfirmButton({
  children, confirm, className, variant = "outline", size = "sm", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants & { confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
