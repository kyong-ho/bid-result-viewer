# 나라장터 개찰결과 조회

공공데이터포털(data.go.kr) 조달청 오픈 API로 **입찰공고번호 기준 용역 입찰의 개찰 결과**를 조회하는 웹 앱.

- Vite + React + TypeScript + Tailwind CSS
- 배포: Vercel (서버리스 함수가 조달청 API를 프록시 — 서비스 키는 서버에만 보관, CORS 문제 없음)

## 시작하기

```bash
cp .env.example .env.local   # G2B_SERVICE_KEY에 발급받은 서비스 키 입력
npm install
npm run dev                  # http://localhost:5173
```

로컬 개발 시에는 vite.config.ts의 dev 미들웨어가 `/api/bid-result`를 처리하고,
Vercel 배포 시에는 `api/bid-result.ts` 서버리스 함수가 같은 역할을 한다.
배포 전 Vercel 프로젝트 환경변수에 `G2B_SERVICE_KEY`를 등록할 것.

## 문서

- [docs/g2b-api.md](docs/g2b-api.md) — 조달청 API 연동 명세: 엔드포인트·필드 매핑·응답 특성·에러 처리
- [docs/architecture.md](docs/architecture.md) — 아키텍처·데이터 흐름·백엔드 이식 가이드

## 구조

```
api/bid-result.ts   # Vercel 서버리스 함수 (컨트롤러): 검증 → lib/g2b 호출 → 에러 상태코드 매핑
lib/g2b/            # 조달청 API 연동 모듈 (순수 TS, React/Vercel 미의존 → 다른 백엔드로 이식 가능)
  client.ts         #   fetch 래퍼: 서비스 키·공통 파라미터, 공공API 에러 처리
  rawTypes.ts       #   API 원본 응답 타입
  types.ts          #   도메인 모델
  mappers.ts        #   원본 → 도메인 변환
  index.ts          #   fetchBidOpeningResult: API 3종 병렬 호출·조합
src/                # React 화면 (검색바 + 공고정보/예가정보/입찰결과 3개 섹션)
```

## 사용 API (base: `https://apis.data.go.kr/1230000`)

| 용도            | 오퍼레이션                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| 공고정보        | `/ad/BidPublicInfoService/getBidPblancListInfoServc` (inqryDiv=2)              |
| 예비가격 15개   | `/as/ScsbidInfoService/getOpengResultListInfoServcPreparPcDetail` (inqryDiv=2) |
| 업체별 개찰결과 | `/as/ScsbidInfoService/getOpengResultListInfoOpengCompt`                       |
