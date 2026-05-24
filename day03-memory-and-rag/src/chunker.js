/**
 * Day 3：自包含学习源码。
 *
 * 这个文件属于 day03-memory-and-rag，不能 import 其它 day 的源码。
 * 注释说明保留在文件顶部，帮助学习时先理解本文件职责。
 */
// 教学：导出函数：这是当前模块提供给测试、CLI 或其它本 day 文件使用的能力。
export function chunkMarkdown(content) {
  // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
  const sections = String(content || '')
    .split(/\n(?=##\s+)/)
    .map((part) => part.trim())
    .filter((part) => part.startsWith('## '));

  // 教学：返回结果：调用方会拿到这个值继续后续流程。
  return sections.map((section, index) => {
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const lines = section.split('\n');
    // 教学：定义常量：这个值只在当前作用域读取，不会被重新赋值。
    const heading = lines[0].replace(/^#+\s*/, '').trim() || `chunk-${index + 1}`;
    // 教学：返回结果：调用方会拿到这个值继续后续流程。
    return {
      id: `chunk-${index + 1}`,
      title: heading,
      text: lines.slice(1).join('\n').trim() || section,
    };
  });
}
