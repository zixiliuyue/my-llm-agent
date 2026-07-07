/**
 * Day 65：多模态 Agent 理解。
 *
 * 学习目标：覆盖图片、语音、视频理解方向，包括 caption、OCR、物体识别、图片质量评分、
 * NSFW/PII/EXIF 清理、关键帧分析和多模态 eval。默认 mock adapter，真实模型只需替换 adapter。
 */

const PII_PATTERNS = [
  { type: "email", pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "phone", pattern: /\b1[3-9]\d{9}\b/g },
];

function redactText(text) {
  const findings = [];
  let output = text;
  for (const rule of PII_PATTERNS) {
    output = output.replace(rule.pattern, (match) => {
      findings.push({ type: rule.type, sample: match.slice(0, 6) });
      return `[REDACTED:${rule.type}]`;
    });
  }
  return { text: output, findings };
}

/** 默认 mock 多模态 adapter；真实实现可替换成本地 vision/audio/video 模型。 */
export function createMockMultimodalAdapter() {
  return {
    analyzeImage(asset) {
      const ocr = asset.ocrText || "Agent run timeline approval evidence";
      const redacted = redactText(ocr);
      return {
        caption: asset.caption || "A screenshot of an agent operations console",
        ocrText: redacted.text,
        piiFindings: redacted.findings,
        objects: asset.objects || ["timeline", "approval button", "evidence panel"],
        quality: scoreImageQuality(asset),
        nsfw: Boolean(asset.nsfw),
        exifRemoved: true,
      };
    },
    analyzeAudio(asset) {
      const transcript = redactText(asset.transcript || "请总结 agent runtime 的失败恢复策略");
      return {
        transcript: transcript.text,
        piiFindings: transcript.findings,
        language: asset.language || "zh-CN",
        intent: "summarize-agent-runtime",
        quality: asset.noiseDb && asset.noiseDb > 60 ? "noisy" : "clear",
      };
    },
    analyzeVideo(asset) {
      const frames = extractKeyframes(asset);
      return {
        durationSec: asset.durationSec || 12,
        keyframes: frames,
        summary: "Video shows an agent run moving from approval to final report",
        motionRisk: frames.some((frame) => frame.quality.blur > 0.6) ? "needs-review" : "ok",
      };
    },
  };
}

/** 图片质量评分：真实系统可换成 blur/brightness/contrast 模型。 */
export function scoreImageQuality(asset) {
  const blur = asset.blur ?? 0.18;
  const brightness = asset.brightness ?? 0.72;
  const textCoverage = asset.textCoverage ?? 0.42;
  const score = 1 - blur * 0.5 - Math.abs(0.65 - brightness) * 0.3 + Math.min(textCoverage, 0.5) * 0.2;
  return {
    score: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
    blur,
    brightness,
    textCoverage,
    usableForEval: blur < 0.5 && brightness > 0.25 && brightness < 0.95,
  };
}

/** 关键帧抽取：教学版按时间戳采样，真实系统可用 scene detection。 */
export function extractKeyframes(videoAsset, count = 3) {
  const duration = videoAsset.durationSec || 12;
  return Array.from({ length: count }, (_, index) => {
    const timestampSec = Number(((duration / (count + 1)) * (index + 1)).toFixed(2));
    return {
      id: `frame-${index + 1}`,
      timestampSec,
      caption: videoAsset.frameCaptions?.[index] || `agent workflow frame ${index + 1}`,
      quality: scoreImageQuality(videoAsset.frameQuality?.[index] || {}),
    };
  });
}

/** 统一分析入口：根据 mediaType 选择 adapter 能力。 */
export function inspectMediaAsset(asset, adapter = createMockMultimodalAdapter()) {
  if (asset.mediaType === "image") return { mediaType: "image", ...adapter.analyzeImage(asset) };
  if (asset.mediaType === "audio") return { mediaType: "audio", ...adapter.analyzeAudio(asset) };
  if (asset.mediaType === "video") return { mediaType: "video", ...adapter.analyzeVideo(asset) };
  throw new Error(`unsupported mediaType ${asset.mediaType}`);
}

/** 多模态 eval：检查 caption、OCR、PII 清理、质量和关键帧覆盖。 */
export function evaluateMultimodalUnderstanding(results) {
  const checks = results.map((result) => {
    if (result.mediaType === "image") {
      return {
        mediaType: "image",
        passed: Boolean(result.caption) && result.quality.usableForEval && result.nsfw === false && result.exifRemoved === true,
      };
    }
    if (result.mediaType === "audio") {
      return {
        mediaType: "audio",
        passed: Boolean(result.transcript) && result.quality !== "noisy",
      };
    }
    return {
      mediaType: "video",
      passed: result.keyframes.length >= 3 && result.motionRisk === "ok",
    };
  });
  return {
    checks,
    passRate: Number((checks.filter((check) => check.passed).length / checks.length).toFixed(3)),
    passed: checks.every((check) => check.passed),
  };
}

/** CLI demo：同时分析图片、语音和视频。 */
export function runDemo() {
  const adapter = createMockMultimodalAdapter();
  const image = inspectMediaAsset({
    mediaType: "image",
    ocrText: "owner ops@example.com approval evidence",
    blur: 0.15,
    nsfw: false,
  }, adapter);
  const audio = inspectMediaAsset({
    mediaType: "audio",
    transcript: "请检查 agent run timeline 和 evidence board",
    noiseDb: 35,
  }, adapter);
  const video = inspectMediaAsset({
    mediaType: "video",
    durationSec: 18,
    frameCaptions: ["run list", "approval panel", "final report"],
  }, adapter);
  const evaluation = evaluateMultimodalUnderstanding([image, audio, video]);

  return {
    day: 65,
    title: "multimodal-agent-understanding",
    localOnly: true,
    image,
    audio,
    video,
    evaluation,
    adapterBoundary: "replace createMockMultimodalAdapter with local vision/audio/video models on Win10 + RTX 5060 Ti",
  };
}
