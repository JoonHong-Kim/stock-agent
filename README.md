# StockApp

AI 기반 실시간 주식 뉴스 스트리밍 및 투자 분석 플랫폼

## 개요

관심 종목의 뉴스를 실시간으로 수집·저장하고, LLM을 활용한 자동 브리핑 및 투자 인사이트를 제공하는 지능형 투자 비서 애플리케이션입니다.

### 주요 기능

- 📰 **실시간 뉴스 스트리밍**: 관심 종목의 최신 뉴스를 WebSocket으로 실시간 전달
- 🤖 **AI 브리핑**: LLM 기반 종합/개별 종목 분석 리포트 자동 생성
- 📊 **투자 심리 분석**: 뉴스 기반 센티먼트 분석 및 시각화
- 💾 **뉴스 아카이브**: 기사 원문 저장 및 중복 제거

## 기술 스택

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + React
- **LLM**: OpenAI GPT-4
- **Infra**: Docker Compose

## 빠른 시작

### 1. 환경 설정

```bash
cp .env.example .env
# .env 파일에서 FINNHUB_API_KEY, LLM_API_KEY 설정
```

### 2. 서비스 실행

```bash
docker compose up --build
```

서비스 URL:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. 초기 설정 (선택)

```bash
# 브라우저 의존성 설치 (기사 원문 크롤링용)
poetry run playwright install --with-deps chromium

# 기존 기사 원문 수집
curl -X POST http://localhost:8000/api/news/backfill-body \
  -H "Content-Type: application/json" \
  -d '{"limit":50}'
```

## 개발 환경 설정

### Backend

```bash
poetry install
poetry run alembic upgrade head
poetry run uvicorn src.main:app --reload
```

### Frontend

```bash
cd web
pnpm install
pnpm dev
```

## 주요 API

### 관심 종목 관리
- `GET /api/watchlist` - 관심 종목 목록 조회
- `POST /api/watchlist` - 종목 추가
- `DELETE /api/watchlist/{symbol}` - 종목 삭제

### 뉴스
- `GET /api/news?symbols=AAPL,MSFT` - 뉴스 조회
- `POST /api/news/refresh` - 즉시 뉴스 수집
- `WS /ws/news?symbols=AAPL,MSFT` - 실시간 뉴스 스트림

### AI 리포트
- `POST /api/reports/generate` - 리포트 생성 (종합/개별)
- `GET /api/reports` - 리포트 목록 조회
- `GET /api/reports/{id}` - 리포트 상세 조회

## 환경 변수

### 필수 설정

| 변수 | 설명 |
| --- | --- |
| `FINNHUB_API_KEY` | Finnhub API 키 ([발급받기](https://finnhub.io/)) |
| `LLM_API_KEY` | OpenAI API 키 |

### 선택 설정

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@db:5432/stockapp` | DB 연결 URL |
| `LLM_MODEL` | `gpt-4o-mini` | 사용할 LLM 모델 |
| `FETCH_DAILY_HOUR` | `9` | 뉴스 수집 시간 (0-23) |
| `FETCH_TIMEZONE` | `Asia/Seoul` | 타임존 |
| `REPORT_ARTICLE_LOOKBACK_DAYS` | `3` | 리포트 생성 시 참고할 기사 기간 |

## 아키텍처

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Next.js   │ ◄─────► │   FastAPI   │ ◄─────► │ PostgreSQL  │
│  Frontend   │  HTTP   │   Backend   │  async  │             │
└─────────────┘  WS     └─────────────┘         └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  Finnhub    │
                        │  API        │
                        └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  OpenAI     │
                        │  LLM API    │
                        └─────────────┘
```

### 주요 컴포넌트

- **NewsStreamLoop**: 백그라운드 스케줄러로 주기적 뉴스 수집
- **NewsDispatcher**: WebSocket 연결 관리 및 실시간 브로드캐스팅
- **ReportService**: LLM 기반 리포트 생성 및 저장
- **PriceService**: Finnhub를 통한 실시간 시세 조회

## DB 마이그레이션

```bash
# 마이그레이션 생성
poetry run alembic revision --autogenerate -m "description"

# 마이그레이션 적용
poetry run alembic upgrade head
```

## 프로젝트 구조

```
StockApp/
├── src/                    # FastAPI backend
│   ├── api/               # API 라우터
│   ├── db/                # DB 모델 및 설정
│   ├── news/              # 뉴스 수집 로직
│   ├── services/          # LLM, 리포트 서비스
│   └── streaming/         # WebSocket 스트리밍
├── web/                   # Next.js frontend
│   ├── app/              # App Router 페이지
│   ├── components/       # React 컴포넌트
│   ├── hook/             # Custom hooks
│   └── providers/        # Context providers
├── migrations/            # Alembic 마이그레이션
└── docker-compose.yml    # Docker 설정
```