// Loaded on /what-you-can-build/ only (no framework, a few hundred bytes). The page works
// without it: every video shows its poster and has controls. With it, a video plays, muted and
// looping, while most of it is on screen and pauses when it scrolls away, so only the videos
// someone looks at are downloaded. Nothing plays for visitors who prefer reduced motion, and a
// video the visitor paused stays paused.

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const videos = [...document.querySelectorAll<HTMLVideoElement>('video.demo-video')];
/** Videos we paused ourselves, so a `pause` event from anything else means the visitor did. */
const ourPause = new WeakSet<HTMLVideoElement>();
const visitorPaused = new WeakSet<HTMLVideoElement>();

const pause = (video: HTMLVideoElement): void => {
  if (video.paused) return;
  ourPause.add(video);
  video.pause();
};

const visible = new IntersectionObserver(
  (entries) => {
    for (const { target, isIntersecting } of entries) {
      const video = target as HTMLVideoElement;
      if (!isIntersecting) pause(video);
      else if (!reduced.matches && !visitorPaused.has(video)) {
        video.play().catch(() => {
          // Autoplay refused (a browser setting): the controls are still there.
        });
      }
    }
  },
  { threshold: 0.6 },
);

for (const video of videos) {
  video.addEventListener('pause', () => {
    if (ourPause.has(video)) ourPause.delete(video);
    else visitorPaused.add(video);
  });
  video.addEventListener('play', () => visitorPaused.delete(video));
  visible.observe(video);
}

reduced.addEventListener('change', () => {
  if (reduced.matches) for (const video of videos) pause(video);
});
