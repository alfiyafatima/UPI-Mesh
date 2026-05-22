import React, { useState } from 'react';
import { sendPayment } from '../utils/api';
import styles from './SendPaymentForm.module.css';

export default function SendPaymentForm({ accounts, onSuccess }) {
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSend() {
    if (!sender || !receiver || !amount) return setMsg({ type: 'error', text: 'Fill all fields' });
    if (sender === receiver) return setMsg({ type: 'error', text: 'Sender and receiver must differ' });
    setLoading(true);
    setMsg(null);
    try {
      const res = await sendPayment(sender, receiver, amount);
      if (res.success) {
        setMsg({ type: 'success', text: `✓ Packet created [${res.hash?.slice(0, 10)}...]` });
        onSuccess();
      } else {
        setMsg({ type: 'error', text: res.error || 'Failed' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  const upiIds = accounts.map((a) => a.upiId);

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>📤 Create Payment Packet</h2>
      <div className={styles.form}>
        <div className={styles.field}>
          <label>Sender</label>
          <select value={sender} onChange={(e) => setSender(e.target.value)}>
            <option value="">— select —</option>
            {upiIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Receiver</label>
          <select value={receiver} onChange={(e) => setReceiver(e.target.value)}>
            <option value="">— select —</option>
            {upiIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Amount (₹)</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <button className={styles.btn} onClick={handleSend} disabled={loading}>
          {loading ? 'Encrypting...' : '🔐 Encrypt & Hand to phone-alice'}
        </button>
      </div>
      {msg && <div className={`${styles.msg} ${styles[msg.type]}`}>{msg.text}</div>}
    </div>
  );
}
