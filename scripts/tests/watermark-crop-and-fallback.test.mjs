import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TRIM_RATIO,
  appendSafeMarginPrompt,
  computeWatermarkCrop,
} from '../watermark-crop.mjs';
import { parseArgs as parseFlowArgs } from '../generate-flow-video.mjs';
import { parseArgs as parseGeminiVideoArgs } from '../generate-web-gemini-video.mjs';
import { parseArgs as parseGeminiImageArgs } from '../generate-web-gemini-image.mjs';

test('appendSafeMarginPrompt adds vertical bottom margin guide for 9:16', () => {
  const out = appendSafeMarginPrompt('A ceramic coffee cup on a wooden desk', { aspect: '9:16' });
  assert.match(out, /Framing safety margin:/);
  assert.match(out, /bottom margin/i);
  assert.match(out, /bottom-right corner/i);
  // Idempotent when already present
  assert.equal(appendSafeMarginPrompt(out, { aspect: '9:16' }), out);
});

test('appendSafeMarginPrompt adds right margin guide for 16:9 and respects enabled=false', () => {
  const wide = appendSafeMarginPrompt('Wide classroom scene', { aspect: '16:9' });
  assert.match(wide, /right margin/i);
  const raw = appendSafeMarginPrompt('Keep exact framing', { aspect: '9:16', enabled: false });
  assert.equal(raw, 'Keep exact framing');
});

test('computeWatermarkCrop clears measured 144px bottom-right sparkle on 720x1280 vertical clips while preserving horizontal center', () => {
  const plan = computeWatermarkCrop({ width: 720, height: 1280 });
  assert.equal(plan.strategy, 'bottom-trim-center-x');
  assert.equal(plan.trimRatio, DEFAULT_TRIM_RATIO);
  assert.equal(plan.cropW, 630);
  assert.equal(plan.cropH, 1120);
  assert.equal(plan.x, 44); // evenFloor((720-630)/2) = evenFloor(45) = 44
  assert.equal(plan.y, 0);
  assert.equal(plan.outW, 1080);
  assert.equal(plan.outH, 1920);
  // Measured watermark top edge is at y = 1280 - 144 = 1136; cropH=1120 leaves 16px safety buffer
  assert.ok(plan.y + plan.cropH <= 1136 - 16, `expected bottom edge <= 1120, got ${plan.y + plan.cropH}`);
  assert.equal(plan.vf, 'crop=630:1120:44:0,scale=1080:1920:flags=lanczos');
});

test('computeWatermarkCrop clears right watermark edge on 1280x720 horizontal clips while preserving vertical center', () => {
  const plan = computeWatermarkCrop({ width: 1280, height: 720 });
  assert.equal(plan.strategy, 'right-trim-center-y');
  assert.equal(plan.cropW, 1120);
  assert.equal(plan.cropH, 630);
  assert.equal(plan.x, 0);
  assert.equal(plan.y, 44);
  assert.equal(plan.outW, 1920);
  assert.equal(plan.outH, 1080);
  assert.ok(plan.x + plan.cropW <= 1280 - 144 - 16);
});

test('computeWatermarkCrop handles 1:1 square images via top-left anchor trim', () => {
  const plan = computeWatermarkCrop({ width: 1024, height: 1024 });
  assert.equal(plan.strategy, 'bottom-right-trim');
  assert.equal(plan.cropW, 896);
  assert.equal(plan.cropH, 896);
  assert.equal(plan.x, 0);
  assert.equal(plan.y, 0);
  assert.equal(plan.outW, 1024);
  assert.equal(plan.outH, 1024);
});

test('computeWatermarkCrop rejects invalid dimensions or trim ratios', () => {
  assert.throws(() => computeWatermarkCrop({ width: 32, height: 32 }), /해상도/);
  assert.throws(() => computeWatermarkCrop({ width: 720, height: 1280, trimRatio: 0.5 }), /trimRatio/);
});

test('generate-flow-video parseArgs defaults and flags', () => {
  const d = parseFlowArgs(['--prompt', 'Coffee cup', '--output', 'tmp/out.mp4']);
  assert.equal(d.aspect, '9:16');
  assert.equal(d.model, 'Omni 1.2 Flash');
  assert.equal(d.resolution, '720p');
  assert.equal(d.safeMargin, true);
  assert.equal(d.crop, true);
  assert.equal(d.trimRatio, DEFAULT_TRIM_RATIO);

  const custom = parseFlowArgs([
    '--prompt', 'Studio desk',
    '--output', 'tmp/wide.mp4',
    '--aspect', '16:9',
    '--model', 'Veo 3.1 - Lite',
    '--resolution', '360p',
    '--no-safe-margin',
    '--no-crop',
    '--mute',
  ]);
  assert.equal(custom.aspect, '16:9');
  assert.equal(custom.model, 'Veo 3.1 - Lite');
  assert.equal(custom.resolution, '360p');
  assert.equal(custom.safeMargin, false);
  assert.equal(custom.crop, false);
  assert.equal(custom.mute, true);

  assert.throws(() => parseFlowArgs(['--prompt', 'x', '--output', 'y.mp4', '--aspect', '1:1']), /--aspect/);
  assert.throws(() => parseFlowArgs(['--prompt', 'x', '--output', 'y.mp4', '--model', 'Veo 3.1 - Fast']), /--model/);
});

test('generate-web-gemini-video parseArgs defaults and validation', () => {
  const d = parseGeminiVideoArgs(['--prompt', 'Cup', '--output', 'tmp/g.mp4']);
  assert.equal(d.aspect, '9:16');
  assert.equal(d.safeMargin, true);
  assert.equal(d.crop, true);
  assert.equal(d.trimRatio, DEFAULT_TRIM_RATIO);
  assert.throws(() => parseGeminiVideoArgs(['--output', 'tmp/g.mp4']), /--prompt/);
  assert.throws(() => parseGeminiVideoArgs(['--prompt', 'Cup', '--output', 'tmp/g.mp4', '--aspect', '4:3']), /--aspect/);
});

test('generate-web-gemini-image parseArgs defaults and options', () => {
  const d = parseGeminiImageArgs(['--prompt', 'Desk', '--output', 'tmp/i.png', '--aspect', '9:16']);
  assert.equal(d.aspect, '9:16');
  assert.equal(d.safeMargin, true);
  assert.equal(d.crop, true);
  assert.throws(() => parseGeminiImageArgs(['--prompt', 'Desk', '--aspect', '21:9']), /--aspect/);
});
