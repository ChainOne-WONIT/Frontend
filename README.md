# ChainOne Frontend

ChainOne 프론트엔드 레포지토리입니다.

## 기술 스택

- React 19 + TypeScript
- Vite
- ESLint + Prettier
- Husky + lint-staged (커밋 전 자동 린트/포맷)

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
cp .env.example .env   # 환경 변수 설정
npm run dev            # http://localhost:5173
```

## 스크립트

| 명령어                 | 설명                       |
| ---------------------- | -------------------------- |
| `npm run dev`          | 개발 서버 실행             |
| `npm run build`        | 타입 체크 및 프로덕션 빌드 |
| `npm run preview`      | 빌드 결과물 미리보기       |
| `npm run lint`         | ESLint 검사                |
| `npm run lint:fix`     | ESLint 자동 수정           |
| `npm run format`       | Prettier 포맷 적용         |
| `npm run format:check` | Prettier 포맷 검사         |

## 환경 변수

| 이름                | 설명                                                            |
| ------------------- | --------------------------------------------------------------- |
| `VITE_API_BASE_URL` | 백엔드 API 주소                                                 |
| `VITE_USE_MOCK`     | `true`(기본)면 목업 데이터로 동작, `false`면 실제 백엔드를 호출 |

## 화면

| 경로                            | 화면                                                      |
| ------------------------------- | --------------------------------------------------------- |
| `/login`                        | 기업 로그인                                               |
| `/login?type=bank`              | 은행 로그인 (내부망이 아니면 접속 차단 화면)              |
| `/signup`                       | 기업 회원가입 (약관동의 → 업체정보 입력 → 가입완료)       |
| `/corp`                         | 기업 홈                                                   |
| `/corp/orders`                  | 발주 목록 (받은 발주 / 낸 발주)                           |
| `/corp/orders/:id`              | 발주 상세 (진행 단계별 버튼: 수락·납품 등록·수령 확인 등) |
| `/corp/orders/new`              | 발주 등록                                                 |
| `/corp/fund`                    | 생산자금                                                  |
| `/corp/alerts`                  | 거래처 경보                                               |
| `/corp/me`                      | 내 정보                                                   |
| `/bank/review`                  | 심사 대시보드                                             |
| `/bank/review/applications`     | 한도 신청 심사 (상세는 조회 사유를 고른 뒤 열림)          |
| `/bank/review/applications/:id` | 심사 상세 (자격 확인·등급·판정·신보 결과 입력)            |
| `/bank/review/companies`        | 기업 심사 정보 관리                                       |
| `/bank/review/chain`            | 발주 체인 조회                                            |
| `/bank/ops`                     | 운영 대시보드                                             |
| `/bank/ops/signups`             | 기업 가입 승인 (승인·반려)                                |
| `/bank/ops/signups/:id`         | 가입 신청 상세 (조회 사유를 고른 뒤 열림, 승인·반려)      |
| `/bank/ops/settings`            | 설정값 관리 (등급 기준·경보 가중치·경보 단계)             |
| `/bank/ops/logs`                | 처리·조회 기록 (열람만)                                   |

은행 화면은 심사·운영 담당만 만들었습니다. 여신 담당 화면은 아직 없습니다.

## 목업 모드

백엔드 없이 화면을 확인할 수 있습니다. 데이터는 `src/mocks/db.ts`에 있고, 새로고침하면 처음 상태로 돌아갑니다.

- 기업 시연 계정: `hansung` / `chainone1!` (5회 틀리면 잠김 메시지 확인 가능)
- 은행 내부망 접속 화면: `/login?type=bank&network=internal`
- 은행 외부망 차단 화면: `/login?type=bank`
- 은행 직원 계정 (내부망 접속 화면에서 로그인, 데이터는 `src/mocks/bank.ts`·`ops.ts`·`shared.ts`)
  - 심사 담당: `review01` / `chainone1!`
  - 운영 담당: `ops01` / `chainone1!`
  - 여신 담당: `loan01` / `chainone1!` (화면 준비 중)

## 백엔드 API

호출 함수는 `src/api/`에, 주고받는 데이터 형태는 `src/api/types.ts`에 있습니다. 백엔드 스펙이 정해지면 경로와 타입만 맞추면 됩니다.
인증 토큰은 `Authorization: Bearer <accessToken>` 헤더로 보냅니다. 오류 응답은 `{ "message": string, "code": string }` 형태를 기대합니다.

| 메서드 | 경로                                              | 용도                            |
| ------ | ------------------------------------------------- | ------------------------------- |
| POST   | `/api/auth/corp/login`                            | 기업 로그인                     |
| GET    | `/api/auth/bank/network`                          | 은행 접속 망 확인               |
| POST   | `/api/auth/bank/login`                            | 은행 직원 로그인                |
| POST   | `/api/auth/logout`                                | 로그아웃                        |
| GET    | `/api/signup/check-id?loginId=`                   | 아이디 중복 확인                |
| POST   | `/api/signup/corp`                                | 기업 회원가입 신청              |
| GET    | `/api/corp/home`                                  | 기업 홈                         |
| GET    | `/api/orders?direction=received\|sent`            | 발주 목록                       |
| GET    | `/api/orders/{id}`                                | 발주 상세                       |
| POST   | `/api/orders`                                     | 발주 등록                       |
| POST   | `/api/orders/{id}/accept`                         | 수락 (받는 기업)                |
| POST   | `/api/orders/{id}/reject`                         | 반려 (받는 기업)                |
| POST   | `/api/orders/{id}/deliver`                        | 납품 등록 (받는 기업)           |
| POST   | `/api/orders/{id}/payment/confirm`                | 받았음 (받는 기업)              |
| POST   | `/api/orders/{id}/payment/unpaid`                 | 받지 못함 (받는 기업)           |
| POST   | `/api/orders/{id}/cancel`                         | 발주 취소 (낸 기업)             |
| POST   | `/api/orders/{id}/receive`                        | 수령 확인 (낸 기업)             |
| POST   | `/api/orders/{id}/payment`                        | 대금 지급 등록                  |
| GET    | `/api/companies/counterparties`                   | 발주 가능 기업 목록             |
| GET    | `/api/funds`                                      | 생산자금 현황                   |
| POST   | `/api/funds/loans`                                | 생산자금 신청                   |
| GET    | `/api/alerts`                                     | 거래처 경보                     |
| GET    | `/api/corp/me`                                    | 내 정보                         |
| PATCH  | `/api/corp/me/consents/{key}`                     | 선택 동의 변경                  |
| GET    | `/api/bank/review/dashboard`                      | 심사 대시보드                   |
| GET    | `/api/bank/review/applications`                   | 한도 신청 목록                  |
| GET    | `/api/bank/review/applications/{id}?reason=`      | 한도 신청 상세 (조회 사유 기록) |
| POST   | `/api/bank/review/applications/{id}/decision`     | 판정 확정                       |
| POST   | `/api/bank/review/applications/{id}/kodit`        | 신보 승인 결과 입력             |
| GET    | `/api/bank/review/companies`                      | 기업 심사 정보                  |
| PATCH  | `/api/bank/review/companies/{id}`                 | 기업 심사 정보 수정             |
| GET    | `/api/bank/ops/dashboard`                         | 운영 대시보드                   |
| GET    | `/api/bank/ops/signups`                           | 기업 가입 신청 목록             |
| GET    | `/api/bank/ops/signups/{id}?reason=`              | 가입 신청 상세 (조회 사유 기록) |
| POST   | `/api/bank/ops/signups/{id}/approve`              | 가입 승인                       |
| POST   | `/api/bank/ops/signups/{id}/reject`               | 가입 반려 { reason }            |
| GET    | `/api/bank/ops/settings`                          | 설정값                          |
| PUT    | `/api/bank/ops/settings`                          | 설정값 저장                     |
| GET    | `/api/bank/ops/audit-logs?from=&to=&actor=&kind=` | 처리·조회 기록                  |
| GET    | `/api/bank/chains?rootId=`                        | 발주 체인 조회                  |

## 개발 환경

VS Code 사용 시 권장 확장(ESLint, Prettier)을 설치하면 저장할 때 자동으로 포맷이 적용됩니다.
커밋 시 Husky가 변경된 파일에 ESLint/Prettier를 자동 실행합니다.
