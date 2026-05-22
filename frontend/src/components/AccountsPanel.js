import React from 'react';
import styles from './AccountsPanel.module.css';

export default function AccountsPanel({ accounts }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>💳 Accounts</h2>
      <div className={styles.grid}>
        {accounts.map((acc) => (
          <div key={acc.upiId} className={styles.card}>
            <div className={styles.name}>{acc.ownerName}</div>
            <div className={styles.upi}>{acc.upiId}</div>
            <div className={styles.balance}>
              ₹{(acc.balancePaise / 100).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
