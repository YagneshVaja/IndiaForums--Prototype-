import { useState } from 'react';
import InboxScreen from './InboxScreen';
import ThreadScreen from './ThreadScreen';
import ComposeScreen from './ComposeScreen';
import FoldersScreen from './FoldersScreen';

/**
 * Top-level Messages entry. Owns sub-view navigation between
 * Inbox / Thread / Compose / Folders without touching MySpace state.
 */
export default function MessagesScreen({ onBack }) {
  const [view, setView] = useState('inbox');             // 'inbox' | 'thread' | 'compose' | 'folders'
  const [threadRootId, setThreadRootId] = useState(null);
  const [composeArgs, setComposeArgs] = useState(null);

  function openThread(rootId) {
    setThreadRootId(rootId);
    setView('thread');
  }

  function openCompose(args = null) {
    setComposeArgs(args);
    setView('compose');
  }

  function backToInbox() {
    setView('inbox');
    setComposeArgs(null);
    setThreadRootId(null);
  }

  if (view === 'thread') {
    return (
      <ThreadScreen
        rootId={threadRootId}
        onBack={backToInbox}
        onCompose={openCompose}
      />
    );
  }

  if (view === 'compose') {
    return (
      <ComposeScreen
        {...(composeArgs || {})}
        onBack={() => {
          // After replying from a thread, go back to that thread; otherwise inbox.
          if (composeArgs?.mode === 'reply' && threadRootId) {
            setView('thread');
            setComposeArgs(null);
          } else {
            backToInbox();
          }
        }}
        onSent={() => {
          if (composeArgs?.mode === 'reply' && threadRootId) {
            setView('thread');
            setComposeArgs(null);
          } else {
            backToInbox();
          }
        }}
      />
    );
  }

  if (view === 'folders') {
    return <FoldersScreen onBack={backToInbox} />;
  }

  return (
    <InboxScreen
      onBack={onBack}
      onOpenThread={openThread}
      onCompose={openCompose}
      onOpenFolders={() => setView('folders')}
    />
  );
}
