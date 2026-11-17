import { Instagram } from "lucide-react";

export default function BrandStory({ settings }) {
  return (
    <section id="story" className="sb2 sb-story" aria-labelledby="sb-story-title">
      <div className="sb-story__inner">
        <div>
          <p className="sb-accent sb-story__eyebrow">{settings.storyEyebrow}</p>
          <h2 id="sb-story-title">{settings.storyTitle}</h2>
          <p className="sb-story__text">{settings.storyText}</p>
        </div>
        <div className="sb-story__card">
          <Instagram size={28} aria-hidden="true" />
          <h3>Follow along on Instagram</h3>
          <p>Packing days, new drops, and behind-the-scenes.</p>
          <a className="sb-btn sb-btn--primary" href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
            @{settings.instagramHandle}
          </a>
        </div>
      </div>
    </section>
  );
}
