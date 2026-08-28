# HyperFrames 전면 전환 (Remotion 신규 제작 중단)

결정일: 2026-08-26

## 결정

**새 제작은 전부 HyperFrames로 한다.** 롱폼·쇼츠·썸네일 구분 없이, 시즌2 EP11부터의 롱폼도 포함한다.
**Remotion은 신규 제작에 더 이상 쓰지 않는다.** 저장소에 남아 있는 Remotion 코드(`src/`, `theme.ts`,
`CardScene` 등, 루트 `CLAUDE.md`가 문서화한 전체 파이프라인)는 **EP6~EP10을 재렌더할 필요가 생길 경우에만**
쓰는 보존용이며, 새 기능을 추가하거나 다음 편을 위해 고치지 않는다.

이 문서는 [HyperFrames 도입 비교 실험](2026-08-23-hyperframes-pilot.md)(2026-08-23)의 후속 결정이다.
그 문서가 걸어둔 "실제 시제품 비교 후 채택 범위 결정" 조건이 충족되어 전면 채택으로 마무리됐다.

## 이유

- EP9의 썸네일 자체가 이미 HyperFrames로 제작됐다 — 실무가 이미 HyperFrames 쪽으로 넘어가 있었다.
- EP10 쇼츠 A·B를 HyperFrames로 만들어보며 파이프라인(체크·스냅샷·렌더·업로드 패키지)이 이미 실전에서
  검증됐다([시즌1 EP10](../episodes/season1-ep10.md) 참고).
- 두 파이프라인을 동시에 유지하는 비용(CLAUDE.md/AGENTS.md 중복 관리, 규칙 두 곳에 분산)이 이미
  드러났다([위키 정리 결정](../../CLAUDE.md) 참고 — 오늘 세션 초반에 CLAUDE.md/AGENTS.md 중복을 정리한 바 있음).

## 영향받는 문서 — 이 결정 이후 "Remotion"을 가리키던 부분은 전부 레거시 취급

- 루트 `CLAUDE.md`("이해하면 쉬운영어 — Remotion 프로젝트"): EP6~EP10 재렌더 참고용으로만 보존. 새 작업
  지시서로 읽지 않는다.
- `knowledge/thumbnail-strategy.md`: "Remotion으로 합성" 표현을 "HyperFrames로 합성"으로 정정
  (EP9 결정 기록 포함 — 애초에 사실관계가 Remotion이 아니라 HyperFrames였다).
- 앞으로 새 문서·코드에서 "다음 편 만들 때" 절차를 안내할 때는 `CLAUDE.md`의 Remotion 워크플로우가 아니라
  `/hyperframes` 스킬 진입점을 기준으로 안내한다.

## 다음에 필요한 것

- 시즌2 EP11 착수 시, 롱폼용 HyperFrames 프로젝트 구조(카드 스타일 3단 구성, 진행 점, 타임코드 등
  `CLAUDE.md`의 cardStyle 규칙 중 유지할 것 vs 재설계할 것)를 먼저 정리해야 한다 — 지금은 Remotion
  `CardScene`에만 구현돼 있고 HyperFrames 쪽엔 롱폼용 템플릿이 아직 없다.

## 관련 문서

- [HyperFrames 도입 비교 실험](2026-08-23-hyperframes-pilot.md) (선행 결정)
- [지금 할 일](../now.md)
