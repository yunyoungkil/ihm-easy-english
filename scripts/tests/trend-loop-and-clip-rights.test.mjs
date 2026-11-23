// 트렌드 루프·3축 성과 비교·원본 클립 권리 차단·누락 알림 통합 단위 테스트 (2026-11-23 확정).
import assert from 'node:assert/strict';
import test from 'node:test';
import {clipRightsProblems, trendRefProblems} from '../transform-sheet.mjs';
import {compareTrendVsNonTrend} from '../sheet-outcomes.mjs';
import {renderKoreanTrends} from '../next-episode-input.mjs';
import {collectWorkflowSignals} from '../loop-health.mjs';
import {renderTransformSheetPage} from '../outlier-report-view.mjs';

test('trendRefProblems: 기존 시트 호환 + 활용/미활용/예약 순서 조정 필수 검증', () => {
  assert.deepEqual(trendRefProblems({}), [], '기존 시트(trendRef 없음)는 기본 호환 통과');
  assert.equal(trendRefProblems({}, {requireTrendRef: true}).length, 1);

  assert.deepEqual(trendRefProblems({
    trendRef: {used: false, reason: '13·14절 화제 중 3060 영어와 자연 연결되는 소재 없음'},
  }), []);

  const missingUsed = trendRefProblems({trendRef: {used: true, reason: '화제 활용'}});
  assert.equal(missingUsed.length, 4, 'used=true면 topic·source·sourceDate·howIntegrated 4개 필수');

  const missingShiftReason = trendRefProblems({
    trendRef: {
      used: true,
      topic: '존박 맥도날드 랩',
      source: '14절 스튜디오 조사',
      sourceDate: '2026-11-23',
      howIntegrated: '외래어 세트·주문 영어 발음 차이로 연결',
      reason: '화제 속 실제 영어 주문 장벽이 3060 고민과 직결',
      scheduleShift: {requested: true},
    },
  });
  assert.equal(missingShiftReason.length, 1);
  assert.ok(missingShiftReason[0].includes('예약 순서 조정'));

  assert.deepEqual(trendRefProblems({
    trendRef: {
      used: true,
      topic: '존박 맥도날드 랩',
      source: '14절 스튜디오 조사',
      sourceDate: '2026-11-23',
      howIntegrated: '외래어 세트·주문 영어 발음 차이로 연결',
      reason: '화제 속 실제 영어 주문 장벽이 3060 고민과 직결',
      scheduleShift: {requested: true, reason: '화제 식기 전 공개 위해 EP36을 EP35 앞으로 이동', pushedBack: ['EP35']},
    },
  }), []);
});

