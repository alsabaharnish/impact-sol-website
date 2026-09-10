const TYPES = new Set(['general', 'partnership', 'maker']);
const INITIATIVE_STAGES = new Set(['idea', 'testing', 'active', 'scaling', 'other']);

const FIELD_RULES = Object.freeze({
  organization: { max: 160, label: 'Organisation' },
  role: { max: 100, label: 'Role' },
  phone: { max: 32, label: 'Phone' },
  country: { max: 80, label: 'Country' },
  subject: { max: 140, label: 'Subject' },
  partnershipInterest: { max: 300, label: 'Partnership interest' },
  initiativeName: { max: 160, label: 'Initiative name' },
  supportNeeded: { max: 500, label: 'Support needed' },
  websiteUrl: { max: 300, label: 'Website URL' },
  sourcePath: { max: 200, label: 'Source path' },
  privacyNoticeVersion: { max: 40, label: 'Privacy notice version' },
});

const EMAIL_PATTERN = /^(?=.{3,254}$)[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/u;
const PHONE_PATTERN = /^\+?[0-9().\-\s]{5,32}$/u;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

function scalar(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function cleanSingleLine(value) {
  return scalar(value).normalize('NFC').trim().replace(/\s+/gu, ' ');
}

function cleanMultiline(value) {
  return scalar(value)
    .normalize('NFC')
    .replace(/\r\n?/gu, '\n')
    .trim();
}

function hasControlCharacters(value) {
  return CONTROL_CHARACTERS.test(value);
}

function setError(errors, field, message) {
  if (!errors[field]) errors[field] = message;
}

export function validateInquiry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { form: 'Submit the form fields as an object.' } };
  }

  const honeypot = cleanSingleLine(input.companyWebsite ?? input.honeypot);
  if (honeypot) return { ok: false, spam: true, errors: {} };

  const errors = {};
  const inquiryType = cleanSingleLine(input.inquiryType ?? input.type).toLowerCase();
  const name = cleanSingleLine(input.name);
  const email = cleanSingleLine(input.email).toLowerCase();
  const message = cleanMultiline(input.message);

  if (!TYPES.has(inquiryType)) setError(errors, 'inquiryType', 'Choose a valid inquiry type.');
  if (name.length < 2 || name.length > 100 || hasControlCharacters(name)) {
    setError(errors, 'name', 'Enter a name between 2 and 100 characters.');
  }
  if (!EMAIL_PATTERN.test(email) || hasControlCharacters(email)) {
    setError(errors, 'email', 'Enter a valid email address.');
  }
  if (message.length < 20 || message.length > 3000 || hasControlCharacters(message)) {
    setError(errors, 'message', 'Enter a message between 20 and 3,000 characters.');
  }
  /** @type {Record<string, string>} */
  const optional = {};
  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    const value = cleanSingleLine(input[field]);
    if (!value) continue;
    if (value.length > rule.max || hasControlCharacters(value)) {
      setError(errors, field, `${rule.label} must be ${rule.max} characters or fewer.`);
    } else {
      optional[field] = value;
    }
  }

  if (optional.phone && !PHONE_PATTERN.test(optional.phone)) {
    setError(errors, 'phone', 'Enter a valid phone number or leave this field blank.');
  }
  if (optional.websiteUrl) {
    try {
      const url = new URL(optional.websiteUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      optional.websiteUrl = url.toString();
    } catch {
      setError(errors, 'websiteUrl', 'Enter a complete http or https URL.');
    }
  }
  if (optional.sourcePath && (!optional.sourcePath.startsWith('/') || optional.sourcePath.startsWith('//'))) {
    setError(errors, 'sourcePath', 'Source path must be a site-relative path.');
  }

  const initiativeStage = cleanSingleLine(input.initiativeStage).toLowerCase();
  if (initiativeStage) {
    if (!INITIATIVE_STAGES.has(initiativeStage)) {
      setError(errors, 'initiativeStage', 'Choose a valid initiative stage.');
    } else {
      optional.initiativeStage = initiativeStage;
    }
  }

  if (inquiryType === 'general' && !optional.subject) {
    setError(errors, 'subject', 'Choose an inquiry category.');
  }
  if (inquiryType === 'partnership') {
    if (!optional.organization) setError(errors, 'organization', 'Enter the organisation name.');
    if (!optional.role) setError(errors, 'role', 'Enter your role or organisation type.');
    if (!optional.country) setError(errors, 'country', 'Enter the organisation location.');
    if (!optional.partnershipInterest) {
      setError(errors, 'partnershipInterest', 'Summarise the proposed collaboration.');
    }
  }
  if (inquiryType === 'maker') {
    if (!optional.initiativeName) setError(errors, 'initiativeName', 'Enter the business or initiative name.');
    if (!optional.role) setError(errors, 'role', 'Describe the type of work.');
    if (!optional.country) setError(errors, 'country', 'Enter the business or initiative location.');
    if (!optional.initiativeStage) setError(errors, 'initiativeStage', 'Choose the current stage.');
    if (!optional.supportNeeded) setError(errors, 'supportNeeded', 'Describe the primary challenge or support sought.');
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: Object.freeze({
      inquiryType,
      name,
      email,
      message,
      ...optional,
    }),
  };
}

export const inquiryConstraints = Object.freeze({
  types: [...TYPES],
  messageMinLength: 20,
  messageMaxLength: 3000,
  bodyMaxBytes: 32 * 1024,
});
