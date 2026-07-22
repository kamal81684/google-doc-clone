# Google Docs Clone

A full-stack collaborative document editor inspired by Google Docs with real-time collaboration powered by Yjs. Create, edit, share, and export documents with live cursors and instant sync.

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, TipTap (rich text editor), Yjs (CRDT), shadcn/ui, Zod, React Hook Form, Axios

**Backend:** Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT (cookie-based auth), WebSocket (ws), Yjs, PDFKit, Helmet, Morgan

## Features

- **Real-Time Collaboration** — Multiple users edit the same document simultaneously with live cursors and instant sync, powered by Yjs CRDTs over WebSocket
- **Rich Text Editing** — WYSIWYG editor powered by TipTap with support for headings, bold/italic/strikethrough, lists, text alignment, links, and code blocks
- **Auto-Save** — Document title is saved with debouncing; collaborative content syncs in real time via Yjs
- **Authentication** — Secure cookie-based JWT authentication with email/password registration, login, and optional Google Sign-In
- **Document Sharing** — Share documents with other users via email with role-based access control (Viewer / Editor)
- **Dashboard** — View your own documents and documents shared with you, with search and delete functionality
- **Document Export** — Download documents as plain text (.txt) or PDF
- **Responsive UI** — Clean minimal design with Google Docs-like editor layout

## Project Structure

```
├── backend/               # Express.js REST API + WebSocket server
│   ├── src/
│   │   ├── controllers/   # Route handlers (auth, document, permission)
│   │   ├── services/      # Business logic
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Token generation, document export (TipTap + Yjs)
│   │   ├── config/        # Prisma client, Yjs persistence
│   │   ├── websocket.ts   # WebSocket server (Yjs sync, awareness, auth)
│   │   └── server.ts      # Entry point (HTTP + WebSocket)
│   └── prisma/            # Schema & migrations
│
└── frontend/              # Next.js App Router
    └── src/
        ├── app/           # Pages (login, register, dashboard, editor)
        ├── components/    # Editor, auth forms, share dialog, UI primitives
        ├── hooks/         # useCollaboration (Yjs + WebSocket provider)
        └── services/      # API service layer (auth, documents)
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/google-doc-clone.git
cd google-doc-clone
```

### Backend Setup

```bash
cd backend
npm install

# Create a .env file (see below for required variables)
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start the development server
npm run dev
```

The backend runs on `http://localhost:5000` (HTTP API + WebSocket on `/ws`).

#### Backend Environment Variables

```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/google_docs_clone"
JWT_SECRET="your-secret-key"

# Optional — enables Google Sign-In button on the frontend
GOOGLE_CLIENT_ID="your-google-client-id"
```

### Frontend Setup

```bash
cd frontend
npm install

# Create a .env.local file (see below for required variables)

# Start the development server
npm run dev
```

The frontend runs on `http://localhost:3000`.

#### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# Optional — enables Google Sign-In button
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
```

## Database Schema

The application uses PostgreSQL with Prisma ORM. The schema consists of three models:

- **User** — Stores user credentials, profile information, and optional Google OAuth ID
- **Document** — Stores document title, legacy TipTap JSON content, and Yjs binary state for real-time collaboration
- **DocumentPermission** — Manages role-based access control (VIEWER / EDITOR) for shared documents

## How Real-Time Collaboration Works

1. When a user opens a document, the frontend connects to the WebSocket server at `ws://localhost:5000/ws?doc=<documentId>`
2. The server authenticates the connection via the JWT cookie and verifies document access
3. A Yjs document is loaded from the database (or created fresh) and kept in memory while clients are connected
4. All edits are encoded as Yjs CRDT updates, broadcast to other connected clients, and persisted to the database when the last client disconnects
5. Awareness protocol transmits cursor positions and user info (name, color) for live collaborator indicators
