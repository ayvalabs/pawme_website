'use client';

import { useState } from 'react';

interface FoundFormProps {
  petId: string;
  petName: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function FoundForm({ petId, petName }: FoundFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!phone.trim() && !email.trim()) {
      setErrorMsg('Please leave a phone or email so the owner can reach you.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch(`/api/pet/${encodeURIComponent(petId)}/found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finderName: name.trim() || undefined,
          finderContact: { phone: phone.trim() || undefined, email: email.trim() || undefined },
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setStatus('error');
        setErrorMsg(data.message || 'Could not submit. Try again in a minute.');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Try again.');
    }
  };

  if (status === 'success') {
    return (
      <div style={styles.success}>
        <div style={styles.successCheck}>✓</div>
        <h3 style={styles.successTitle}>Owner notified</h3>
        <p style={styles.successBody}>
          Thank you for helping reunite {petName} with their family. The owner will reach out to you
          shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={styles.form}>
      <label style={styles.label}>
        Your name (optional)
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sarah"
          maxLength={80}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Phone
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 0123"
          maxLength={32}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={200}
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Note (optional)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Where is ${petName}? Are they OK?`}
          maxLength={1000}
          rows={3}
          style={{ ...styles.input, resize: 'vertical' as const }}
        />
      </label>
      {errorMsg ? <div style={styles.error}>{errorMsg}</div> : null}
      <button
        type="submit"
        disabled={status === 'submitting'}
        style={{ ...styles.submit, opacity: status === 'submitting' ? 0.6 : 1 }}
      >
        {status === 'submitting' ? 'Sending…' : 'Notify the owner'}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#5C5246', fontWeight: 600 },
  input: {
    padding: '10px 12px',
    border: '1px solid #E1D6C7',
    borderRadius: 10,
    fontSize: 15,
    fontFamily: 'inherit',
    background: '#FAF6F2',
    color: '#1E1810',
    outline: 'none',
  },
  submit: {
    marginTop: 4,
    padding: '14px 16px',
    background: '#F47B5A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  error: {
    background: '#FEE',
    color: '#A22',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 13,
  },
  success: {
    textAlign: 'center' as const,
    padding: '12px 0',
  },
  successCheck: {
    width: 64,
    height: 64,
    margin: '0 auto 12px',
    borderRadius: '50%',
    background: '#4CAF50',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
  },
  successTitle: { margin: '0 0 8px', fontSize: 20, color: '#1E1810' },
  successBody: { margin: 0, fontSize: 14, color: '#5C5246', lineHeight: 1.5 },
};
