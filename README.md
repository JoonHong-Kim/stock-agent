# StockAgent – 에이전트 기반 실시간 주식 뉴스 허브

관심 종목 뉴스를 FastAPI 백엔드와 Next.js 프론트엔드로 실시간 수집·저장·스트리밍하고, LLM 기반 아침 브리핑/센티먼트/딥다이브 리포트를 자동 생성하는 지능형 투자 비서형 애플리케이션입니다. FastAPI는 PostgreSQL에 관심 종목과 기사(원문 포함)를 저장하며, 백그라운드 스케줄러 + WebSocket으로 최신 뉴스를 계속 브로드캐스트합니다. 새롭게 추가된 LLM Report Service는 기사 컨텍스트와 Finnhub 시세를 조합해 Markdown 리포트를 쌓고, Daily Briefing(`/daily-briefing`) 페이지에서 한 번에 확인할 수 있습니다. Docker Compose로 전체 스택을 손쉽게 운영할 수 있습니다.

## 목차

- [프로젝트 소개](#프로젝트-소개)
- [구성 요소](#구성-요소)
- [작동 방식](#작동-방식)
- [빠른 시작](#빠른-시작)
- [수동 개발 모드](#수동-개발-모드)
- [주요 환경 변수](#주요-환경-변수)
- [API 개요](#api-개요)
- [아키텍처 하이라이트](#아키텍처-하이라이트)
- [테스트 & 향후 확장 아이디어](#테스트--향후-확장-아이디어)

## 프로젝트 소개

StockAgent는 관심 있는 티커를 추가해 두면 자동으로 관련 뉴스를 모으고, 저장하고, 실시간으로 사용자에게 푸시하는 뉴스 피드 플랫폼입니다. “관심 종목 → 기사 수집 → 웹 클라이언트”가 하나의 파이프라인으로 연결되어 있으며, 향후 Agent/LLM 모듈이 DB에 저장된 기사 원문을 바탕으로 요약, 전망, 사용자 맞춤 브리핑까지 제공할 수 있도록 확장성을 염두에 두었습니다. 현재 구조를 통해 다음과 같은 목표를 달성합니다.

- **언제 추가해도 자동 동기화**: 사용자가 새 티커를 watchlist에 추가하는 순간 백엔드가 해당 심볼을 추적하고 스케줄러(NewsStreamLoop)에서 주기적으로 뉴스 API를 호출합니다.
- **중복 없는 저장소**: SQLAlchemy 모델은 `(symbol, external_id)`로 유니크 제약을 걸어 같은 기사가 중복 저장되지 않습니다.
- **원문 확보 & 즉시성**: 새 기사가 발견되면 Playwright로 원문을 기록하고 DB에 저장한 뒤 즉시 WebSocket을 통해 구독자에게 전송됩니다. 프론트엔드는 실시간 피드를 유지하며, 원문은 향후 요약 에이전트에서 활용됩니다.

## 스크린샷

**메인 대시보드 (Main Dashboard)**
![Main Dashboard](./docs/images/dashboard_screenshot.png)

**데일리 브리핑 (Daily Briefing)**
![Daily Briefing](./docs/images/daily_briefing_screenshot.png)

## 구성 요소

- **src/** – FastAPI backend (도메인 기반 디렉터리: `api/`, `db/`, `news/`, `streaming/`, `config.py`, `util.py`, `vault.py`, `test/`)
- **web/** – Next.js 14 (App Router) 프론트엔드 (`app/`, `components/`, `hook/`, `providers/`, `messages/`, `config/`, `i18n/`, `public/`, `middleware.ts`)
- **PostgreSQL** – 뉴스/관심종목 저장
- **docker-compose.yml** – dev/prod 모두 같은 방식으로 실행
- **LLM Report Service** – `src/services/llm_service.py`, `reports.py`, `price_service.py`가 기사 원문·요약과 Finnhub 시세를 연결해 OpenAI API로 리포트를 생성/저장합니다.

## 빠른 시작

```bash
cp .env.example .env  # FINNHUB_API_KEY 에서 발급받은 키를 채웁니다.
docker compose up --build
curl -X POST http://localhost:8000/api/tickers/sync  # (선택) 수동 재동기화 시 사용
# 기사 원문 저장을 위해 브라우저 의존성을 설치합니다 (최초 1회).
poetry run playwright install --with-deps chromium
curl -X POST http://localhost:8000/api/news/backfill-body -H "Content-Type: application/json" -d '{"limit":50}'
```

서비스가 올라오면 (FastAPI는 `uvicorn --reload`, Next.js는 `pnpm dev`로 기동되어 코드 변경이 바로 반영됩니다):

- 프론트엔드: http://localhost:3000
- 백엔드: http://localhost:8000 (자동 Swagger UI 제공)

> 💡 `web` 서비스는 `pnpm install`을 컨테이너 시작 시 수행하고 `./web` 디렉터리를 그대로 마운트합니다. 새로운 의존성을 추가했다면 컨테이너를 재시작해 주세요.

## 수동 개발 모드

### Backend (FastAPI)

```bash
poetry install
poetry run playwright install --with-deps chromium
poetry run alembic upgrade head  # 최초 1회 또는 스키마 변경 시
poetry run uvicorn src.main:app --reload
```

환경 변수는 루트 `.env` (Compose와 공유)로 관리할 수 있습니다.

### Frontend (Next.js)

```bash
cd web
pnpm install
pnpm dev
```

Node.js 18 이상 / pnpm 8 이상을 권장합니다. `NEXT_PUBLIC_BACKEND_URL` 과 `NEXT_PUBLIC_BACKEND_WS_URL` 은 `.env` 또는 `.env.local` 로 조정할 수 있습니다.

## DB 마이그레이션 (Alembic)

1. 최초 1회 Alembic 설정은 이미 완료되어 있으므로, 새 스키마 변경 시 아래 명령으로 리비전을 생성합니다.

   ```bash
   ALEMBIC_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/stockapp \\
     poetry run alembic revision --autogenerate -m "my change"
   ```

   `ALEMBIC_DATABASE_URL` 는 로컬에서 접근 가능한 Postgres 주소로 바꿔주세요 (Docker를 쓰면 `localhost:5432`).

2. 생성된 스크립트를 확인/수정한 뒤 적용합니다.

   ```bash
   ALEMBIC_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/stockapp \\
     poetry run alembic upgrade head
   ```

Docker 컨테이너에서도 동일하게 실행할 수 있으며, 배포 시에는 `poetry run alembic upgrade head`를 `api` 컨테이너 시작 전에 한 번 호출하면 됩니다.

## 주요 환경 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | DB 접속 정보 | `postgres` / `postgres` / `stockapp` |
| `DATABASE_URL` | 백엔드에서 사용하는 접속 URI | `postgresql+asyncpg://postgres:postgres@db:5432/stockapp` |
| `FINNHUB_API_KEY` | Finnhub 회사 뉴스 API 키 (미설정 시 Mock 데이터) | `""` |
| `FINNHUB_SYMBOL_EXCHANGE` | Finnhub 심볼 동기화 시 사용할 거래소 코드 | `US` |
| `FETCH_DAILY_HOUR` | 매일 정기 수집을 실행할 로컬 시간(0~23시) | `9` |
| `FETCH_TIMEZONE` | 정기 수집 시간 계산에 사용할 IANA 타임존 | `Asia/Seoul` |
| `INITIAL_FETCH_ON_STARTUP` | 앱이 시작될 때 즉시 한 번 수집할지 여부 | `true` |
| `FETCH_INTERVAL_SECONDS` | `FETCH_DAILY_HOUR` 를 비운 경우 사용하는 폴링 간격(초) | `60` |
| `NEXT_PUBLIC_BACKEND_URL` | 프론트엔드가 REST API 호출에 사용하는 URL | `http://localhost:8000` |
| `NEXT_PUBLIC_BACKEND_WS_URL` | 프론트엔드가 WebSocket 연결에 사용하는 URL | `ws://localhost:8000/ws/news` |
| `LLM_API_KEY` | LLM 공급자(OpenAI 등) API Key | 빈 값 |
| `LLM_MODEL` | 사용할 Chat 모델 이름 | `gpt-4o-mini` |
| `LLM_BASE_URL` | LLM API Base URL | `https://api.openai.com/v1` |
| `REPORT_ARTICLE_LOOKBACK_DAYS` | 리포트 계산 시 참고할 기사 기간(일) | `3` |

## 작동 방식

1. **관심 종목 추가**: 사용자가 `/api/watchlist` 엔드포인트(또는 UI)를 통해 티커를 추가하면 `watched_symbols` 테이블에 저장됩니다. 이 시점부터 해당 심볼은 폴링 대상이 됩니다.
2. **티커 유효성 검증**: `tickers` 테이블은 Finnhub 미국 거래소 심볼을 캐시하며, `/api/watchlist` 는 여기에 없는 입력을 400으로 거절합니다. 서버가 뜰 때마다 자동으로 전체 심볼을 최신 상태로 동기화하고, 필요할 경우 `/api/tickers/sync` 로 수동 재동기화를 수행할 수 있습니다.
3. **원문 저장 + 스케줄러**: FastAPI 앱이 기동되면 `NewsStreamLoop`가 백그라운드 태스크로 실행되며, 기본적으로 `FETCH_TIMEZONE` 기준 매일 오전 9시에 모든 관심 종목을 순회합니다(`FETCH_DAILY_HOUR`). 각 심볼마다 Finnhub 회사 뉴스 API(또는 API 키가 없으면 Mock 데이터)를 호출해 최근 수집 시각 이후 기사를 가져오고, Playwright를 이용해 기사 URL의 원문을 비동기로 크롤링하여 `articles.body` 필드에 저장합니다 (REST 응답에는 노출되지 않음). 필요하면 `FETCH_DAILY_HOUR`를 비워두고 `FETCH_INTERVAL_SECONDS` 를 써서 분 단위 폴링으로 전환할 수도 있습니다.
4. **저장 및 중복 제거**: 가져온 결과는 `Article` 모델로 upsert 되어 중복이 제거됩니다. 새로 저장된 기사만 추려서 broadcasting 대상으로 삼습니다.
5. **실시간 전달**: `NewsDispatcher`가 해당 티커를 구독 중인 WebSocket 클라이언트 목록을 찾아 새 기사를 JSON으로 푸시합니다. 프론트엔드는 REST로 초기 데이터를 받고, WebSocket으로 스트림을 받아 리스트를 즉시 갱신합니다.
6. **LLM 리포트 생성**: `/api/reports/generate` 호출 시 `ReportService`가 최근 기사 + Finnhub 시세(또는 placeholder)를 모아 Prompt를 만들고 `LLMService`로부터 Markdown 리포트를 생성합니다. 결과는 `reports` 테이블에 저장되며 Next.js 대시보드에서 다시 볼 수 있습니다.

따라서 “티커만 추가해 두면 스케줄러가 알아서 돌아가는 구조”이며, 필요 시 UI에 있는 “지금 뉴스 가져오기” 버튼(또는 `POST /api/news/refresh`)을 눌러 즉시 수집도 수행할 수 있습니다.

## API 개요

- `GET /api/watchlist` – 관심 종목 목록
- `POST /api/watchlist` – 새로운 티커 추가
- `DELETE /api/watchlist/{symbol}` – 티커 삭제
- `GET /api/news?symbols=SYM1,SYM2` – 저장된 최신 기사
- `POST /api/news/refresh` – 선택된 티커(없으면 전체)에 대해 즉시 뉴스 수집 후 새 레코드 반환
- `POST /api/news/backfill-body` – body가 비어 있는 기사에 대해 Playwright로 원문 저장
- `WS /ws/news?symbols=SYM1,SYM2` – 실시간 기사 스트림
- `GET /api/tickers` – 캐시된 미국 티커 조회(검색 가능)
- `POST /api/tickers/sync` – Finnhub 심볼 목록을 다시 동기화
- `POST /api/reports/generate` – 아침 브리핑 / 센티먼트 / 딥다이브 리포트 생성
- `GET /api/reports` – 최근 생성된 리포트 목록 (심볼 필터 가능)
- `GET /api/reports/{id}` – 단일 리포트 조회

백그라운드 태스크는 관심 종목별로 Finnhub 회사 뉴스 API를 매일 오전 9시(또는 설정된 주기)에 호출하여 새로운 기사를 DB에 저장하고 곧바로 WebSocket 구독자에게 전달합니다. `FINNHUB_API_KEY` 가 없으면 Mock 데이터가 제공됩니다.

## 아키텍처 하이라이트

- **SQLAlchemy + asyncpg** 로 비동기 DB 접근
- **NewsDispatcher + NewsStreamLoop**: 관심 종목을 조회 → 신규 기사 삽입(중복 방지) → 스트림 브로드캐스트
- **Next.js App Router**: 클라이언트 훅(`useNewsStream`)이 REST 초기 데이터 + WebSocket 실시간 데이터를 결합
- **Docker Compose** 로 개발/배포 설정을 통일

## 테스트 & 향후 확장 아이디어

- 백엔드: `pytest` / `pytest-asyncio` 로 서비스/라우팅 테스트 추가
- 프론트엔드: React Testing Library로 UI 상태 전환 테스트
- 기능 확장: 사용자별 watchlist, Redis Pub/Sub, OAuth 등
