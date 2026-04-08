import { useCallback, useEffect, useState } from 'react';
import * as messagesApi from '../../services/messagesApi';
import { extractApiError } from '../../services/api';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import styles from './MessagesScreen.module.css';

const FOLDER_LIMIT  = 10;
const NAME_MAX_LEN  = 10;

export default function FoldersScreen({ onBack }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await messagesApi.getFolders();
      setFolders(res.data?.folders || []);
    } catch (err) {
      console.error('Folders error:', err.response?.status, err.response?.data);
      setError(extractApiError(err, 'Failed to load folders'));
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e?.preventDefault?.();
    const name = newName.trim();
    if (!name) return;
    if (name.length > NAME_MAX_LEN) {
      setActionError(`Folder name must be ${NAME_MAX_LEN} characters or fewer.`);
      return;
    }
    if (folders.length >= FOLDER_LIMIT) {
      setActionError(`You can create at most ${FOLDER_LIMIT} folders.`);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await messagesApi.createOrUpdateFolder({ folderId: 0, folderName: name });
      setNewName('');
      await load();
    } catch (err) {
      console.error('Create folder error:', err.response?.status, err.response?.data);
      setActionError(extractApiError(err, 'Failed to create folder'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(folder) {
    if (!folder?.folderId) return;
    if (!confirm(`Delete folder "${folder.folderName}"?\nMessages inside it will be moved out.`)) {
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await messagesApi.deleteFolder(folder.folderId);
      await load();
    } catch (err) {
      console.error('Delete folder error:', err.response?.status, err.response?.data);
      setActionError(extractApiError(err, 'Failed to delete folder'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>Folders</h1>
      </div>

      <div className={styles.content}>
        {actionError && <div className={styles.error}>{actionError}</div>}

        <form className={styles.addFolder} onSubmit={handleCreate}>
          <input
            className={styles.input}
            placeholder={`New folder (max ${NAME_MAX_LEN} chars)`}
            value={newName}
            maxLength={NAME_MAX_LEN}
            onChange={(e) => setNewName(e.target.value)}
            disabled={busy || folders.length >= FOLDER_LIMIT}
          />
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={busy || !newName.trim() || folders.length >= FOLDER_LIMIT}
          >
            Add
          </button>
        </form>

        <div className={styles.note}>
          {folders.length} of {FOLDER_LIMIT} folders used.
        </div>

        {loading ? (
          <LoadingState variant="card" count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !folders.length ? (
          <EmptyState message="No folders yet. Create one above." />
        ) : (
          <div className={styles.list}>
            {folders.map((f) => (
              <div key={f.folderId} className={styles.folderRow}>
                <div className={styles.folderName}>{f.folderName}</div>
                <div className={styles.folderCount}>{f.pmCount || 0} msgs</div>
                <button
                  className={styles.dangerBtn}
                  onClick={() => handleDelete(f)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
