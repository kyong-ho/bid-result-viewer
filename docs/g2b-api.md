# 조달청 나라장터 API 연동 명세

`lib/g2b/` 모듈이 다루는 공공데이터포털(data.go.kr) 조달청 오픈 API 3종의 명세와,
응답 데이터의 특성·변환 규칙·에러 처리 방식을 정리한다.

- Base URL: `https://apis.data.go.kr/1230000`
- 인증: 쿼리 파라미터 `serviceKey` (공공데이터포털에서 발급)
- 모든 요청에 `type=json` 부착 (client.ts가 자동 처리)

## 1. 엔드포인트 3종

공고번호(`bidNtceNo`) 하나로 아래 3개를 **병렬 호출**해 개찰 결과 화면을 구성한다.

| #   | 용도                 | 경로                                                              | 주요 파라미터                                                                        |
| --- | -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ①   | 공고 기본정보        | `/ad/BidPublicInfoService/getBidPblancListInfoServc`              | `inqryDiv=2`(고정), `bidNtceNo`, `pageNo=1`, `numOfRows=10`                          |
| ②   | 예비가격 상세 (15행) | `/as/ScsbidInfoService/getOpengResultListInfoServcPreparPcDetail` | `inqryDiv=2`(고정), `bidNtceNo`, `numOfRows=100`                                     |
| ③   | 업체별 개찰결과      | `/as/ScsbidInfoService/getOpengResultListInfoOpengCompt`          | `bidNtceNo`, `bidNtceOrd`(선택), `bidClsfcNo`(선택), `rbidNo`(선택), `numOfRows=100` |

※ 용역(서비스) 입찰 기준. 공사/물품은 오퍼레이션명의 `Servc` 부분이 다르다.

공통 응답 봉투:

```jsonc
{
  "response": {
    "header": { "resultCode": "00", "resultMsg": "정상" }, // "00"이 아니면 에러
    "body": {
      "items": [/* ... */],
      "numOfRows": 100,
      "pageNo": 1,
      "totalCount": 15,
    },
  },
}
```

## 2. 필드 매핑

원본 필드 → 도메인 모델(`lib/g2b/types.ts`) → 화면 표기. 변환은 전부 `lib/g2b/mappers.ts`에서 수행한다.

### ① 공고정보 (`RawBidNotice` → `NoticeInfo` 일부)

| 원본 필드                   | 도메인 필드                 | 화면 표기                  |
| --------------------------- | --------------------------- | -------------------------- |
| `bidNtceNo` / `bidNtceOrd`  | `bidNtceNo` / `bidNtceOrd`  | 입찰공고번호 / 차수        |
| `bidNtceNm`                 | `bidNtceNm`                 | 공고명                     |
| `ntceInsttNm` / `dminsttNm` | `ntceInsttNm` / `dminsttNm` | 공고기관 / 수요기관 (부가) |
| `opengDt`                   | `opengDt`                   | 개찰(예정)일시 (부가)      |
| `presmptPrce`               | `presmptPrce`               | 추정가격 (부가)            |
| `sucsfbidLwltRate`          | `sucsfbidLwltRate`          | 낙찰하한율 (부가)          |

요약 샘플 (R25BK01250632):

```jsonc
{
  "bidNtceNo": "R25BK01250632",
  "bidNtceOrd": "000",
  "bidNtceNm": "PQ 후 가격입찰 공고(안산선 지하화 통합개발사업 기본계획 수립 용역)",
  "dminsttNm": "경기도청 북부청사",
  "opengDt": "2026-01-08 15:00:00",
  "presmptPrce": "1801408000",
  "sucsfbidLwltRate": "79.995",
  "prearngPrceDcsnMthdNm": "복수예가",
  "totPrdprcNum": "15", // 총 예가 수
  "drwtPrdprcNum": "4", // 추첨 예가 수
}
```

### ② 예비가격 상세 (`RawPreliminaryPriceDetail` → `PreliminaryPrice` + `NoticeInfo` 일부)

