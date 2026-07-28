<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/DocAI-EE3422?style=for-the-badge&logo=adobeacrobatreader&logoColor=white">
    <img alt="DocAI" src="https://img.shields.io/badge/DocAI-EE3422?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" width="200">
  </picture>
</p>

<p align="center">
  <b>Your AI Assistant for Every PDF</b><br>
  Chat, translate, summarize, rewrite, and extract information from your PDF documents in seconds.
</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/python-3.11%2B-blue" alt="Python"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115-009688.svg?logo=fastapi" alt="FastAPI"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS"></a>
  <a href="https://pymupdf.readthedocs.io/"><img src="https://img.shields.io/badge/PyMuPDF-1.25-FF6F00?logo=python" alt="PyMuPDF"></a>
  <a href="https://render.com/"><img src="https://img.shields.io/badge/deployed%20on-Render-46E3B7?logo=render" alt="Render"></a>
</p>

<br>

---

## Demo

<p align="center">
  <a href="https://ai-assistant-5mnk.onrender.com">▶️ Live Demo (coming soon)</a>
</p>

<br>

## Screenshots

<p align="center">
  <i>Screenshots coming soon. The application features a premium SaaS interface with light/dark mode support, responsive design, and smooth animations.</i>
</p>

| | |
|---|---|
| ![Landing Page](https://via.placeholder.com/600x400/DC2626/FFFFFF?text=Landing+Page) | ![Chat Interface](https://via.placeholder.com/600x400/7C3AED/FFFFFF?text=Chat+Interface) |
| ![Translate PDF](https://via.placeholder.com/600x400/DC2626/FFFFFF?text=Translate+PDF) | ![Dashboard](https://via.placeholder.com/600x400/1E293B/FFFFFF?text=Dashboard) |

<br>

---

## Features

### Core Capabilities

| Feature | Description |
|---|---|
| **🤖 AI Chat** | Ask questions and get instant answers from your PDF documents using natural language |
| **🌍 PDF Translation** | Translate entire PDFs into 18+ languages while preserving layout, fonts, and formatting |
| **📄 AI Summaries** | Generate concise summaries of long documents with one click |
| **🔍 Semantic Search** | Find exactly what you need across multiple documents using RAG-powered semantic search |
| **📸 OCR** | Extract text from scanned PDFs and images with accurate optical character recognition |
| **✏️ Rewrite Documents** | Rephrase, reformat, and improve document content with AI assistance |

### Platform Features

- **🔐 Authentication** — Email/password and Google OAuth with JWT token management
- **🌙 Light & Dark Mode** — Full theme support with system preference detection
- **📱 Responsive Design** — Mobile-first UI built with Tailwind CSS
- **⚡ Real-time Streaming** — Live progress updates for translation and processing jobs
- **💾 Secure Processing** — Documents processed in memory, no permanent storage
- **🎨 Layout Preservation** — Advanced PDF layout engine using PyMuPDF for pixel-perfect translations

<br>

---

## How It Works

### Chat & Q&A Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. Upload PDF                                │
│   User uploads a PDF document via drag-and-drop or file picker  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. Extract Text                              │
│   PyMuPDF extracts text content page-by-page from the PDF       │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. Chunk & Embed                             │
│   Text is split into overlapping chunks → embeddings generated  │
│   via OpenRouter API (text-embedding-3-small, 1536-dim)         │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. Store in Vector Index                     │
│   Embeddings stored in an in-memory vector index for retrieval  │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. User Asks a Question                      │
│   Question is embedded using the same embedding model           │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    6. Semantic Search (RAG)                     │
│   Top-K most relevant chunks retrieved via cosine similarity    │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    7. Generate Answer                           │
│   Relevant chunks + question sent to Gemini LLM → final answer  │
└─────────────────────────────────────────────────────────────────┘
```

### PDF Translation Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. Upload PDF + Select Language               │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. Extract Text Blocks                       │
│   PyMuPDF extracts structured blocks with position, font, size, │
│   color, and flags (bold/italic) from every page                │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    3. Batch Translate                           │
│   Text blocks are batch-translated via Gemini LLM, preserving   │
│   numbers, dates, and proper names                              │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    4. Layout Engine                             │
│   Advanced layout engine handles:                               │
│   • Width expansion (up to 15%) to reduce wrapping              │
│   • Cascading vertical shifts when text grows                   │
│   • Page overflow → content flows to new pages                  │
│   • Font reduction as last resort (max 10%)                     │
│   • Original line-height preserved from PDF metrics             │
│   • Independent bullet-list rendering                           │
└─────────────────────┬───────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    5. Generate Translated PDF                   │
│   New PDF created with redacted original text + rendered        │
│   translation at computed positions                             │
└─────────────────────────────────────────────────────────────────┘
```

<br>

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + TS)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Home    │  │  Chat    │  │Translate │  │  Dashboard        │  │
│  │  Page    │  │  Page    │  │  Page    │  │  + Settings       │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────────┘  │
│         │              │             │               │              │
│         └──────────────┴─────────────┴───────────────┘              │
│                          │  API Layer (Axios)                       │
│                          ▼                                          │
│                   ┌──────────────┐                                  │
│                   │  Auth Store  │                                  │
│                   │  (JWT)       │                                  │
│                   └──────────────┘                                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP / JSON
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI + Python 3.11)                   │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Auth       │  │ Documents  │  │ Chat       │  │ Translation  │  │
│  │ Routes     │  │ Routes     │  │ Routes     │  │ Routes       │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  │
│        │               │               │                │           │
│  ┌─────┴─────────────────────────────────────────────────┴───────┐  │
│  │                    Service Layer                              │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐  │  │
│  │  │Auth      │ │Document  │ │Embedding   │ │PDF Translation│  │  │
│  │  │Service   │ │Service   │ │Service     │ │Service        │  │  │
│  │  └──────────┘ └──────────┘ └────────────┘ └───────────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌───────────────┐  │  │
│  │  │LLM       │ │Subscription│ │Layout      │ │OCR           │  │  │
│  │  │Service   │ │Service    │ │Rebuilder   │ │Service       │  │  │
│  │  └──────────┘ └──────────┘ └────────────┘ └───────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│        │               │               │                │           │
│  ┌─────┴─────────────────────────────────────────────────┴───────┐  │
│  │                    Data Layer                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │  │
│  │  │  SQLite/     │  │  In-Memory   │  │  File Storage       │  │  │
│  │  │  PostgreSQL  │  │  Vector Index│  │  (uploads + outputs) │  │  │
│  │  │  (Alembic)   │  │  (cosine sim)│  │                     │  │  │
│  │  └──────────────┘  └──────────────┘  └─────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    External Services                                │
│                                                                     │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  OpenRouter API     │  │  Google Gemini API                  │  │
│  │  (Embeddings)       │  │  (LLM + Translation)                │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Google OAuth       │  │  PyMuPDF (Local PDF Processing)     │  │
│  └─────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

