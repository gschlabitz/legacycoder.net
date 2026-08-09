// Feather-style 24×24 fallback glyphs. Covers are optional and remote images
// can disappear; every media type therefore has a durable local visual.
export const TYPE_ICONS = {
  book:
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  show:
    '<rect x="2" y="7" width="20" height="15" rx="2"/>' +
    '<polyline points="17 2 12 7 7 2"/>',
  movie:
    '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>' +
    '<line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>' +
    '<line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/>' +
    '<line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/>' +
    '<line x1="17" y1="7" x2="22" y2="7"/>',
  video:
    '<polygon points="23 7 16 12 23 17 23 7"/>' +
    '<rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
  album:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>' +
    '<line x1="12" y1="2" x2="12" y2="9"/>',
  game:
    '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/>' +
    '<path d="M15 13h.01M18 11h.01"/>' +
    '<path d="M17.32 5H6.68a4 4 0 0 0-3.88 3.03L1 15.2A3 3 0 0 0 5.95 18l1.1-1.47h9.9l1.1 1.47A3 3 0 0 0 23 15.2l-1.8-7.17A4 4 0 0 0 17.32 5z"/>',
  podcast:
    '<circle cx="12" cy="11" r="1"/><path d="M8.5 14.5a5 5 0 1 1 7 0"/>' +
    '<path d="M5.7 17.3a9 9 0 1 1 12.6 0"/>' +
    '<path d="M9 22l1-7h4l1 7"/>',
};

export const STATUS_ICONS = {
  queued:
    '<circle cx="12" cy="12" r="10"/>' +
    '<polyline points="12 6 12 12 16 14"/>',
  consuming: '<polygon points="5 3 19 12 5 21 5 3"/>',
  finished: '<polyline points="20 6 9 17 4 12"/>',
  abandoned:
    '<line x1="18" y1="6" x2="6" y2="18"/>' +
    '<line x1="6" y1="6" x2="18" y2="18"/>',
};

export function mediaIcon(type) {
  return TYPE_ICONS[type];
}

export function mediaStatusIcon(status) {
  return STATUS_ICONS[status];
}
