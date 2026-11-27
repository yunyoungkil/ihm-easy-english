---
name: slop-rewrite
description: 한국어 제목·썸네일 카피·나레이션·설명글·문서의 AI 티(AI Slop)를 코드 검사기(67규칙)와 취향 문서로 진단·윤문한다. "윤문해줘", "AI 티 빼줘", "AI 티 검사", "나레이션 다듬어줘", "제목/썸네일 카피 다듬기", "/slop-rewrite" 요청에 사용한다.
---

# slop-rewrite (외부 본체 진입점)

본체는 저장소 안 `tools/slop-rewrite/.claude/skills/slop-rewrite/SKILL.md` 다(2026-11-27: 예전 경로인 다운로드 폴더의 slop-rewrite는 한 PC에만 있어 다른 PC에서 검사를 못 돌렸다).
그 파일을 읽고 따르며, Python 검사·윤문 명령은 저장소 루트 기준 `tools/slop-rewrite` 디렉터리에서 `python -X utf8 ...` 로 실행한다.

## 이 채널(유튜브 쇼츠·롱폼·설명글·내부 문서) 적용 규칙

1. **쇼츠·롱폼 시청자용 카피·구어체 나레이션에는 기본 블로그·보고서 문체 가이드(`장피엠`, `토스피드`, `업무 줄글`, `보고서`)를 씌우지 않는다.** (문어체로 굳는 것을 막기 위함. 내부 기획·분석 보고서 문서에는 장르에 맞춰 선택 적용 가능)
2. 대신 **`principles/ai-tells-ko.md` (67규칙 코드 검사: `check_ai_tells.py`) + `check_fidelity.py` (사실 보존) + `taste/writing-taste.md` (`W-01`~`W-08`: 쇼츠·롱폼 구어체, 메타 진행 안내 삭제, 시청자 반응 단정 금지, 과잉 평이화·어색한 동사 결합 방지, 챕터 구조 반복 방지)** 조합을 단일 창구로 적용한다.
3. 사용자가 "이 표현 AI 티 난다 / 내가 쓴다면 이렇게" 피드백을 주면 `tools/slop-rewrite/taste/writing-taste.md` 에 누적해 다음 편부터 재발을 막는다. 저장소가 공개라 이 파일은 git에 올리지 않고 구글 드라이브로 두 PC가 나눈다(`npm run pc-sync`, 예전 다운로드 폴더에 있던 파일은 동기화 때 자동으로 옮겨 온다). 파일이 없으면 `check_taste.py` 단계는 "취향 파일 없음"으로 보고하고 넘어간다.
4. 검사 예시:
   ```powershell
   Push-Location "tools/slop-rewrite"   # 저장소 루트에서
   python -X utf8 .claude/skills/slop-rewrite/scripts/check_ai_tells.py "<검사할_마크다운_경로>" --genre 줄글 --strict --md
   python -X utf8 .claude/skills/slop-rewrite/scripts/check_taste.py "<검사할_마크다운_경로>" --doc taste/writing-taste.md --strict
   Pop-Location
   ```
