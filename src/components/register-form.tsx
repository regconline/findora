import Link from "next/link";
import { ActionForm, CheckboxField, SubmitButton, TextField } from "@/components/form";
import { Turnstile } from "@/components/turnstile";
import { registerAction } from "@/app/(auth)/actions";

export function RegisterForm({ accountType }: { accountType: "customer" | "business_owner" }) {
  const business = accountType === "business_owner";
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <input type="hidden" name="account_type" value={accountType} />
      <TextField name="full_name" label="Full name" autoComplete="name" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="email" label="Email address" type="email" autoComplete="email" required />
        <TextField name="phone" label="Phone number" type="tel" autoComplete="tel" optional={!business} placeholder="082 123 4567" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="password" label="Password" type="password" autoComplete="new-password" hint="At least 10 characters with a letter and a number." required />
        <TextField name="confirm_password" label="Confirm password" type="password" autoComplete="new-password" required />
      </div>
      <CheckboxField
        name="accept_terms"
        label={
          <>
            I accept the <Link href="/terms" target="_blank" className="text-emerald-700 underline">Terms and Conditions</Link> and{" "}
            <Link href="/privacy" target="_blank" className="text-emerald-700 underline">Privacy Policy</Link>.
          </>
        }
      />
      <CheckboxField name="marketing_opt_in" label="Send me occasional Findora news and tips (optional). You can unsubscribe at any time." />
      <Turnstile />
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
        {business ? "Create account and continue" : "Create account"}
      </SubmitButton>
    </ActionForm>
  );
}
