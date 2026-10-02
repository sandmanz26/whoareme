import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  Field,
  PasswordInput,
  SelectInput,
  TextInput,
} from "@/components/ui/Field";
import { ArrowRight, Check } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import { initialsOf } from "@/lib/utils";
import { ROLE_OPTIONS } from "./joinForm";
import type { RoleId } from "@/data/taxonomy";
import { useAccount } from "@/hooks/useAccount";
import {
  registerSchema,
  type RegisterValues,
} from "@/lib/validation/authSchemas";

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  onOpenPanel: () => void;
}

export function JoinModal({ open, onClose, onOpenPanel }: JoinModalProps) {
  const { register: registerAccount } = useAccount();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", role: "", password: "" },
  });
  const {
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form;
  const values = form.watch();

  useEffect(() => {
    if (open) track("signup_opened");
  }, [open]);

  async function onSubmit(data: RegisterValues) {
    try {
      await registerAccount(
        {
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role as RoleId,
          location: "",
          title: "",
          years: "",
          topics: [],
          portfolio: "",
          pitch: "",
          photo: "",
        },
        data.password,
      );
      track("signup_completed");
    } catch (err) {
      const msg = isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ??
          "Something went wrong.")
        : "Something went wrong. Please try again.";
      form.setError("root", { message: msg });
      throw err; // re-throw so RHF marks isSubmitSuccessful as false
    }
  }

  function handleClose() {
    onClose();
    window.setTimeout(() => form.reset(), 200);
  }

  const serverError = form.formState.errors.root?.message;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isSubmitSuccessful ? "You're on the list" : "Create your profile"}
      description={
        isSubmitSuccessful
          ? "Nothing was sent anywhere - this demo keeps everything in your browser."
          : "Who you are, how to get back in, and what you do. The rest - title, location, a portfolio link, a bio - is a field on your panel whenever you're ready."
      }
    >
      {isSubmitSuccessful ? (
        <SuccessState
          values={values}
          onClose={handleClose}
          onOpenPanel={() => {
            onClose();
            onOpenPanel();
            window.setTimeout(() => form.reset(), 200);
          }}
        />
      ) : (
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit, () => {
            // validation error — no-op, RHF shows inline errors
          })}
        >
          <div className="flex flex-col gap-5">
            <Field label="Full name" required error={errors.name?.message}>
              {({ id, describedBy, invalid }) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.name}
                  autoComplete="name"
                  placeholder="Rani Ardhana"
                  onChange={(e) =>
                    form.setValue("name", e.target.value, {
                      shouldValidate: isSubmitting,
                    })
                  }
                />
              )}
            </Field>

            <Field
              label="Email"
              required
              error={errors.email?.message}
              hint="Only used to send you the edit link."
            >
              {({ id, describedBy, invalid }) => (
                <TextInput
                  id={id}
                  type="email"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.email}
                  autoComplete="email"
                  placeholder="you@studio.com"
                  onChange={(e) =>
                    form.setValue("email", e.target.value, {
                      shouldValidate: isSubmitting,
                    })
                  }
                />
              )}
            </Field>

            <Field
              label="Craft"
              required
              error={errors.role?.message}
              hint="What you want to be found for."
            >
              {({ id, describedBy, invalid }) => (
                <SelectInput
                  id={id}
                  describedBy={describedBy}
                  invalid={invalid}
                  value={values.role}
                  placeholder="Select a craft…"
                  options={ROLE_OPTIONS.map((o) => ({
                    value: o.id,
                    label: o.label,
                  }))}
                  onChange={(next) =>
                    form.setValue("role", next, { shouldValidate: true })
                  }
                />
              )}
            </Field>

            <Field
              label="Password"
              required
              error={errors.password?.message}
              hint="Guards the way back into this profile. Stored hashed, in this browser only."
            >
              {({ id, describedBy, invalid }) => (
                <PasswordInput
                  id={id}
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  invalid={invalid}
                  value={values.password}
                  placeholder="At least 10 characters"
                  onChange={(e) =>
                    form.setValue("password", e.target.value, {
                      shouldValidate: isSubmitting,
                    })
                  }
                />
              )}
            </Field>
          </div>

          {serverError && (
            <p role="alert" className="mt-4 text-sm font-medium text-pop-pink">
              {serverError}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating your profile…" : "Create profile"}
              <ArrowRight size={17} />
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ── Success state ────────────────────────────────────────────────────── */

function SuccessState({
  values,
  onClose,
  onOpenPanel,
}: {
  values: RegisterValues;
  onClose: () => void;
  onOpenPanel: () => void;
}) {
  const role = ROLE_OPTIONS.find((o) => o.id === values.role);

  return (
    <div className="animate-fade-up flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-pill bg-pop-lime text-ink">
        <Check size={26} />
      </span>

      <h3 className="display mt-5 text-2xl">
        Profile ready, {values.name.split(" ")[0]}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Add your title, location, a portfolio link and a bio from your panel -
        then add real work. Your panel has a different form for every craft.
      </p>

      <div className="mt-7 w-full rounded-card border border-line bg-paper p-5 text-left">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-[30%] bg-ink font-display text-lg font-bold text-paper">
            {initialsOf(values.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">
              {values.name}
            </p>
            <p className="truncate text-sm text-ink-2">Add your title</p>
          </div>
        </div>

        {role && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            <li className="rounded-pill border border-ink/20 bg-paper-2 px-2.5 py-1 font-display text-[0.6875rem] font-medium text-ink-2">
              {role.label}
            </li>
          </ul>
        )}
      </div>

      <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={onClose}>
          Later
        </Button>
        <Button onClick={onOpenPanel}>
          Finish your profile
          <ArrowRight size={17} />
        </Button>
      </div>
    </div>
  );
}
