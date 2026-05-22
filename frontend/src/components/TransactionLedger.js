import React from 'react';
import styles from './TransactionLedger.module.css';

export default function TransactionLedger({ transactions }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>📒 Settlement Ledger</h2>
      {transactions.length === 0 ? (
        <div className={styles.empty}>No transactions settled yet.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Hash</th>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Settled At</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td className={styles.hash}>{tx.packetHash?.slice(0, 12)}…</td>
                  <td>{tx.senderUpiId}</td>
                  <td>{tx.receiverUpiId}</td>
                  <td className={styles.amount}>₹{(tx.amountPaise / 100).toFixed(2)}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[tx.status?.toLowerCase()]}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className={styles.ts}>
                    {tx.settledAt ? new Date(tx.settledAt).toLocaleTimeString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