test('clipRightsProblems: 외부 클립 증빙 누락 차단 + CC BY 3대 조건 + 60초 초과 리믹스 + 서면 허락 + 법적 인용 예외', () => {
  // 1) 자체 제작(usesExternalClip: false) 통과
  assert.deepEqual(clipRightsProblems({clipRights: {usesExternalClip: false}}), []);

  // 2) 컷 계획에 externalClip: true가 있는데 clipRights가 없으면 즉시 차단
  const cutWithoutRights = clipRightsProblems({
    rows: [{key: 'visual', ours: {cutPlan: {durationSeconds: 40, cuts: [{t: 0, externalClip: true}]}}}],
  });
  assert.equal(cutWithoutRights.length, 1);
  assert.ok(cutWithoutRights[0].includes('권리 기록'));

  // 3) CC BY: 3대 안전 조건 누락 시 차단, 전부 채우면 통과
  const badCc = clipRightsProblems({
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/abc12345678',
        pathway: 'cc_by',
        scope: '상업적 편집·인용 가능(CC BY)',
        segment: '0:05~0:09',
        transformBasis: '원어민 3초 발화 뒤 35초 한국어 발음 원리 해설',
        ccProof: {officialChannelConfirmed: false, capturePath: '', capturedAt: '', attributionText: ''},
      }],
    },
  });
  assert.equal(badCc.length, 4, 'CC BY 3대 조건(공식 채널·캡처·날짜·출처표기) 누락 4건 차단');

  const okCc = clipRightsProblems({
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/abc12345678',
        pathway: 'cc_by',
        scope: '상업적 편집·인용 가능(CC BY)',
        segment: '0:05~0:09',
        transformBasis: '원어민 3초 발화 뒤 35초 한국어 발음 원리 해설',
        ccProof: {
          officialChannelConfirmed: true,
          capturePath: 'rights/cc-abc12345678.png',
          capturedAt: '2026-11-23',
          attributionText: 'Original clip by OfficialChannel (CC BY)',
        },
      }],
    },
  });
  assert.deepEqual(okCc, []);

  // 4) 쇼츠 리믹스: 60초 초과 + 원작자 공식 채널 미확인 + 유튜브 전용/연동 삭제 미확인 차단
  const longRemix = clipRightsProblems({
    format: 'SHORTS',
    rows: [{key: 'visual', ours: {cutPlan: {durationSeconds: 75, cuts: [{t: 0}]}}}],
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/remix123456',
        pathway: 'shorts_remix',
        scope: '리믹스 허용 원본',
        segment: '0:00~0:04',
        transformBasis: '4초 발음 훅 후 우리 원리 풀이',
      }],
    },
  });
  assert.equal(longRemix.length, 3);
  assert.ok(longRemix.some((m) => m.includes('60초 초과')));
  assert.ok(longRemix.some((m) => m.includes('원작자 공식 채널')));
  assert.ok(longRemix.some((m) => m.includes('유튜브 내부 전용')));

  const okRemix = clipRightsProblems({
    format: 'SHORTS',
    rows: [{key: 'visual', ours: {cutPlan: {durationSeconds: 42, cuts: [{t: 0}]}}}],
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/remix123456',
        pathway: 'shorts_remix',
        scope: '리믹스 허용 원본',
        segment: '0:00~0:04',
        transformBasis: '4초 발음 훅 후 우리 원리 풀이',
        officialChannelConfirmed: true,
        youtubeOnlyAcknowledged: true,
      }],
    },
  });
  assert.deepEqual(okRemix, []);

  // 5) 서면 허락(이메일·SNS DM): sent는 차단, approved는 통과
  const pendingMail = clipRightsProblems({
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/perm1234567',
        pathway: 'written_permission',
        scope: '쇼츠 1편 5초 구간 수익화 허용',
        segment: '1:10~1:15',
        transformBasis: '5초 대사 인용 후 38초 영어 표현 해설',
        permissionEmail: {status: 'sent', threadId: 'thr_123'},
      }],
    },
  });
  assert.equal(pendingMail.length, 1);
  assert.ok(pendingMail[0].includes('확정(approved)되지 않았다'));

  const approvedDm = clipRightsProblems({
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/perm1234567',
        pathway: 'written_permission',
        scope: '채널 포괄 허락(설명란 출처 링크 표기 조건)',
        segment: '1:10~1:15',
        transformBasis: '5초 대사 인용 후 38초 영어 표현 해설',
        permissionContact: {channel: 'dm', status: 'approved', blanketScope: 'channel'},
      }],
    },
  });
  assert.deepEqual(approvedDm, []);

  // 6) 법적 인용 예외: 5개 항목(주·종, 4요소, 동일성유지권, 매칭 회피 트릭 미사용, YPP 리스크 확인) 모두 있어야 통과
  const badCitation = clipRightsProblems({
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/cite1234567',
        pathway: 'legal_citation',
        scope: '저작권법 제28조·제35조의5 교육 인용',
        segment: '0:20~0:23',
        transformBasis: '3초 발음 대조용 보조 인용',
        citationReview: {primaryOursCheck: '우리 해설 90%', yppRiskAcknowledged: false},
      }],
    },
  });
  assert.equal(badCitation.length, 4);
  assert.ok(badCitation.some((m) => m.includes('자동 매칭 회피용 변형')));

  const okCitation = clipRightsProblems({
    clipRights: {
      usesExternalClip: true,
      clips: [{
        sourceUrl: 'https://youtu.be/cite1234567',
        pathway: 'legal_citation',
        scope: '저작권법 제28조·제35조의5 교육 인용',
        segment: '0:20~0:23',
        transformBasis: '3초 발음 대조용 보조 인용',
        citationReview: {
          primaryOursCheck: '우리 해설이 주(92%), 원본은 발음 비교 보조 3초',
          fairUseFourFactors: '비대체 교육 변형, 최소 분량, 원본 시장 대체 없음',
          integrityCheck: '원본 발화 맥락 그대로 유지, 왜곡·비하 없음',
          noEvasionTricksConfirmed: true,
          yppRiskAcknowledged: true,
        },
      }],
    },
  });
  assert.deepEqual(okCitation, []);
});

