import React, { useState } from 'react';
import styles from './LinkPreview.module.css';
import useLinkOEmbed from '../../hooks/useLinkOEmbed';

/**
 * Rich Open-Graph / oEmbed preview for a URL shared inside a forum post.
 *
 * Three render states driven by the hook result:
 *   • loading — compact spinner chip so the card doesn't pop in from nothing
 *   • rich    — full card with image, domain, title, description
 *   • minimal — "domain + url" chip when oEmbed returned nothing useful or
 *               the request failed; still tappable to open the URL
 *
 * Clicking/tapping anywhere on the element opens the URL in a new tab.
 */
export default function LinkPreview({ url }) {
  const { data, loading } = useLinkOEmbed(url);
  const [imageFailed, setImageFailed] = useState(false);

  if (loading) {
    return (
      <a
        className={styles.loadingChip}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.spinner} aria-hidden="true" />
        <span className={styles.loadingDomain}>{displayDomain(url)}</span>
      </a>
    );
  }

  const hasRichCard = !!data && (!!data.title || (!!data.image && !imageFailed));

  if (!hasRichCard) {
    return (
      <a
        className={styles.chip}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.chipIcon} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </span>
        <span className={styles.chipText}>
          <span className={styles.chipDomain}>
            {data?.domain || displayDomain(url)}
          </span>
          <span className={styles.chipUrl}>
            {url.replace(/^https?:\/\/(www\.)?/, '')}
          </span>
        </span>
        <svg className={styles.chipArrow} width="14" height="14" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" strokeWidth="2"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>
    );
  }

  const showImage = !!data.image && !imageFailed;
  const title     = data.title || displayDomain(url);
  const domain    = data.domain || displayDomain(url);

  return (
    <a
      className={styles.card}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showImage && (
        <img
          src={data.image}
          alt=""
          className={styles.cardImage}
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      )}
      <div className={styles.cardBody}>
        <span className={styles.cardDomain}>{domain}</span>
        <span className={styles.cardTitle}>{title}</span>
        {!!data.description && (
          <span className={styles.cardDescription}>{data.description}</span>
        )}
      </div>
    </a>
  );
}

function displayDomain(url) {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
