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

| 이름                | 설명            |
| ------------------- | --------------- |
| `VITE_API_BASE_URL` | 백엔드 API 주소 |

## 개발 환경

VS Code 사용 시 권장 확장(ESLint, Prettier)을 설치하면 저장할 때 자동으로 포맷이 적용됩니다.
커밋 시 Husky가 변경된 파일에 ESLint/Prettier를 자동 실행합니다.
