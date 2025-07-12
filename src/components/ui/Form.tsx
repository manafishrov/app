import { Slot } from '@radix-ui/react-slot';
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { XIcon } from 'lucide-react';
import { useId, useState } from 'react';

import { Button, type buttonVariants } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';

import { type VariantProps, cx } from '@/lib/utils';

const { fieldContext, useFieldContext, formContext, useFormContext } =
  createFormHookContexts();

type BaseFieldProps = {
  className?: string;
  label?: string;
  description?: string;
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  children: React.ReactNode;
};

function BaseField({
  className,
  label,
  labelSibling,
  fieldSuffix,
  description,
  children,
}: BaseFieldProps) {
  const field = useFieldContext();
  const id = useId();

  const labelElement = (
    <Label
      className={cx(
        'mb-2 block',
        field.state.meta.errors.length > 0 && 'text-destructive',
      )}
      htmlFor={`${id}-form-item`}
    >
      {label}
    </Label>
  );

  return (
    <div className={cx('relative space-y-2', className)}>
      {labelSibling ? (
        <div className='flex items-center justify-between'>
          {labelElement}
          {labelSibling}
        </div>
      ) : (
        labelElement
      )}
      {description && (
        <p
          id={`${id}-form-item-description`}
          className={cx('text-muted-foreground text-sm', className)}
        >
          {description}
        </p>
      )}
      {fieldSuffix ? (
        <div className='flex items-center'>
          <Slot
            id={`${id}-form-item`}
            aria-describedby={
              !(field.state.meta.errors.length > 0)
                ? `${id}-form-item-description`
                : `${id}-form-item-description ${id}-form-item-message`
            }
            aria-invalid={!!(field.state.meta.errors.length > 0)}
          >
            {children}
          </Slot>
          {fieldSuffix}
        </div>
      ) : (
        <Slot
          id={`${id}-form-item`}
          aria-describedby={
            !(field.state.meta.errors.length > 0)
              ? `${id}-form-item-description`
              : `${id}-form-item-description ${id}-form-item-message`
          }
          aria-invalid={!!(field.state.meta.errors.length > 0)}
        >
          {children}
        </Slot>
      )}
      <p
        id={`${id}-form-item-message`}
        className={cx(
          'text-destructive absolute -translate-y-2 text-[0.8rem] font-medium',
          className,
        )}
      >
        {field.state.meta.errors.length > 0 &&
          (field.state.meta.errors[0] as { message: string }).message}
      </p>
    </div>
  );
}

type TextFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange' | 'onBlur'
> & {
  label?: string;
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  description?: string;
};

function TextField({
  className,
  label,
  labelSibling,
  fieldSuffix,
  description,
  ...props
}: TextFieldProps) {
  const field = useFieldContext<string>();

  return (
    <BaseField
      label={label}
      labelSibling={labelSibling}
      fieldSuffix={fieldSuffix}
      className={className}
      description={description}
    >
      <Input
        type='text'
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        {...props}
      />
    </BaseField>
  );
}

type NumberFieldProps = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'value' | 'onChange' | 'onBlur'
> & {
  label?: string;
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  description?: string;
  maxDecimals?: number;
};

function NumberField({
  className,
  label,
  labelSibling,
  fieldSuffix,
  description,
  maxDecimals,
  ...props
}: NumberFieldProps) {
  const field = useFieldContext<number>();
  const [draftValue, setDraftValue] = useState<string | null>(null);

  const formValue = field.state.value;
  const canonicalValue =
    formValue === null || formValue === undefined || isNaN(formValue)
      ? ''
      : String(formValue);

  const displayValue = draftValue ?? canonicalValue;

  function handleChange(value: string) {
    let currentDisplayValue = value;

    if (currentDisplayValue === '' || currentDisplayValue === '-') {
      setDraftValue(currentDisplayValue);
      field.handleChange(NaN);
      return;
    }

    currentDisplayValue = currentDisplayValue.replace(',', '.');
    if (
      (currentDisplayValue.match(/\./g) ?? []).length > 1 ||
      currentDisplayValue.lastIndexOf('-') > 0 ||
      /[^0-9.-]/.test(currentDisplayValue)
    ) {
      return;
    }

    if (maxDecimals !== undefined) {
      const parts = currentDisplayValue.split('.');
      if (parts[1] && parts[1].length > maxDecimals) {
        parts[1] = parts[1].substring(0, maxDecimals);
        currentDisplayValue = parts.join('.');
      }
    }

    setDraftValue(currentDisplayValue);

    if (currentDisplayValue.endsWith('.')) {
      const num = Number.parseFloat(currentDisplayValue.slice(0, -1));
      field.handleChange(isNaN(num) ? NaN : num);
    } else {
      const num = Number.parseFloat(currentDisplayValue);
      field.handleChange(isNaN(num) ? NaN : num);
    }
  }

  function handleBlur() {
    const num = Number.parseFloat(draftValue ?? '');
    if (!isNaN(num)) {
      field.handleChange(num);
    } else {
      field.handleChange(NaN);
    }
    field.handleBlur();
    setDraftValue(null);
  }

  return (
    <BaseField
      label={label}
      labelSibling={labelSibling}
      fieldSuffix={fieldSuffix}
      className={className}
      description={description}
    >
      <Input
        type='text'
        inputMode='numeric'
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        {...props}
      />
    </BaseField>
  );
}

