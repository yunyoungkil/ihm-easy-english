---
name: slop-rewrite
description: 한국어 제목·썸네일 카피·나레이션·설명글·문서의 AI 티(AI Slop)를 코드 검사기(67규칙)와 취향 문서로 진단·윤문한다. "윤문해줘", "AI 티 빼줘", "AI 티 검사", "나레이션 다듬어줘", "제목/썸네일 카피 다듬기", "/slop-rewrite" 요청에 사용한다.
---

# slop-rewrite (외부 본체 진입점)

본체는 `C:\Users\yunyo\Downloads\slop-rewrite\.claude\skills\slop-rewrite\SKILL.md` 다.
그 파일을 읽고 따르며, Python 검사·윤문 명령은 `C:\Users\yunyo\Downloads\slop-rewrite` 디렉터리에서 `python -X utf8 ...` 로 실행한다.

## 이 채널(유튜브 쇼츠·롱폼·설명글·내부 문서) 적용 규칙

1. **쇼츠·롱폼 시청자용 카피·구어체 나레이션에는 기본 블로그·보고서 문체 가이드(`장피엠`, `토스피드`, `업무 줄글`, `보고서`)를 씌우지 않는다.** (문어체로 굳는 것을 막기 위함. 내부 기획·분석 보고서 문서에는 장르에 맞춰 선택 적용 가능)
2. 대신 **`principles/ai-tells-ko.md` (67규칙 코드 검사: `check_ai_tells.py`) + `check_fidelity.py` (사실 보존) + `taste/writing-taste.md` (`W-01`~`W-08`: 쇼츠·롱폼 구어체, 메타 진행 안내 삭제, 시청자 반응 단정 금지, 과잉 평이화·어색한 동사 결합 방지, 챕터 구조 반복 방지)** 조합을 단일 창구로 적용한다.
3. 사용자가 "이 표현 AI 티 난다 / 내가 쓴다면 이렇게" 피드백을 주면 `C:\Users\yunyo\Downloads\slop-rewrite\taste\writing-taste.md` 에 누적해 다음 편부터 재발을 막는다.
4. 검사 예시:
   ```powershell
   Push-Location "C:\Users\yunyo\Downloads\slop-rewrite"
   python -X utf8 .claude/skills/slop-rewrite/scripts/check_ai_tells.py "<검사할_마크다운_경로>" --genre 줄글 --strict --md
   python -X utf8 .claude/skills/slop-rewrite/scripts/check_taste.py "<검사할_마크다운_경로>" --doc taste/writing-taste.md --strict
   Pop-Location
   ```