15행이 내려오며, 행별 필드와 **15행 공통 필드**가 섞여 있다.
공고정보 화면의 예정가격·기초금액·재입찰번호·실제 개찰일시는 ①이 아니라 **이 API의 공통 필드**에서 가져온다 (첫 행 사용).

| 원본 필드                  | 도메인 필드         | 화면 표기                 | 비고                |
| -------------------------- | ------------------- | ------------------------- | ------------------- |
| `compnoRsrvtnPrceSno`      | `sno`               | 구분 (추첨가격 N)         | 행별, 1~15          |
| `bsisPlnprc`               | `price`             | 금액                      | 행별                |
| `drwtYn`                   | `drawn`             | 추첨 하이라이트           | 행별, Y/N (Y가 4개) |
| `drwtNum`                  | `drawCount`         | 추첨횟수                  | 행별                |
| `plnprc`                   | `plannedPrice`      | **예정가격**              | 15행 공통           |
| `bssamt`                   | `baseAmount`        | **기초금액**              | 15행 공통           |
| `rbidNo`                   | `rbidNo`            | 재입찰번호                | 15행 공통           |
| `rlOpengDt`                | `realOpengDt`       | 실제 개찰일시             | 15행 공통           |
| `bidwinrSlctnAplBssCntnts` | `basePriceStandard` | 기초금액기준 (예: 행자부) | 15행 공통           |
| `bssamtBssUpNum`           | `upperCount`        | 상위갯수                  | 15행 공통           |
| `totRsrvtnPrceNum`         | `totalPrelimCount`  | 복수예비가격              | 15행 공통           |
| `compnoRsrvtnPrceMkngDt`   | `prelimMadeAt`      | 작성시각                  | 15행 공통           |

요약 샘플 (15행 중 2행):

```jsonc
[
  {
    "compnoRsrvtnPrceSno": "1",
    "bsisPlnprc": "2037665500",
    "drwtYn": "Y",
    "drwtNum": "2",
    "plnprc": "1974820700",
    "bssamt": "1981548000",
    "rbidNo": "000",
    "rlOpengDt": "2026-01-08 15:34:16",
    "bidwinrSlctnAplBssCntnts": "행자부",
    "bssamtBssUpNum": "7",
    "totRsrvtnPrceNum": "15",
    "compnoRsrvtnPrceMkngDt": "2026-01-08 15:29:08",
  },
  {
    "compnoRsrvtnPrceSno": "2",
    "bsisPlnprc": "1965438100",
    "drwtYn": "Y",
    "drwtNum": "2" /* 공통 필드 동일 */,
  },
  // ... 3~15행
]
```

### ③ 업체별 개찰결과 (`RawOpengResult` → `BidderResult`)

| 원본 필드            | 도메인 필드   | 화면 표기      | 비고                              |
| -------------------- | ------------- | -------------- | --------------------------------- |
| `opengRank`          | `rank`        | 순위           | 입찰금액 낮은 순                  |
| `prcbdrBizno`        | `bizNo`       | 사업자등록번호 | `312-81-11675`로 포맷             |
| `prcbdrNm`           | `companyName` | 상호명         | 공동수급체명은 미제공(대표사명만) |
| `prcbdrCeoNm`        | `ceoName`     | 대표자명       |                                   |
| `bidprcAmt`          | `bidAmount`   | 입찰금액       |                                   |
| `bidprcrt`           | `bidRate`     | 투찰율(%)      | API 제공값 그대로                 |
| `drwtNo1`, `drwtNo2` | `drawNos`     | 추첨번호       | 앞 공백 trim 후 `"04 08"`로 합침  |
| `bidprcDt`           | `bidAt`       | 투찰일시       |                                   |
| `rmrk`               | `remark`      | 비고           |                                   |
| `opengRsltDivNm`     | `opengStatus` | 개찰 상태 배지 | 예: 개찰완료                      |

요약 샘플 (8건 중 1건):

```jsonc
{
  "opengRsltDivNm": "개찰완료",
  "opengRank": "1",
  "prcbdrBizno": "3128111675",
  "prcbdrNm": "주식회사 경동엔지니어링",
  "prcbdrCeoNm": "강재홍",
  "bidprcAmt": "1602889000",
  "bidprcrt": "81.166",
  "drwtNo1": " 04",
  "drwtNo2": " 08", // 앞 공백 주의
  "bidprcDt": "2026-01-08 09:30:46",
  "rmrk": "정상",
}
```

