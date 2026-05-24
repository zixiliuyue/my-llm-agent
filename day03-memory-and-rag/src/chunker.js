export function chunkMarkdown(content) {
  const sections = String(content || '')
    .split(/\n(?=##\s+)/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith('## '));

  return sections.map((section, index) => {
    const lines = section.split('\n');
    const heading = lines[0].replace(/^#+\s*/, '').trim() || `chunk-${index + 1}`;
    return {
      id: `chunk-${index + 1}`,
      title: heading,
      text: lines.slice(1).join('\n').trim() || section,
    };
  });
}
