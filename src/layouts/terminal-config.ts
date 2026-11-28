/* 은행 단말 화면 틀의 역할별 설정: 화면 번호, 바로가기, 메뉴 트리, 기능키 도움말 */
import type { BankRole, BankRoleName, BankSummary } from '../api/types';
import type { IconName } from '../components/Icon';

export type TerminalScreen = { code: string; title: string; path: string; match: RegExp };
export type RailLink = {
  label: string;
  to: string;
  icon: IconName;
  end?: boolean;
  hint: string;
  /** 여러 화면을 묶은 바로가기: 이 주소들에서도 켜진 것으로 표시 */
  match?: RegExp;
};
export type TreeItem = {
  label: string;
  depth: number;
  to?: string;
  end?: boolean;
  group?: boolean;
  /** to가 없는 항목: 이 주소일 때 파랗게 표시 */
  match?: RegExp;
  /** 메뉴 이름 뒤에 붙일 대기 건수, 예: "승인 대기(3)" */
  count?: keyof BankSummary['counts'];
};

export interface TerminalRole {
  /** 심사 · 여신 · 운영 */
  name: BankRoleName;
  dept: string;
  home: string;
  /** 위에서부터 먼저 맞는 화면을 씁니다 (상세 화면을 목록보다 먼저) */
  screens: TerminalScreen[];
  rail: RailLink[];
  tree: TreeItem[];
  help: [string, string][];
}

const COMMON_TAIL: [string, string][] = [
  ['F9', '엑셀(CSV) 저장'],
  ['Enter / Esc', '조회 사유 창 확인 / 닫기'],
];

