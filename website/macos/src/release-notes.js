// Render the release owner's Markdown body as native, escaped page content.
export function parseReleaseNotes(markdown) {
  const text = markdown.trim();
  if (/^---(?:\r?\n|$)/.test(text)) {
    throw new Error('Release notes must contain Markdown body only, without frontmatter');
  }
  const blocks = [];
  let paragraph = [];
  const flush = () => {
    if (paragraph.length) {
      const text = paragraph.join(' ');
      const type = /^\d{4}-\d{2}-\d{2}\s+\u00b7\s+macOS\b.+\bbuild\s+\d+$/.test(text) ? 'metadata' : 'paragraph';
      blocks.push({ type, text });
      paragraph = [];
    }
  };
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const bullet = line.match(/^\s*(?:[-*+] |\d+[.)] )(.+)$/);
    if (!line.trim()) { flush(); continue; }
    if (heading) {
      flush();
      // Version/platform/date already come from the same release metadata.
      if (heading[1].length > 1) blocks.push({ type: 'heading', text: heading[2] });
    } else if (bullet) {
      flush();
      const previous = blocks.at(-1);
      if (previous?.type === 'list') previous.items.push(bullet[1]);
      else blocks.push({ type: 'list', items: [bullet[1]] });
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}
