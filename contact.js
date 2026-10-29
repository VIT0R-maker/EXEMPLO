const recipient = 'igorcg2310@hotmail.com';

/** Prepare a draft only; the visitor completes delivery in their email app. */
export function buildMailto({ name, email, subject, message }) {
  const draftSubject = subject.trim().replace(/[\r\n]+/g, ' ') || 'Contato pelo portfólio';
  const body = [
    `Nome: ${name.trim()}`,
    `E-mail: ${email.trim()}`,
    '',
    message.trim().replace(/\r?\n/g, '\r\n'),
  ].join('\r\n');

  return `mailto:${recipient}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(body)}`;
}
