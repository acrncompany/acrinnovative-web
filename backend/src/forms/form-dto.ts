import { plainToInstance, Transform } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, validate } from 'class-validator';

/**
 * Input rules for the two public forms. The messages are written for visitors (they appear next to the fields).
 * Strings are trimmed and stripped of control characters (including line breaks in single-line fields).
 */
/** @param optional an empty value means "not provided" (browsers send empty fields as "") */
const clean = (multiline: boolean, optional = false) =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    // Single-line fields: line breaks and tabs become a space (they could otherwise be used to inject email headers).
    const oneLine = multiline ? value : value.replace(/[\r\n\t]+/g, ' ');
    // Remove remaining control characters (keeps normal line breaks in multi-line fields).
    // eslint-disable-next-line no-control-regex
    const result = oneLine.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    return optional && result === '' ? undefined : result;
  });

const PHONE = /^[0-9+()\-.\s]{5,30}$/;

/** Honeypot: a hidden field real visitors never fill. Bots do. */
export class Honeypot {
  @IsOptional() @IsString() @MaxLength(500) website?: string;
}

export class ContactDto extends Honeypot {
  @clean(false) @IsString() @IsNotEmpty({ message: 'Please enter your name.' }) @MaxLength(150, { message: 'That name is too long.' }) name: string;
  @clean(false) @IsEmail({}, { message: 'Please enter a valid email address.' }) @MaxLength(200, { message: 'That email address is too long.' }) email: string;
  @clean(false, true) @IsOptional() @Matches(PHONE, { message: 'Please enter a valid phone number, or leave it empty.' }) phone?: string;
  @clean(false, true) @IsOptional() @IsString() @MaxLength(200, { message: 'That company name is too long.' }) company?: string;
  @clean(false) @IsString() @IsNotEmpty({ message: 'Please enter a subject.' }) @MaxLength(250, { message: 'The subject is too long (250 characters at most).' }) subject: string;
  @clean(true) @IsString() @IsNotEmpty({ message: 'Please write your message.' }) @MaxLength(5000, { message: 'The message is too long (5,000 characters at most).' }) message: string;
}

export class ApplicationDto extends Honeypot {
  @clean(false) @IsString() @IsNotEmpty({ message: 'Please enter your name.' }) @MaxLength(150, { message: 'That name is too long.' }) name: string;
  @clean(false) @IsEmail({}, { message: 'Please enter a valid email address.' }) @MaxLength(200, { message: 'That email address is too long.' }) email: string;
  @clean(false, true) @IsOptional() @Matches(PHONE, { message: 'Please enter a valid phone number, or leave it empty.' }) phone?: string;
  @clean(true, true) @IsOptional() @IsString() @MaxLength(3000, { message: 'The note is too long (3,000 characters at most).' }) message?: string;
  /** Id of the job being applied for; empty = open application. */
  @Transform(({ value }) => (value === '' || value === undefined || value === null ? undefined : Number(value)))
  @IsOptional() @IsInt({ message: 'Invalid job.' }) jobId?: number;
}

export type FormErrors = Record<string, string>;

/**
 * Validate a submitted form body against a DTO class.
 * @returns the cleaned values and a map of field -> first problem (empty map = valid)
 */
export async function validateForm<T extends object>(cls: new () => T, body: Record<string, unknown>) {
  const dto = plainToInstance(cls, body ?? {}, { exposeUnsetFields: false });
  const issues = await validate(dto, { whitelist: true, forbidUnknownValues: false });
  const errors: FormErrors = {};
  for (const i of issues) {
    const all = Object.values(i.constraints ?? {});
    const first = all.find((m) => !m.startsWith(`${i.property} `)) ?? all[0];
    if (first) errors[i.property] = first;
  }
  return { values: dto as T & Record<string, any>, errors };
}