<br>

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| [React](https://react.dev/) | 18.3 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.6 | Type safety |
| [Vite](https://vitejs.dev/) | 6.0 | Build tool |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first styling |
| [React Router](https://reactrouter.com/) | 6.28 | Client-side routing |
| [Axios](https://axios-http.com/) | 1.7 | HTTP client |
| [TanStack Query](https://tanstack.com/query/) | 5.62 | Server state management |
| [Lucide React](https://lucide.dev/) | 0.460 | Icon library |
| [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google) | latest | Google OAuth integration |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| [Python](https://www.python.org/) | 3.11 | Runtime |
| [FastAPI](https://fastapi.tiangolo.com/) | 0.115 | Web framework |
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0 | ORM |
| [Alembic](https://alembic.sqlalchemy.org/) | 1.14 | Database migrations |
| [PyMuPDF](https://pymupdf.readthedocs.io/) | 1.25 | PDF processing & layout |
| [JWT](https://github.com/jpadilla/pyjwt/) | (python-jose) | Authentication tokens |
| [Passlib](https://passlib.readthedocs.io/) | 1.7 | Password hashing (bcrypt) |
| [Google Auth](https://google-auth.readthedocs.io/) | 2.50 | Token verification |
| [Uvicorn](https://www.uvicorn.org/) | 0.34 | ASGI server |

### AI & Embeddings

| Technology | Purpose |
|---|---|
| [Google Gemini](https://deepmind.google/technologies/gemini/) | LLM for chat, summarization, translation |
| [OpenRouter](https://openrouter.ai/) | Embeddings API (text-embedding-3-small) |
| [RAG (Retrieval-Augmented Generation)](https://en.wikipedia.org/wiki/Prompt_engineering#Retrieval-augmented_generation) | Semantic document search |

### Infrastructure

| Service | Purpose |
|---|---|
| [Render](https://render.com/) | Hosting & deployment |
| SQLite / PostgreSQL | Database |
| Alembic | Schema migrations |

<br>

---

## Premium Plans

| Feature | Free | Pro |
|---|---|---|
| **Documents per day** | 5 | Unlimited |
| **PDF Translation pages** | 1 page | Unlimited |
| **Chat page limit** | 200 pages/doc | Unlimited |
| **Summarization** | ✓ | Unlimited |
| **OCR** | ✗ | ✓ |
| **Pages per document** | 200 | Unlimited |
| **Processing priority** | Standard | Priority |
| **AI response speed** | Standard | Faster |

<br>

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py                  # Email/password auth endpoints
│   │   │       ├── google_auth.py           # Google OAuth endpoint
│   │   │       ├── documents.py             # Document upload/CRUD
│   │   │       ├── chat.py                  # Chat & Q&A endpoints
│   │   │       ├── home.py                  # Anonymous chat session endpoints
│   │   │       ├── translation.py           # PDF translation endpoints
│   │   │       ├── subscription.py          # Plan management endpoints
│   │   │       └── ...
│   │   ├── core/
│   │   │   ├── config.py                    # Environment configuration
│   │   │   ├── database.py                  # DB engine & session
│   │   │   └── security.py                  # JWT, password hashing
│   │   ├── models/                          # SQLAlchemy ORM models
│   │   ├── repositories/                    # Data access layer
│   │   ├── schemas/                         # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── document_service.py
│   │   │   ├── embedding_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── pdf_translation_service.py   # Extraction, translation, layout
│   │   │   ├── subscription_service.py
│   │   │   └── ...
│   │   └── main.py                          # FastAPI app entrypoint
│   ├── migrations/                          # Alembic migrations
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/                      # Reusable React components
│   │   ├── hooks/                           # Custom React hooks
│   │   ├── pages/
│   │   │   ├── Home.tsx                     # Landing page + anonymous chat
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Chat.tsx                     # Authenticated chat
│   │   │   ├── Translate.tsx                # PDF translation
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Upload.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   ├── api.ts                       # Axios client & API methods
│   │   │   └── googleAuth.ts
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── App.tsx                          # Router configuration
│   │   ├── main.tsx                         # App bootstrap
│   │   └── index.css                        # Tailwind entry + components
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── render.yaml                              # Render deployment config
└── README.md
```

<br>

---

## Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/lokman60/ai-assistant.git
cd ai-assistant
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings (see Environment Variables below)

# Run migrations (Alembic runs automatically on startup)
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8000`
- **API Docs:** `http://localhost:8000/docs`

<br>

---

## Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | — | Secret key for JWT token signing |
| `OPENROUTER_API_KEY` | **Yes** | — | API key for embeddings (OpenRouter) |
| `GOOGLE_CLIENT_ID` | Optional | `""` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | `""` | Google OAuth client secret |
| `DATABASE_URL` | No | `sqlite:///./data/ai_docs.db` | Database connection string |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins |
| `LLM_BASE_URL` | No | `http://localhost:8080/v1` | LLM API base URL |
| `LLM_MODEL` | No | `2` | LLM model identifier |

### Frontend

No environment variables required. The Google Client ID is fetched at runtime from the backend's `/api/config` endpoint.

<br>

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/register` | Register with email & password |
| `POST` | `/api/login` | Login with email & password |
| `POST` | `/api/refresh` | Refresh JWT tokens |
| `GET` | `/api/me` | Get current user profile |
| `POST` | `/api/auth/google` | Google OAuth sign-in |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/documents` | List user's documents |
| `POST` | `/api/documents` | Upload a PDF document |
| `DELETE` | `/api/documents/{id}` | Delete a document |
| `PATCH` | `/api/documents/{id}` | Rename a document |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send a question (with document context) |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversation/{id}` | Get conversation history |
| `DELETE` | `/api/conversation/{id}` | Delete conversation |

### Anonymous Chat (No Login Required)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/home/upload` | Upload PDF for anonymous session |
| `POST` | `/api/home/chat` | Ask question in anonymous session |

### PDF Translation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/translate-pdf` | Start a PDF translation job |
| `GET` | `/api/translate-pdf/status/{job_id}` | Get translation job status |
| `GET` | `/api/translate-pdf/download/{job_id}` | Download translated PDF |

### Subscription

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/me/plan` | Get current plan & usage |

### Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Public app configuration (Google client ID) |

<br>

---

## Security

- **Password Hashing** — All passwords hashed with bcrypt via Passlib
- **JWT Authentication** — Access + refresh token rotation with configurable expiry
- **Document Isolation** — Users can only access their own documents
- **In-Memory Processing** — Documents processed in memory, not stored on disk after processing
- **CORS Protection** — Strictly configured allowed origins
- **SQL Injection Prevention** — SQLAlchemy ORM with parameterized queries
- **Environment Separation** — Secrets managed via environment variables, never committed

<br>

---

## Performance

- **Async Processing** — Translation jobs run in background threads with non-blocking endpoints
- **Vector Search** — In-memory cosine similarity search for fast semantic retrieval
- **Batch Translation** — Text blocks translated in batches (up to 30 at a time) for optimal LLM throughput
- **Efficient PDF Layout** — PyMuPDF-based layout engine avoids expensive render-and-compare approaches
- **Lazy Loading** — Frontend components lazy-loaded with React Router
- **Progress Streaming** — Translation jobs poll for progress rather than blocking

<br>

---

## Roadmap

- [ ] **GPT-4o / Claude Integration** — Additional LLM provider support
- [ ] **Multi-Document Chat** — Query across multiple PDFs simultaneously
- [ ] **Batch Processing** — Translate/analyze multiple documents at once
- [ ] **PDF Export Styling** — Customizable output formatting
- [ ] **Web App Link Sharing** — Share translated documents via public links
- [ ] **Stripe Integration** — Production payment processing for Pro plans
- [ ] **Team Workspaces** — Shared document libraries and team management
- [ ] **Mobile App** — Native iOS and Android applications
- [ ] **API Access Tokens** — Developer API for third-party integrations

<br>

---

## Deployment

The application is configured for one-command deployment on [Render](https://render.com/).

### Deploy on Render

1. Fork or push this repository to GitHub
2. Create a new **Web Service** on Render
3. Connect your repository
4. Render automatically detects `render.yaml` and configures:
   - **Build:** `pip install -r requirements.txt && cd ../frontend && npm install && npm run build`
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set the required environment variables in Render dashboard:
   - `JWT_SECRET`
   - `OPENROUTER_API_KEY`
   - `GOOGLE_CLIENT_ID` (optional)
   - `GOOGLE_CLIENT_SECRET` (optional)

> **Note:** The frontend is built during deployment and served as static files by the FastAPI backend — no separate frontend hosting needed.

<br>

---

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the existing style conventions and includes appropriate tests.

<br>

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

<br>

---

## Contact

**Lounes Lokmane**

- Email: [lokmankai.lonas@gmail.com](mailto:lokmankai.lonas@gmail.com)
- GitHub: [@lokman60](https://github.com/lokman60)

<br>

---

<p align="center">
  Made with ❤️ by Lounes Lokmane
</p>
