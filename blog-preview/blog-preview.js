const playerDialog = document.querySelector('[data-youtube-player-dialog]');
const playerFrame = document.querySelector('[data-youtube-player-frame]');
const playerLink = document.querySelector('[data-youtube-player-link]');

const closePlayer = () => {
  playerFrame?.replaceChildren();
  if (playerDialog?.open) playerDialog.close();
};

document.querySelector('.preview-body')?.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-youtube-trigger]');
  if (!trigger || !playerDialog || !playerFrame || !playerLink) return;
  const id = trigger.closest('figure[data-youtube-id]')?.dataset.youtubeId || '';
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  event.preventDefault();
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  iframe.title = 'YouTube video player';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  playerFrame.replaceChildren(iframe);
  playerLink.href = `https://www.youtube.com/watch?v=${id}`;
  playerDialog.showModal();
});

document.querySelector('[data-youtube-player-close]')?.addEventListener('click', closePlayer);
playerDialog?.addEventListener('click', (event) => { if (event.target === playerDialog) closePlayer(); });
playerDialog?.addEventListener('close', () => playerFrame?.replaceChildren());
