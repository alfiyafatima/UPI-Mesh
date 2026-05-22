import React, { useState } from 'react';
import { runGossip, runBridgeUpload } from '../utils/api';
import styles from './MeshPanel.module.css';

export default function MeshPanel({ mesh, onRefresh }) {
  const [loadingGossip, setLoadingGossip] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [lastResults, setLastResults] = useState([]);

  async function handleGossip() {
    setLoadingGossip(true);
    await runGossip();
    await onRefresh();
    setLoadingGossip(false);
  }

  async function handleUpload() {
    setLoadingUpload(true);
    const res = await runBridgeUpload();
    setLastResults(res.results || []);
    await onRefresh();
    setLoadingUpload(false);
  }

  const { devices = [], eventLog = [] } = mesh || {};

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>📡 Mesh Network Simulator</h2>

      {/* Devices */}
      <div className={styles.deviceGrid}>
        {devices.map((d) => (
          <div key={d.id} className={`${styles.device} ${d.hasInternet ? styles.bridge : ''}`}>
            <div className={styles.deviceIcon}>{d.hasInternet ? '🌐' : '📱'}</div>
            <div className={styles.deviceId}>{d.id}</div>
            <div className={styles.packetCount}>
              {d.packetCount} packet{d.packetCount !== 1 ? 's' : ''}
            </div>
            {d.hasInternet && <span className={styles.bridgeBadge}>BRIDGE</span>}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <button className={styles.btnGossip} onClick={handleGossip} disabled={loadingGossip}>
          {loadingGossip ? '⏳ Running...' : '🔄 Run Gossip Round'}
        </button>
        <button className={styles.btnUpload} onClick={handleUpload} disabled={loadingUpload}>
          {loadingUpload ? '⏳ Uploading...' : '📡 Bridge Upload to Backend'}
        </button>
      </div>

      {/* Upload results */}
      {lastResults.length > 0 && (
        <div className={styles.results}>
          {lastResults.map((r, i) => (
            <div key={i} className={`${styles.result} ${styles[r.status?.toLowerCase()]}`}>
              <span className={styles.hash}>[{r.hash}]</span>
              <span className={styles.status}>{r.status}</span>
              {r.reason && <span className={styles.reason}>{r.reason}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Event log */}
      <div className={styles.logWrap}>
        <div className={styles.logLabel}>Event Log</div>
        <div className={styles.log}>
          {eventLog.length === 0 && <div className={styles.empty}>No events yet</div>}
          {eventLog.map((e, i) => (
            <div key={i} className={styles.logEntry}>
              <span className={styles.ts}>{new Date(e.time).toLocaleTimeString()}</span>
              <span>{e.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
