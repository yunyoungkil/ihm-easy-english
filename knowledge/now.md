# 지금 할 일

마지막 확인: 2026-11-22

## ▶ 다음 할 일

급한 순서로 적는다. 새 대화의 시작 브리핑에 그대로 나온다. 끝난 항목은 바로 지우고, 새 일이 생기면 여기에 적는다.
- [ ] **11/22(일) Omni 하루 한도가 풀린 뒤 — EP33 방식 시험 마무리 (`videos/ep33-test-ai-craft`, 업로드 안 함)**: S4(단추가 단춧구멍으로 사라짐) 영상 2개 → 고른 지시문으로 S1~S4 1080p 다시 뽑아(`--parent`/`--changed-var`/`--status` 실브라우저 첫 확인 포함) 360p 시험본과 바꿈 → 필요 시 `node scripts/media-craft-tools.mjs unify-tone`·`compare-visual-metrics` 점검 → `npx hyperframes@0.9.77 snapshot . --at 0.3,2,5,8.5,11,12.5 --no-end --against <EP33 렌더>` 비교 → 사용자에게 렌더 승인 요청. EP33 자체는 고치지 않는다.
- [ ] **AI 티 남은 문제 논의 (2026-11-21~22 이어서)**: 끝난 것 — 유튜브 81편 + 추가 13편 조사(`knowledge/ai-craft-research-2026-11-21.md`), 기존 진입점(`episode-planning`·`comparison-sheet-playbook`·`google-ai-studio-prompting`) 탈템플릿 정합화(`b93fa04`), 참고 그림·첫/끝 장면·소리 유지·노드 계보(`--parent`)·로컬 미디어 보조 CLI(`npm run craft`, `9cf735f`), 쇼츠 말 빠르기 실측. 남은 것 — 3번(시트 점검)·5번(롱폼 포장)·6번(쇼츠→롱폼)·7번(인물 기본값 문구 정합), 제안 a(흔함 확률 후보) 사용자 결정, 스튜디오 비교 테스트 승패 미기록 버그(`scripts/studio-ab-tests.mjs`).
- [ ] **11/23(월) 사용자 확인**: 스튜디오 EP23 제목·썸네일 A/B 테스트 결과 확인 후 REVIEW.md 기록.
- [ ] **11/25(수) 이후 성과 정산**: EP30 쇼츠(Ng6amm9qFrI, 11/18 공개) 7일 성과 정산 및 style-experiments.md 기록 + 경쟁 쇼츠 SbQVBQoRciA v2 배수 재확인 + 검증 주제로 새 포맷 롱폼 기획 여부 결정.
- [ ] **11/28(토) 이후 성과 정산**: EP27 쇼츠(blowoldSorE, 11/21 공개) 7일 성과 정산 및 style-experiments.md 기록.
- [ ] **12/08(화) 이후 성과 정산**: EP31 쇼츠(AkDKw4o_C58, 12/01 예약) 7일 성과 정산 및 style-experiments.md 기록.
- [ ] **12/12(토) 이후 성과 정산**: EP32 쇼츠(YKaokru2ugg, 12/05 예약) 7일 성과 정산 및 style-experiments.md 기록 (0.3초 청각 시그니처 + 브라이트 에디토리얼 첫 시험).
- [ ] **12/15(화) 이후 성과 정산**: EP33 쇼츠(fVY5BNQ7Ciw, 12/08 예약) 7일 성과 정산 및 style-experiments.md 기록 (촉각 실물 매크로 + 0.15초 호흡 멈춤 + 3D 통과 게이트 챌린지 시험).
- [ ] **스튜디오 조사 2단계 관찰 → 3단계 전환**: 2단계 전환 완료(2026-11-20, `pickReportTargets` 조사 후보 우선·API v2 배수 직접 계산). 14일 관찰(수집 12일+ · 조사 출처 리포트 20편+, ~12/05 이후) 달성 시 직전 사용자 재확인 후 3단계(구 손입력 목록 정리) 착수.

## 관련 문서

- [채널 데이터 현황](channel-data-snapshot.md) — 롱폼 vs 쇼츠 실측, 성장 레버 판단 근거
- [콘텐츠 포맷](content-formats.md)
- [제작 규칙](production-rules.md)
- [썸네일 전략](thumbnail-strategy.md)
