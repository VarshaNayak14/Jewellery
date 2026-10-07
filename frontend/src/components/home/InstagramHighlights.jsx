import { useEffect, useState } from 'react';
import { settingsAPI } from '../../services/api';
import './InstagramHighlights.css';

function instagramEmbedUrl(url) {
  const match = String(url || '').match(/^https?:\/\/(?:www\.)?instagram\.com\/(?:(p|reel|tv)\/([A-Za-z0-9_-]+)|((?!accounts(?:\/|$)|about(?:\/|$)|developer(?:\/|$)|direct(?:\/|$)|explore(?:\/|$)|legal(?:\/|$)|p(?:\/|$)|reel(?:\/|$)|reels(?:\/|$)|stories(?:\/|$)|tv(?:\/|$)|web(?:\/|$))[A-Za-z0-9._]{1,30}))\/?(?:\?.*)?$/i);
  if (!match) return null;
  return match[1]
    ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/?hidecaption=true&autoplay=1`
    : `https://www.instagram.com/${match[3]}/embed/?hidecaption=true&autoplay=1`;
}

export default function InstagramHighlights() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    settingsAPI.getPublic()
      .then(({ settings }) => {
        if (cancelled) return;
        const items = (settings?.instagramPosts || [])
          .map((post) => ({ ...post, embedUrl: instagramEmbedUrl(post.url) }))
          .filter((post) => post.embedUrl);
        setPosts(items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!posts.length) return null;

  return (
    <section className="ig-highlights">
      <div className="ig-highlights__inner">
        <div className="ig-highlights__heading">
          <span>Follow the sparkle</span>
          <h2>From <em>Instagram</em></h2>
          <p>Fresh inspiration, straight from our Instagram.</p>
        </div>
        <div className="ig-highlights__grid">
          {posts.map((post, index) => (
            <article className="ig-highlights__card" key={`${post.url}-${index}`}>
              <iframe
                src={post.embedUrl}
                title={`Instagram ${post.url.includes('/p/') || post.url.includes('/reel/') || post.url.includes('/tv/') ? 'post' : 'profile'} ${index + 1}`}
                loading="lazy"
                allow="encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
                scrolling="no"
              />
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ig-highlights__reel-link"
                aria-label="Open this Reel on Instagram"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
