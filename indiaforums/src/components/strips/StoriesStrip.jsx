import styles from './StoriesStrip.module.css';
import StoryItem from '../ui/StoryItem';
import { STORIES } from '../../data/stories';

export default function StoriesStrip({ onItemPress }) {
  return (
    <div className={styles.strip}>
      <div className={styles.row}>
        {STORIES.map((s) => (
          <StoryItem
            key={s.id}
            emoji={s.emoji}
            label={s.label}
            bg={s.bg}
            hasStory={s.hasStory}
            onClick={() => onItemPress && onItemPress(s)}
          />
        ))}
      </div>
    </div>
  );
}
