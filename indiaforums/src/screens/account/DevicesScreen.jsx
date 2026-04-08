import { useState, useEffect, useCallback } from 'react';
import * as devicesApi from '../../services/devicesApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './DevicesScreen.module.css';

export default function DevicesScreen({ onBack }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await devicesApi.getDevices();
      const items = res.data?.devices || res.data?.items || res.data || [];
      setDevices(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Devices load error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load devices'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(deviceId) {
    if (!confirm('Remove this device? It will be signed out.')) return;
    try {
      await devicesApi.removeDevice(deviceId);
      setDevices((prev) => prev.filter((d) => (d.deviceId || d.id) !== deviceId));
    } catch (err) {
      console.error('Device remove error:', err.response?.status, err.response?.data);
      alert(extractApiError(err, 'Failed to remove device'));
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Devices</h1>
      </div>

      <div className={styles.content}>
        {loading ? <LoadingState variant="card" count={3} />
          : error ? <ErrorState message={error} onRetry={load} />
          : !devices.length ? <EmptyState message="No devices registered" />
          : (
            <div className={styles.deviceList}>
              {devices.map((device) => (
                <DeviceCard
                  key={device.deviceId || device.id}
                  device={device}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}

/* ── Device Card ──────────────────────────────────────────────────────────── */
function DeviceCard({ device, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    pushNotifications: device.pushNotifications ?? device.preferences?.pushNotifications ?? true,
  });

  const id = device.deviceId || device.id;
  const name = device.deviceName || device.name || device.model || 'Unknown Device';
  const platform = device.platform || device.os || device.deviceType || '';
  const lastActive = device.lastActiveAt || device.lastActive || device.lastLoginAt || '';
  const isCurrent = device.isCurrent || device.isCurrentDevice || false;

  function getDeviceIcon() {
    const p = platform.toLowerCase();
    if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) return '📱';
    if (p.includes('android')) return '📱';
    if (p.includes('mac') || p.includes('windows') || p.includes('linux') || p.includes('web')) return '💻';
    return '📱';
  }

  async function handleTogglePush() {
    const newVal = !prefs.pushNotifications;
    setSaving(true);
    try {
      await devicesApi.updateDevicePreferences(id, { pushNotifications: newVal });
      setPrefs((p) => ({ ...p, pushNotifications: newVal }));
    } catch (err) {
      console.error('Device pref error:', err.response?.status, err.response?.data);
      alert(extractApiError(err, 'Failed to update preference'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${styles.deviceCard} ${isCurrent ? styles.deviceCurrent : ''}`}>
      <div className={styles.deviceMain} onClick={() => setExpanded(!expanded)}>
        <span className={styles.deviceIcon}>{getDeviceIcon()}</span>
        <div className={styles.deviceInfo}>
          <div className={styles.deviceName}>
            {name}
            {isCurrent && <span className={styles.currentBadge}>This device</span>}
          </div>
          <div className={styles.deviceMeta}>
            {platform && <span>{platform}</span>}
            {lastActive && <span> · {formatDate(lastActive)}</span>}
          </div>
        </div>
        <span className={`${styles.deviceChevron} ${expanded ? styles.chevronOpen : ''}`}>›</span>
      </div>

      {expanded && (
        <div className={styles.deviceExpanded}>
          <div className={styles.prefRow}>
            <div className={styles.prefInfo}>
              <div className={styles.prefLabel}>Push Notifications</div>
              <div className={styles.prefDesc}>Receive push alerts on this device</div>
            </div>
            <button
              className={`${styles.toggle} ${prefs.pushNotifications ? styles.toggleOn : ''}`}
              onClick={handleTogglePush}
              disabled={saving}
              type="button"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          {!isCurrent && (
            <button className={styles.removeBtn} onClick={() => onRemove(id)}>
              Remove Device
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