## 3. 응답 데이터 특성 (mapper/client가 처리)

| 특성                                             | 처리 위치                                                |
| ------------------------------------------------ | -------------------------------------------------------- |
| 모든 숫자가 문자열(`"1981548000"`), 빈 값은 `""` | `mappers.ts` `toNumber()` — `""` → `null`                |
| 결과 0건이면 `items`가 배열이 아니라 `""`        | `client.ts` — `Array.isArray()` 검사 후 빈 배열로 정규화 |
| 추첨번호에 앞 공백 (`" 04"`)                     | `mappers.ts` `mapBidder()` — trim                        |
| 사업자번호가 10자리 숫자 문자열                  | `mappers.ts` `formatBizNo()` — 3-2-5 하이픈              |
| 예가 API 응답이 순번 정렬 보장 안 됨             | `index.ts` — `sno` 기준 정렬 (업체는 `rank` 기준)        |

## 4. 에러 처리 규칙

### 게이트웨이(XML) 에러 — `client.ts`

키 오류·호출 한도 초과 시 게이트웨이가 `type=json`을 **무시하고 XML**로 응답한다.
응답 텍스트가 `<`로 시작하면 `<returnAuthMsg>`를 파싱해서:

- 메시지에 `LIMITED` 포함 → `QUOTA_EXCEEDED` (예: `LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR`)
- 그 외 → `AUTH_ERROR` (예: `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`)

### 애플리케이션 에러

- `response.header.resultCode !== "00"` → `UPSTREAM_ERROR` (resultMsg 포함)
- JSON 파싱 실패 → `BAD_RESPONSE`
- 3개 API 모두 0건 → `NOTICE_NOT_FOUND` (`index.ts`)

### HTTP 상태코드 매핑 — `errors.ts` `toHttpError()`

| 에러 코드                                                        | HTTP 상태 |
| ---------------------------------------------------------------- | --------- |
| `NOTICE_NOT_FOUND`                                               | 404       |
| `AUTH_ERROR`, `QUOTA_EXCEEDED`, `UPSTREAM_ERROR`, `BAD_RESPONSE` | 502       |
| 그 외 (`INTERNAL_ERROR`)                                         | 500       |

응답 본문은 항상 `{ "error": "메시지", "code": "코드" }` 형태.

## 5. 서비스 키 인코딩

공공데이터포털 키는 인코딩/디코딩 두 형태로 발급된다. `client.ts`는:

- 키에 `%`가 포함 → 이미 URL 인코딩된 키로 간주하고 **그대로 사용**
- 미포함 → `encodeURIComponent()`로 인코딩

따라서 `.env.local`의 `G2B_SERVICE_KEY`에는 어느 형태를 넣어도 동작한다.

## 6. 호출 조합 — `fetchBidOpeningResult()` (`lib/g2b/index.ts`)

1. 차수 정규화(`normalizeOrd`): `"0"` → `"000"`, `"1"` → `"001"` (API가 3자리 형식을 기대), 빈 값 → 미지정
2. API 3종을 `Promise.all`로 병렬 호출 (③에는 정규화된 차수 전달)
3. 공고 선택(`pickNotice`): 차수 미지정이면 마지막 항목(최신 차수). **차수 지정 시 해당 차수만 인정** — 매칭 실패하면 다른 차수로 대체하지 않고 `NOTICE_NOT_FOUND` throw (존재하는 차수 목록을 메시지에 안내)
4. 3종 모두 0건이면 `NOTICE_NOT_FOUND` throw
5. 차수 지정 시 ②·③ 응답 행도 차수 기준으로 필터 (다른 차수의 예가/업체가 섞이지 않도록)
6. `NoticeInfo`는 ①(공고) + ②(예비가격 첫 행)을 합쳐 구성, 예가는 `sno` 정렬, 업체는 `rank` 정렬
7. 반환: `{ notice, prelimPrices, bidders }` (`BidOpeningResult`)
