# 아키텍처 · 백엔드 이식 가이드

나라장터 개찰결과 조회 앱의 구조와, API 연동 모듈(`lib/g2b`)을 다른 백엔드로 떼어갈 때의 가이드.

## 1. 데이터 흐름

```
브라우저 (React)
   │  GET /api/bid-result?bidNtceNo=R25BK01250632&bidNtceOrd=000
   ▼
컨트롤러 ── 로컬: vite.config.ts dev 미들웨어
   │        운영: api/bid-result.ts (Vercel 서버리스 함수)
   ▼
lib/g2b  fetchBidOpeningResult()
   │  Promise.all 병렬 호출 (서비스 키는 여기서만 사용)
   ├──> ① 공고정보     getBidPblancListInfoServc
   ├──> ② 예비가격 15개 getOpengResultListInfoServcPreparPcDetail
   └──> ③ 업체별 결과   getOpengResultListInfoOpengCompt
   │
   ▼  mapper로 조합 (문자열→숫자, trim, 포맷팅 완료)
BidOpeningResult JSON { notice, prelimPrices, bidders }
```

핵심 설계 원칙: **조달청 API를 아는 것은 `lib/g2b` 뿐이다.**
브라우저는 상대경로 `/api/bid-result` 하나만 알고, CORS·서비스 키 노출 문제가 원천적으로 없다.

## 2. 계층별 책임

| 계층      | 파일                                       | 책임                                                                                               |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 컨트롤러  | `api/bid-result.ts`, `vite.config.ts`(dev) | 파라미터 검증, `fetchBidOpeningResult` 호출, `toHttpError`로 상태코드 매핑. **비즈니스 로직 없음** |
| 연동 모듈 | `lib/g2b/`                                 | API 호출·에러 해석·데이터 변환·조합 전부. **React/Vercel 미의존 순수 TS**                          |
| 프론트    | `src/`                                     | 렌더링만. 데이터 가공은 mapper에서 이미 끝난 상태 (타입은 `lib/g2b/types.ts` 공유)                 |

`lib/g2b` 내부 구성:

| 파일          | 역할                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| `client.ts`   | fetch 래퍼 — 키 인코딩, 공통 파라미터(type=json), XML 게이트웨이 에러 감지, `items:""` 정규화 |
| `rawTypes.ts` | API 원본 응답 타입 (실제 응답 샘플 기반)                                                      |
| `types.ts`    | 도메인 모델 (`NoticeInfo`, `PreliminaryPrice`, `BidderResult`, `BidOpeningResult`)            |
| `mappers.ts`  | 원본 → 도메인 변환. **API 필드명이 바뀌면 이 파일만 수정**                                    |
| `errors.ts`   | `G2bApiError` + HTTP 상태코드 매핑(`toHttpError`)                                             |
| `index.ts`    | `fetchBidOpeningResult()` — 3종 병렬 호출·조합 진입점                                         |

## 3. 로컬 vs 운영 이중 컨트롤러

같은 `/api/bid-result` 엔드포인트를 환경에 따라 다른 쪽이 제공한다.

- **로컬** (`npm run dev`): `vite.config.ts`의 `bidResultDevApi` 플러그인(미들웨어)이 처리.
  Vercel CLI 로그인 없이 개발 가능.
- **운영** (Vercel): `api/bid-result.ts` 서버리스 함수가 처리. Vite 프론트는 정적 배포.

두 컨트롤러 모두 동일하게 "검증 → `fetchBidOpeningResult` → `toHttpError`" 3단계만 수행하므로 동작이 같다.

## 4. 환경변수

| 항목    | 내용                                                                              |
| ------- | --------------------------------------------------------------------------------- |
| 키 이름 | `G2B_SERVICE_KEY` — `VITE_` 접두사가 **없으므로** 클라이언트 번들에 포함되지 않음 |
| 로컬    | `.env.local` (gitignore 대상, `.env.example` 참고)                                |
| 운영    | Vercel 프로젝트 환경변수로 등록                                                   |
| 키 형태 | 인코딩/디코딩 키 모두 허용 (client.ts가 `%` 포함 여부로 판단)                     |

## 5. 백엔드 이식 가이드

`lib/g2b`를 별도 백엔드(Express, NestJS, Fastify 등)로 옮길 때:

**그대로 복사하면 되는 것** — `lib/g2b/` 폴더 전체.
의존성은 전역 `fetch`뿐 (Node 18+ 내장). npm 패키지 의존성 0개.

**새로 작성하는 것** — 컨트롤러 한 개. Express 예시:

```ts
import express from "express";
import { fetchBidOpeningResult, toHttpError } from "./g2b"; // lib/g2b 복사본

const app = express();

app.get("/api/bid-result", async (req, res) => {
  const bidNtceNo = String(req.query.bidNtceNo ?? "").trim();
  const bidNtceOrd = String(req.query.bidNtceOrd ?? "").trim();
  if (!bidNtceNo) {
    return res.status(400).json({
      error: "공고번호(bidNtceNo)를 입력해 주세요.",
      code: "BAD_REQUEST",
    });
  }
  try {
    res.json(
      await fetchBidOpeningResult({
        serviceKey: process.env.G2B_SERVICE_KEY!,
        bidNtceNo,
        bidNtceOrd: bidNtceOrd || undefined,
      }),
    );
  } catch (err) {
    const { status, body } = toHttpError(err);
    res.status(status).json(body);
  }
});
```

`toHttpError`가 에러 → 상태코드 변환까지 해주므로 컨트롤러는 이 정도가 전부다.

## 6. 통합 응답 형태 (`BidOpeningResult`)

`/api/bid-result`가 반환하는 최종 JSON. 프론트는 이 구조를 가공 없이 렌더링한다.

```jsonc
{
  "notice": {
    "bidNtceNo": "R25BK01250632",
    "bidNtceOrd": "000",
    "bidNtceNm": "PQ 후 가격입찰 공고(...)",
    "rbidNo": "000",
    "realOpengDt": "2026-01-08 15:34:16",
    "basePriceStandard": "행자부",
    "upperCount": 7,
    "totalPrelimCount": 15,
    "prelimMadeAt": "2026-01-08 15:29:08",
    "prelimProvided": true,
    "plannedPrice": 1974820700, // 예정가격 (숫자로 변환 완료)
    "baseAmount": 1981548000, // 기초금액
    "dminsttNm": "경기도청 북부청사",
    "sucsfbidLwltRate": 79.995,
    "opengDt": "2026-01-08 15:00:00",
  },
  "prelimPrices": [
    { "sno": 1, "price": 2037665500, "drawn": true, "drawCount": 2 },
    // ... 15개 (sno 오름차순)
  ],
  "bidders": [
    {
      "rank": 1,
      "bizNo": "312-81-11675", // 하이픈 포맷 완료
      "companyName": "주식회사 경동엔지니어링",
      "ceoName": "강재홍",
      "bidAmount": 1602889000,
      "bidRate": 81.166,
      "drawNos": "04 08", // trim + 합침 완료
      "bidAt": "2026-01-08 09:30:46",
      "remark": "정상",
      "opengStatus": "개찰완료",
    },
    // ... rank 오름차순
  ],
}
```

에러 시: `{ "error": "메시지", "code": "NOTICE_NOT_FOUND | AUTH_ERROR | ..." }` (상태코드 매핑은 [g2b-api.md](./g2b-api.md#4-에러-처리-규칙) 참고)