export const TERMINAL_ROLES: Record<BankRole, TerminalRole> = {
  review: {
    name: '심사',
    dept: '심사부',
    home: '/bank/review',
    screens: [
      { code: 'R0100', title: '대시보드', path: '/bank/review', match: /^\/bank\/review\/?$/ },
      {
        code: 'R0220',
        title: '심사 상세',
        path: '/bank/review/applications',
        match: /^\/bank\/review\/applications\/.+/,
      },
      {
        code: 'R0210',
        title: '한도 신청 심사',
        path: '/bank/review/applications',
        match: /^\/bank\/review\/applications\/?$/,
      },
      {
        code: 'R0320',
        title: '수정 이력 조회',
        path: '/bank/review/companies/logs',
        match: /^\/bank\/review\/companies\/logs/,
      },
      {
        code: 'R0310',
        title: '기업 심사 정보',
        path: '/bank/review/companies',
        match: /^\/bank\/review\/companies\/?$/,
      },
      {
        code: 'R0410',
        title: '체인 대출 현황',
        path: '/bank/review/chain-loans',
        match: /^\/bank\/review\/chain-loans/,
      },
      {
        code: 'R0400',
        title: '발주 체인 조회',
        path: '/bank/review/chain',
        match: /^\/bank\/review\/chain/,
      },
      {
        code: 'R0900',
        title: '공지·규정',
        path: '/bank/review/notices',
        match: /^\/bank\/review\/notices/,
      },
    ],
    rail: [
      { label: '업무', to: '/bank/review', icon: 'grid', end: true, hint: '심사 대시보드' },
      {
        label: '심사',
        to: '/bank/review/applications',
        icon: 'clipboardCheck',
        hint: '한도 신청 심사 (F4)',
      },
      { label: '기업', to: '/bank/review/companies', icon: 'idCard', hint: '기업 심사 정보 (F5)' },
      { label: '체인', to: '/bank/review/chain', icon: 'link', hint: '발주 체인 조회 (F6)' },
    ],
    tree: [
      { label: '대시보드', depth: 0, to: '/bank/review', end: true },
      { label: '심사', depth: 0, group: true },
      {
        label: '한도 신청 심사',
        depth: 1,
        to: '/bank/review/applications',
        end: true,
        count: 'reviewPending',
      },
      { label: '심사 상세', depth: 2, match: /^\/bank\/review\/applications\/.+/ },
      { label: '기업', depth: 0, group: true },
      { label: '기업 심사 정보', depth: 1, to: '/bank/review/companies', end: true },
      { label: '수정 이력 조회', depth: 1, to: '/bank/review/companies/logs' },
      { label: '체인', depth: 0, group: true },
      { label: '발주 체인 조회', depth: 1, to: '/bank/review/chain' },
      { label: '체인 대출 현황', depth: 1, to: '/bank/review/chain-loans' },
      { label: '공지·규정', depth: 0, to: '/bank/review/notices' },
    ],
    help: [
      ['F2', '조회 (툴바 [조회]와 같음)'],
      ['F3', '목록으로 (심사 상세)'],
      ['F4', '상세 조회 / 한도 신청 심사'],
      ['F5', '기업 심사 정보'],
      ['F6', '발주 체인 조회'],
      ['F7', '통과로 확정 · 신보 승인 저장 · 수정 저장'],
      ['F8', '제외로 확정 · 신보 거절 저장'],
      ...COMMON_TAIL,
    ],
  },
  loan: {
    name: '여신',
    dept: '여신부',
    home: '/bank/loan',
    screens: [
      { code: 'L0100', title: '대시보드', path: '/bank/loan', match: /^\/bank\/loan\/?$/ },
      {
        code: 'L0210',
        title: '승인 대기',
        path: '/bank/loan/pending',
        match: /^\/bank\/loan\/pending/,
      },
      {
        code: 'L0230',
        title: '대출 상세',
        path: '/bank/loan/loans',
        match: /^\/bank\/loan\/loans\/.+/,
      },
      {
        code: 'L0220',
        title: '대출 현황',
        path: '/bank/loan/loans',
        match: /^\/bank\/loan\/loans\/?$/,
      },
      {
        code: 'L0240',
        title: '대금 지급 지연',
        path: '/bank/loan/delays',
        match: /^\/bank\/loan\/delays/,
      },
      {
        code: 'L0320',
        title: '경보 상세',
        path: '/bank/loan/alerts',
        match: /^\/bank\/loan\/alerts\/.+/,
      },
      {
        code: 'L0310',
        title: '리스크 경보',
        path: '/bank/loan/alerts',
        match: /^\/bank\/loan\/alerts\/?$/,
      },
      {
        code: 'L0400',
        title: '이벤트 신호 등록',
        path: '/bank/loan/events',
        match: /^\/bank\/loan\/events/,
      },
      {
        code: 'L0510',
        title: '체인 대출 현황',
        path: '/bank/loan/chain-loans',
        match: /^\/bank\/loan\/chain-loans/,
      },
      {
        code: 'L0500',
        title: '발주 체인 조회',
        path: '/bank/loan/chain',
        match: /^\/bank\/loan\/chain/,
      },
      {
        code: 'L0900',
        title: '공지·규정',
        path: '/bank/loan/notices',
        match: /^\/bank\/loan\/notices/,
      },
    ],
    rail: [
      { label: '업무', to: '/bank/loan', icon: 'grid', end: true, hint: '여신 대시보드' },
      {
        label: '여신',
        to: '/bank/loan/pending',
        icon: 'bank',
        hint: '승인 대기 · 대출 현황 · 대금 지급 지연',
        match: /^\/bank\/loan\/(pending|loans|delays)/,
      },
      {
        label: '리스크',
        to: '/bank/loan/alerts',
        icon: 'alert',
        hint: '리스크 경보 (F5) · 이벤트 신호 등록',
        match: /^\/bank\/loan\/(alerts|events)/,
      },
      {
        label: '체인',
        to: '/bank/loan/chain',
        icon: 'link',
        hint: '발주 체인 조회 · 체인 대출 현황',
        match: /^\/bank\/loan\/chain/,
      },
    ],
    tree: [
      { label: '대시보드', depth: 0, to: '/bank/loan', end: true },
      { label: '여신', depth: 0, group: true },
      { label: '승인 대기', depth: 1, to: '/bank/loan/pending', count: 'loanPending' },
      { label: '대출 현황', depth: 1, to: '/bank/loan/loans', end: true },
      { label: '대출 상세', depth: 2, match: /^\/bank\/loan\/loans\/.+/ },
      { label: '대금 지급 지연', depth: 1, to: '/bank/loan/delays' },
      { label: '리스크', depth: 0, group: true },
      { label: '리스크 경보', depth: 1, to: '/bank/loan/alerts', end: true },
      { label: '경보 상세', depth: 2, match: /^\/bank\/loan\/alerts\/.+/ },
      { label: '이벤트 신호 등록', depth: 1, to: '/bank/loan/events' },
      { label: '체인', depth: 0, group: true },
      { label: '발주 체인 조회', depth: 1, to: '/bank/loan/chain' },
      { label: '체인 대출 현황', depth: 1, to: '/bank/loan/chain-loans' },
      { label: '공지·규정', depth: 0, to: '/bank/loan/notices' },
    ],
    help: [
      ['F2', '조회 (툴바 [조회]와 같음)'],
      ['F3', '목록으로 (대출·경보 상세)'],
      ['F4', '상세 조회 / 대출 현황'],
      ['F5', '리스크 경보 (승인 대기에서는 대출 현황)'],
      ['F6', '발주 체인 조회 / 체인 대출 현황 (체인 화면끼리 오가기)'],
      ['F7', '승인하고 실행 · 이벤트 등록'],
      ['F8', '보류'],
      ...COMMON_TAIL,
    ],
  },
  ops: {
    name: '운영',
    dept: '운영부',
    home: '/bank/ops',
    screens: [
      { code: 'O0100', title: '대시보드', path: '/bank/ops', match: /^\/bank\/ops\/?$/ },
      {
        code: 'O0220',
        title: '가입 신청 상세',
        path: '/bank/ops/signups',
        match: /^\/bank\/ops\/signups\/.+/,
      },
      {
        code: 'O0210',
        title: '기업 가입 승인',
        path: '/bank/ops/signups',
        match: /^\/bank\/ops\/signups\/?$/,
      },
      {
        code: 'O0300',
        title: '설정값 관리',
        path: '/bank/ops/settings',
        match: /^\/bank\/ops\/settings/,
      },
      {
        code: 'O0400',
        title: '처리·조회 기록',
        path: '/bank/ops/logs',
        match: /^\/bank\/ops\/logs/,
      },
      {
        code: 'O0900',
        title: '공지·규정',
        path: '/bank/ops/notices',
        match: /^\/bank\/ops\/notices/,
      },
    ],
    rail: [
      { label: '업무', to: '/bank/ops', icon: 'grid', end: true, hint: '운영 대시보드' },
      { label: '가입', to: '/bank/ops/signups', icon: 'userCheck', hint: '기업 가입 승인 (F4)' },
      { label: '설정', to: '/bank/ops/settings', icon: 'sliders', hint: '설정값 관리 (F5)' },
      { label: '기록', to: '/bank/ops/logs', icon: 'history', hint: '처리·조회 기록 (F6)' },
    ],
    tree: [
      { label: '대시보드', depth: 0, to: '/bank/ops', end: true },
      { label: '운영 업무', depth: 0, group: true },
      {
        label: '기업 가입 승인',
        depth: 1,
        to: '/bank/ops/signups',
        end: true,
        count: 'signupPending',
      },
      { label: '가입 신청 상세', depth: 2, match: /^\/bank\/ops\/signups\/.+/ },
      { label: '설정', depth: 0, group: true },
      { label: '설정값 관리', depth: 1, to: '/bank/ops/settings' },
      { label: '기록', depth: 0, group: true },
      { label: '처리·조회 기록', depth: 1, to: '/bank/ops/logs' },
      { label: '공지·규정', depth: 0, to: '/bank/ops/notices' },
    ],
    help: [
      ['F2', '조회 (툴바 [조회]와 같음)'],
      ['F3', '목록으로 (가입 신청 상세)'],
      ['F4', '기업 가입 승인 / 상세 조회'],
      ['F5', '설정값 관리'],
      ['F6', '처리·조회 기록'],
      ['F7', '가입 승인 · 설정값 저장'],
      ['F8', '반려'],
      ...COMMON_TAIL,
    ],
  },
};
