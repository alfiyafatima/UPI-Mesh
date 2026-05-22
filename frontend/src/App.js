import React, { useState, useEffect, useCallback } from 'react';
import AccountsPanel from './components/AccountsPanel';
import SendPaymentForm from './components/SendPaymentForm';
import MeshPanel from './components/MeshPanel';
import TransactionLedger from './components/TransactionLedger';
import { fetchState, resetDemo } from './utils/api';
import styles from './App.module.css';

export default function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchState();
      setState(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleReset() {
    setResetting(true);
    await resetDemo();
    await refresh();
    setResetting(false);
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <div className={styles.logo}>UPI Mesh</div>
            <div className={styles.subtitle}>Offline Payment Simulator — MERN Stack</div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.badge}>
              <span className={styles.dot} />
              {state ? 'Connected' : 'Connecting...'}
            </div>
            <button className={styles.resetBtn} onClick={handleReset} disabled={resetting}>
              {resetting ? '⏳' : '🔄'} Reset Demo
            </button>
          </div>
        </div>
      </header>

      {/* Explanation banner */}
      <div className={styles.banner}>
        <span className={styles.bannerIcon}>ℹ️</span>
        <span>
          Simulate offline UPI: encrypt a payment → gossip it through the mesh → bridge uploads to backend → settlement.
          No real Bluetooth needed — all virtual devices run server-side.
        </span>
      </div>

      {error && <div className={styles.error}>⚠️ Backend error: {error} — is the backend running on port 8080?</div>}

      {state ? (
        <main className={styles.main}>
          <div className={styles.col}>
            <AccountsPanel accounts={state.accounts || []} />
            <SendPaymentForm accounts={state.accounts || []} onSuccess={refresh} />
          </div>
          <div className={styles.col}>
            <MeshPanel mesh={state.mesh} onRefresh={refresh} />
            <TransactionLedger transactions={state.transactions || []} />
          </div>
        </main>
      ) : (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <div>Connecting to backend…</div>
        </div>
      )}
    </div>
  );
}
