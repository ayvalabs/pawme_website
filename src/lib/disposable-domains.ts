// A list of common disposable email domains.
// This is not exhaustive but covers many popular services.
export const disposableDomains = new Set([
  '10minutemail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'mailinator.com',
  'sharklasers.com',
  'getairmail.com',
  'yopmail.com',
  'throwawaymail.com',
  'tempmail.com',
  'burnermail.io',
  'emailondeck.com',
  'maildrop.cc',
  'fakemail.net',
  'tempail.com',
  'dispostable.com',
]);

export function isDisposableEmail(email: string): boolean {
  if (!email) return false;
  const domain = email.split('@')[1];
  return disposableDomains.has(domain);
}
