/** 화면/컨트롤러에서 사용하는 도메인 모델 (API 원본 필드명과 분리) */

export interface NoticeInfo {
  bidNtceNo: string; // 입찰공고번호
  bidNtceOrd: string; // 공고 차수
  bidNtceNm: string; // 공고명
  rbidNo: string; // 재입찰번호
  realOpengDt: string; // 실제 개찰일시
  basePriceStandard: string; // 기초금액기준 (예: 행자부)
  upperCount: number | null; // 상위갯수
  totalPrelimCount: number | null; // 복수예비가격 수
  prelimMadeAt: string; // 예비가격 작성시각
  prelimProvided: boolean; // 예비가격 정보제공 여부
  plannedPrice: number | null; // 예정가격
  baseAmount: number | null; // 기초금액
  // 부가 정보
  ntceInsttNm: string; // 공고기관
  dminsttNm: string; // 수요기관
  presmptPrce: number | null; // 추정가격
  sucsfbidLwltRate: number | null; // 낙찰하한율(%)
  opengDt: string; // 개찰(예정)일시
}

export interface PreliminaryPrice {
  sno: number; // 예가 순번 (1~15)
  price: number; // 예비가격
  drawn: boolean; // 추첨 여부
  drawCount: number; // 추첨 횟수
}

export interface BidderResult {
  rank: number; // 개찰 순위
  bizNo: string; // 사업자등록번호 (000-00-00000)
  companyName: string; // 상호명
  ceoName: string; // 대표자명
  bidAmount: number; // 입찰금액
  bidRate: number | null; // 투찰율(%)
  drawNos: string; // 추첨번호 (예: "04 08")
  bidAt: string; // 투찰일시
  remark: string; // 비고
  opengStatus: string; // 개찰 상태 (개찰완료 등)
}

export interface BidOpeningResult {
  notice: NoticeInfo;
  prelimPrices: PreliminaryPrice[];
  bidders: BidderResult[];
}
