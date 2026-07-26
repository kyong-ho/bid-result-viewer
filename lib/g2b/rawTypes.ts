/**
 * 조달청 나라장터 오픈 API 원본 응답 타입.
 * 모든 값이 문자열로 내려오며(숫자 포함), 빈 값은 ""로 온다.
 */

export interface G2bResponseEnvelope<T> {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: T[] | "" | null;
      numOfRows?: number;
      pageNo?: number;
      totalCount?: number;
    };
  };
}

/** ① 입찰공고정보서비스 getBidPblancListInfoServc — 사용하는 필드만 정의 */
export interface RawBidNotice {
  bidNtceNo?: string;
  bidNtceOrd?: string;
  bidNtceNm?: string;
  ntceInsttNm?: string; // 공고기관
  dminsttNm?: string; // 수요기관
  bidNtceDt?: string; // 공고일시
  bidBeginDt?: string; // 입찰개시일시
  bidClseDt?: string; // 입찰마감일시
  opengDt?: string; // 개찰(예정)일시
  bssamt?: string; // 기초금액
  bdgtAmt?: string; // 예산금액
  presmptPrce?: string; // 추정가격
  asignBdgtAmt?: string; // 배정예산
  sucsfbidLwltRate?: string; // 낙찰하한율
  cntrctCnclsMthdNm?: string; // 계약방법
  ntceKindNm?: string; // 공고종류
  bidNtceSttusNm?: string; // 공고상태
  reNtceYn?: string; // 재공고 여부
  rbidPermsnYn?: string; // 재입찰 허용 여부
  rbidOpengDt?: string; // 재입찰 개찰일시
  srvceDivNm?: string; // 업무구분(일반용역/기술용역)
  ppswGnrlSrvceYn?: string; // 나라장터 일반용역 여부
  prearngPrceDcsnMthdNm?: string; // 예가 방식 (복수예가 등)
  totPrdprcNum?: string; // 총 예가 수
  drwtPrdprcNum?: string; // 추첨 예가 수
}

/** 입찰공고정보서비스 getBidPblancListInfoServcBsisAmount — 용역 기초금액 */
export interface RawBidNoticeBaseAmount {
  bidNtceNo?: string;
  bidNtceOrd?: string;
  bidNtceNm?: string;
  bssamt?: string; // 기초금액
  bssamtOpenDt?: string; // 기초금액 공개일시
}
/** ② 낙찰정보서비스 getOpengResultListInfoServcPreparPcDetail — 예비가격 상세 (15행) */
export interface RawPreliminaryPriceDetail {
  bidNtceNo?: string;
  bidNtceOrd?: string;
  bidClsfcNo?: string;
  rbidNo?: string; // 재입찰번호
  bidNtceNm?: string;
  plnprc?: string; // 예정가격 (15행 공통)
  bssamt?: string; // 기초금액 (15행 공통)
  totRsrvtnPrceNum?: string; // 복수예비가격 수
  compnoRsrvtnPrceSno?: string; // 예가 순번 (1~15)
  bsisPlnprc?: string; // 예비가격 금액
  drwtYn?: string; // 추첨 여부 (Y/N)
  drwtNum?: string; // 추첨 횟수
  bidwinrSlctnAplBssCntnts?: string; // 기초금액기준 (예: 행자부)
  rlOpengDt?: string; // 실제 개찰일시
  bssamtBssUpNum?: string; // 기초금액기준 상위갯수
  compnoRsrvtnPrceMkngDt?: string; // 복수예비가격 작성시각
}

/** ③ 낙찰정보서비스 getOpengResultListInfoOpengCompt — 업체별 개찰결과 */
export interface RawOpengResult {
  opengRsltDivNm?: string; // 개찰 상태 (개찰완료 등)
  bidNtceNo?: string;
  bidNtceOrd?: string;
  bidClsfcNo?: string;
  rbidNo?: string;
  opengRank?: string; // 개찰 순위
  prcbdrBizno?: string; // 사업자번호
  prcbdrNm?: string; // 상호명
  prcbdrCeoNm?: string; // 대표자명
  bidprcAmt?: string; // 입찰금액
  bidprcrt?: string; // 투찰율(%)
  rmrk?: string; // 비고
  drwtNo1?: string; // 추첨번호 1 (예: " 04")
  drwtNo2?: string; // 추첨번호 2
  bidprcDt?: string; // 투찰일시
}

