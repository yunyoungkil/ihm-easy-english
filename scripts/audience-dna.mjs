// 시청자 고민 데이터(data/youtube/audience-dna.json) 합치기 규칙 — 한곳에서만 정한다(2026-11-12).
// 서버의 댓글 분석(upsertAudienceDna)과 합친 아웃라이어 리포트(outlier-report.mjs)가 같이 쓴다.
// 예전에는 서버 안에만 있었고, 같은 영상을 다시 분석하면 출처는 그대로인데 횟수만 또 올라갔다(고침).
import {readFileSync, writeFileSync, renameSync, existsSync} from 'node:fs';

export const AUDIENCE_DNA_MAX_ENTRIES = 300;

export const normalizeDnaText = (text) => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * newEntries: [{type, text, videoId, channelTitle, sourceType}]
 * 같은 종류·같은 문장은 한 항목으로 합치고, 다른 영상에서 또 나오면 횟수와 출처를 늘린다.
 * 같은 영상이 이미 출처에 있으면 다시 세지 않는다. 최대 개수를 넘으면 많이 나온 것, 같으면 최근 것을 남긴다.
 */
export function mergeAudienceDna(store = {}, newEntries = [], now = new Date().toISOString(), {max = AUDIENCE_DNA_MAX_ENTRIES} = {}) {
  const byKey = new Map((store.entries || []).map((e) => [`${e.type}:${normalizeDnaText(e.text)}`, {...e, sources: [...(e.sources || [])]}]));
  for (const raw of newEntries) {
    const text = String(raw?.text || '').trim();
    if (!text || !raw.type) continue;
    const key = `${raw.type}:${normalizeDnaText(text)}`;
    const source = raw.videoId ? {videoId: raw.videoId, channelTitle: raw.channelTitle || '', sourceType: raw.sourceType || ''} : null;
    const existing = byKey.get(key);
    if (existing) {
      if (source && existing.sources.some((s) => s.videoId === source.videoId)) continue;
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.lastSeenAt = now;
      if (source) {
        existing.sources.push(source);
        if (existing.sources.length > 10) existing.sources = existing.sources.slice(-10);
      }
    } else {
      byKey.set(key, {id: key, type: raw.type, text, occurrences: 1, sources: source ? [source] : [], firstSeenAt: now, lastSeenAt: now});
    }
  }
  const entries = [...byKey.values()]
    .sort((a, b) => (b.occurrences - a.occurrences) || (new Date(b.lastSeenAt) - new Date(a.lastSeenAt)))
    .slice(0, max);
  return {...store, schemaVersion: store.schemaVersion || 1, updatedAt: now, entries};
}

/** 파일을 읽어 합치고, 임시 파일에 쓴 뒤 바꿔 끼운다(쓰는 도중 끊겨도 파일이 반쯤 깨지지 않게). */
export function upsertAudienceDnaFile(path, newEntries, now = new Date().toISOString()) {
  if (!newEntries?.length) return 0;
  let store = {schemaVersion: 1, entries: []};
  if (existsSync(path)) {
    try { store = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { /* 깨진 파일이면 새로 시작하지 않고 멈춘다 */ throw new Error(`${path}를 읽을 수 없어 시청자 고민을 쓰지 않았다`); }
  }
  const before = (store.entries || []).length;
  const merged = mergeAudienceDna(store, newEntries, now);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(merged, null, 2), 'utf8');
  renameSync(tmp, path);
  return merged.entries.length - before;
}
