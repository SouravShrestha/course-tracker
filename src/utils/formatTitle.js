/**
 * Formats a raw file/folder name into a readable title.
 * All leading digit groups (e.g. "01_02_") are stripped — the caller is
 * responsible for providing its own sequential counter.
 * Underscores and hyphens in the remaining text are replaced with spaces.
 */
export function formatTitle(raw) {
  if (!raw) return '';

  // Strip file extension
  let name = raw.replace(/\.\w{2,4}$/, '');

  // Strip one or two leading digit groups with any separator (_, ., -, space)
  name = name.replace(/^(\d+[_.\-\s]+)+/, '');

  return titleCase(cleanSeparators(name));
}

function cleanSeparators(str) {
  return str.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleCase(str) {
  return str
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

