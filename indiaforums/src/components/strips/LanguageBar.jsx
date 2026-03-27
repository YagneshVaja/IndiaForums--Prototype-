import styles from './LanguageBar.module.css';
import { LANG_EMOJI } from '../../data/newsData';

export default function LanguageBar({ langs, activeId, onSelect }) {
  return (
    <div className={styles.bar}>
      {langs.map((lang) => {
        const key = lang.toLowerCase().replace(/\s+/g, '');
        const emoji = LANG_EMOJI[key] || '';
        const active = key === activeId;
        return (
          <div
            key={key}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            onClick={() => onSelect(key)}
          >
            {emoji ? `${emoji} ` : ''}{lang}
          </div>
        );
      })}
    </div>
  );
}