type TextAreaFieldProps = Omit<
  React.ComponentProps<typeof Textarea>,
  'value' | 'onChange' | 'onBlur'
> & {
  label?: string;
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  description?: string;
};

function TextAreaField({
  className,
  label,
  labelSibling,
  fieldSuffix,
  description,
  ...props
}: TextAreaFieldProps) {
  const field = useFieldContext<string>();

  return (
    <BaseField
      label={label}
      labelSibling={labelSibling}
      fieldSuffix={fieldSuffix}
      className={className}
      description={description}
    >
      <Textarea
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        {...props}
      />
    </BaseField>
  );
}

type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  label?: string;
  className?: string;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  description?: string;
};

function SelectField({
  label,
  className,
  placeholder = 'Select an option',
  options,
  required = true,
  labelSibling,
  fieldSuffix,
  description,
}: SelectFieldProps) {
  const field = useFieldContext<string>();

  return (
    <BaseField
      label={label}
      labelSibling={labelSibling}
      fieldSuffix={fieldSuffix}
      className={className}
      description={description}
    >
      <div className='flex gap-2'>
        <Select
          value={field.state.value ?? undefined}
          onValueChange={field.handleChange}
          required={required}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!required && field.state.value && (
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={() => field.handleChange('')}
          >
            <XIcon className='h-4 w-4' />
          </Button>
        )}
      </div>
    </BaseField>
  );
}

type RadioOption = {
  label: string;
  value: string;
};

type RadioGroupFieldProps = {
  label?: string;
  className?: string;
  options: RadioOption[];
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  description?: string;
};

function RadioGroupField({
  label,
  className,
  options,
  labelSibling,
  fieldSuffix,
  description,
}: RadioGroupFieldProps) {
  const field = useFieldContext<string>();

  return (
    <BaseField
      label={label}
      labelSibling={labelSibling}
      fieldSuffix={fieldSuffix}
      className={className}
      description={description}
    >
      <RadioGroup
        onValueChange={field.handleChange}
        defaultValue={field.state.value}
        className='mt-4 flex flex-col space-y-2'
      >
        {options.map((option) => (
          <div key={option.value} className='flex items-center space-x-3'>
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </BaseField>
  );
}

type CheckboxFieldProps = Omit<
  React.ComponentProps<typeof Checkbox>,
  'checked' | 'onCheckedChange' | 'onBlur'
> & {
  label?: string;
  labelSibling?: React.ReactNode;
  fieldSuffix?: React.ReactNode;
  description?: string;
};

function CheckboxField({
  className,
  label,
  labelSibling,
  fieldSuffix,
  description,
  ...props
}: CheckboxFieldProps) {
  const field = useFieldContext<boolean>();

  return (
    <BaseField
      label={label}
      labelSibling={labelSibling}
      fieldSuffix={fieldSuffix}
      className={className}
      description={description}
    >
      <Checkbox
        checked={field.state.value}
        onCheckedChange={() => field.handleChange(!field.state.value)}
        onBlur={field.handleBlur}
        {...props}
        className='cursor-pointer'
      />
    </BaseField>
  );
}

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, 'type'> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  };

function SubmitButton({
  children,
  className,
  loading,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();
  return (
    <form.Subscribe
      selector={(state) => [
        state.isSubmitting,
        state.isPristine,
        state.isValidating,
      ]}
    >
      {([isSubmitting, isPristine, isValidating]) => (
        <Button
          className={cx('min-w-28', className)}
          type='submit'
          disabled={isSubmitting ?? isPristine ?? isValidating ?? loading}
          {...props}
        >
          {isSubmitting || isValidating || loading ? (
            <Spinner size='sm' className='text-primary-foreground' />
          ) : (
            children
          )}
        </Button>
      )}
    </form.Subscribe>
  );
}

const { useAppForm } = createFormHook({
  fieldComponents: {
    BaseField,
    TextField,
    NumberField,
    TextAreaField,
    SelectField,
    RadioGroupField,
    CheckboxField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
});

export { useAppForm };
