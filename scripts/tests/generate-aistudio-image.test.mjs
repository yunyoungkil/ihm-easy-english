// scripts/generate-aistudio-image.mjs의 인자 검사와 저장 형식 시험(2026-11-12). 브라우저는 부르지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgs, DEFAULT_MODEL, extensionFor, ASPECTS} from '../generate-aistudio-image.mjs';

test('기본값은 16:9, Nano Banana 2.1이고 프롬프트·저장 위치는 꼭 필요하다', () => {
  const a = parseArgs(['--prompt', '그림', '--output', 'a.png']);
  assert.equal(a.aspect, '16:9');
  assert.equal(a.model, DEFAULT_MODEL);
  assert.throws(() => parseArgs(['--output', 'a.png']), /--prompt/);
  assert.throws(() => parseArgs(['--prompt', 'x']), /--output/);
});

test('지원하지 않는 비율과 이상한 모델 이름은 막는다', () => {
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.png', '--aspect', '7:5']), /--aspect/);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.png', '--model', 'a b;rm']), /--model/);
  for (const r of ['16:9', '9:16', '1:1', 'Auto']) assert.ok(ASPECTS.includes(r));
});

test('실제 이미지 형식(JPEG/PNG)과 저장 확장자가 다르면 확장자를 맞춘다', () => {
  assert.equal(extensionFor('image/jpeg', 'a.png'), 'a.jpg');
  assert.equal(extensionFor('image/png', 'a.jpg'), 'a.png');
  assert.equal(extensionFor('image/jpeg', 'a.jpeg'), 'a.jpeg');
  assert.equal(extensionFor('image/png', 'dir/a'), 'dir/a.png');
});
