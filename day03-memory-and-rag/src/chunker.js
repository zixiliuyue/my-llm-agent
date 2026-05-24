/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
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