test('compareTrendVsNonTrend & renderKoreanTrends: 7일 3축(조회수·구독전환·시청지속) 분리 비교와 측정 전 처리', () => {
  const empty = compareTrendVsNonTrend([]);
  assert.equal(empty.SHORTS.trend.n, 0);
  assert.equal(empty.SHORTS.trend.medianViews7d, null);

  const sheets = [
    {
      format: 'SHORTS',
      trendRef: {used: true, topic: '화제A', source: '13절', sourceDate: '2026-11-23', howIntegrated: '연결', reason: '이유'},
      results: [{format: 'SHORTS', videoId: 'T1', metrics: {views7d: {value: 2000}, subs7d: {value: 10}, watchSeconds7d: {value: 32}, stayedToWatch: {value: 58}}}],
    },
    {
      format: 'SHORTS',
      trendRef: {used: false, reason: '일반 발음 편'},
      results: [{format: 'SHORTS', videoId: 'N1', metrics: {views7d: {value: 1000}, subs7d: {value: 12}, watchSeconds7d: {value: 36}, stayedToWatch: {value: 64}}}],
    },
  ];
  const cmp = compareTrendVsNonTrend(sheets);
  assert.equal(cmp.SHORTS.trend.n, 1);
  assert.equal(cmp.SHORTS.trend.medianViews7d, 2000);
  assert.equal(cmp.SHORTS.trend.subsPer1000Views, 5);
  assert.equal(cmp.SHORTS.trend.medianStayedToWatch, 58);
  assert.equal(cmp.SHORTS.nonTrend.subsPer1000Views, 12);

  const md = renderKoreanTrends({
    collectedAt: '2026-11-23T06:00:00Z',
    googleTrends: [{keyword: '테스트', approxTraffic: '100+', publishedAt: '2026-11-23T05:00:00Z', newsItems: []}],
    youtubePopular: [],
    overseasKorean: [],
    sources: {googleTrendsKr: {ok: true, count: 1}, youtubePopularKr: {ok: true, count: 0}, overseasKoreanYt: {ok: true, count: 0}},
  }, cmp).join('\n');
  assert.ok(md.includes('트렌드 편 vs 일반 편 7일 3축 비교'));
  assert.ok(md.includes('2,000회'));
  assert.ok(md.includes('5명'));
  assert.ok(md.includes('측정 전'));
});

test('collectWorkflowSignals: 트렌드 지연·해외 소스 실패·시트 검토 누락(비강요)·허락 메일 회신 대기 알림', () => {
  const now = new Date('2026-11-26T00:00:00Z');
  const signals = collectWorkflowSignals({
    now,
    koreanTrends: {
      collectedAt: '2026-11-23T00:00:00Z', // 72시간 전 -> 48시간 초과
      sources: {
        googleTrendsKr: {ok: true, count: 10},
        youtubePopularKr: {ok: true, count: 20},
        overseasKoreanYt: {ok: false, error: 'HTTP 403'},
      },
    },
    transformSheets: [
      // 기준 시각 이전 옛 시트는 누락 알림에서 제외
      {episodeId: 'ep35-old', createdAt: '2026-11-23T05:00:00Z'},
      // 기준 시각 이후 시트인데 trendRef 없음 -> 누락 알림 발생
      {episodeId: 'ep36-missing-trend', createdAt: '2026-11-24T05:00:00Z'},
      // 서면 허락 메일 발송 대기 건 -> 회신 확인 알림 발생
      {
        episodeId: 'ep37-mail-wait',
        createdAt: '2026-11-25T05:00:00Z',
        trendRef: {used: true, reason: '화제 연결'},
        clipRights: {
          usesExternalClip: true,
          clips: [{pathway: 'written_permission', sourceUrl: 'https://youtu.be/abc', permissionEmail: {status: 'sent', threadId: 'thr_99'}}],
        },
      },
    ],
  });
  assert.ok(signals.some((s) => s.finding.includes('72시간')));
  assert.ok(signals.some((s) => s.finding.includes('해외 한국 콘텐츠')));
  const reviewSignal = signals.find((s) => s.area === '트렌드 검토 기록 누락');
  assert.ok(reviewSignal);
  assert.ok(reviewSignal.finding.includes('ep36-missing-trend'));
  assert.ok(!reviewSignal.finding.includes('ep35-old'), '결정 이전 시트는 누락으로 잡지 않는다');
  const mailSignal = signals.find((s) => s.area === '원본 클립 허락 메일 회신 대기');
  assert.ok(mailSignal);
  assert.ok(mailSignal.finding.includes('thr_99'));
});

test('renderTransformSheetPage: trendRef·scheduleShift·clipRights 읽기 전용 카드 렌더링', () => {
  const html = renderTransformSheetPage({
    episodeId: 'ep36-demo',
    format: 'SHORTS',
    topic: '데모 소재',
    status: 'draft',
    identityShare: {ours: 60, competitor: 40, reason: '테스트'},
    rows: [],
    trendRef: {
      used: true,
      topic: '존박 맥도날드 랩',
      source: '14절',
      sourceDate: '2026-11-23',
      howIntegrated: '주문 영어 발음 차이',
      reason: '화제 연결',
      scheduleShift: {requested: true, reason: '화제 수명 내 공개', pushedBack: ['EP35']},
    },
    clipRights: {usesExternalClip: false},
  }, null, []);
  assert.ok(html.includes('트렌드 검토 기록'));
  assert.ok(html.includes('예약 순서 조정 요청'));
  assert.ok(html.includes('원본 클립 권리 기록'));
  assert.ok(html.includes('자체 제작'));
});
