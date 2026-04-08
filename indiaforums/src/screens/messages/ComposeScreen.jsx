import { useState } from 'react';
import * as messagesApi from '../../services/messagesApi';
import { extractApiError } from '../../services/api';
import styles from './MessagesScreen.module.css';

export default function ComposeScreen({
  onBack,
  onSent,
  // Optional prefill when replying or continuing a draft.
  mode = 'new',                  // 'new' | 'reply' | 'forward' | 'draft'
  parentId,
  rootMessageId = 0,
  prefillSubject = '',
  prefillTo = '',
  draftId,
  prefill,                       // raw draft DTO from list (when mode==='draft')
}) {
  const [to, setTo] = useState(
    prefill?.toIds || prefillTo || '',
  );
  const [subject, setSubject] = useState(
    prefill?.subject || prefillSubject || '',
  );
  const [body, setBody] = useState(
    prefill?.message || '',
  );
  const [bcc, setBcc] = useState(false);
  const [emailNotify, setEmailNotify] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  function validate() {
    if (!to.trim())      return 'Please enter at least one recipient.';
    if (!subject.trim()) return 'Please enter a subject.';
    if (!body.trim())    return 'Please write a message.';
    return null;
  }

  async function handleSend(e) {
    e?.preventDefault?.();
    const err = validate();
    if (err) { setError(err); return; }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await messagesApi.sendMessage({
        subject: subject.trim(),
        message: body,
        userList: to.trim(),
        bcc,
        parentId,
        rootMessageId,
        emailNotify,
        draftId,
      });
      const ok = res.data?.isSuccess !== false;
      if (!ok) {
        setError(res.data?.message || 'Could not send message.');
        return;
      }
      setSuccess(res.data?.message || 'Message sent.');
      // Brief pause so the user sees the success state, then bounce back.
      setTimeout(() => onSent?.(res.data), 600);
    } catch (err2) {
      console.error('Send PM error:', err2.response?.status, err2.response?.data);
      setError(extractApiError(err2, 'Failed to send message'));
    } finally {
      setSubmitting(false);
    }
  }

  const heading =
    mode === 'reply'    ? 'Reply' :
    mode === 'forward'  ? 'Forward' :
    mode === 'draft'    ? 'Continue Draft' :
                          'New Message';

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>{heading}</h1>
      </div>

      <form className={styles.form} onSubmit={handleSend}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <div className={styles.field}>
          <label className={styles.label}>To</label>
          <input
            className={styles.input}
            placeholder="username1, username2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={submitting}
          />
          <span className={styles.note}>
            Comma-separated usernames. Friends are easier — you can only message users who allow PMs.
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Subject</label>
          <input
            className={styles.input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Message</label>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
          />
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={bcc}
            onChange={(e) => setBcc(e.target.checked)}
            disabled={submitting}
          />
          Hide other recipients (BCC)
        </label>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={emailNotify}
            onChange={(e) => setEmailNotify(e.target.checked)}
            disabled={submitting}
          />
          Email recipients about this message
        </label>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={onBack}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={submitting}
          >
            {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
}
