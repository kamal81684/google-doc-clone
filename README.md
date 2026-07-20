# Google Docs Clone

A full-stack collaborative document editor inspired by Google Docs. Create, edit, share, and export documents with a clean, modern UI.

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, TipTap (rich text editor), shadcn/ui, Zod, React Hook Form, Axios

**Backend:** Express.js, TypeScript, Prisma ORM, PostgreSQL, JWT (cookie-based auth), PDFKit, Helmet, Morgan

## Features

- **Rich Text Editing** — WYSIWYG editor powered by TipTap with support for headings, bold/italic/strikethrough, lists, text alignment, links, and code blocks
- **Auto-Save** — Document content and title are automatically saved with debouncing
- **Authentication** — Secure cookie-based JWT authentication with registration and login
- **Document Sharing** — Share documents with other users via email with role-based access control (Viewer / Editor)
- **Dashboard** — View your own documents and documents shared with you, with search and delete functionality
- **Document Export** — Download documents as plain text (.txt) or PDF
- **Responsive UI** —  clean minimal design with Google Docs-like editor layout

## Project Structure

```
├── backend/          # Express.js REST API
│   ├── src/
│   │   ├── controllers/   # Route handlers (auth, document, permission)
│   │   ├── services/      # Business logic
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Token generation, document export
│   │   └── config/        # Prisma client setup
│   └── prisma/            # Schema & migrations
│
└── frontend/         # Next.js App Router
    └── src/
        ├── app/            # Pages (login, register, dashboard, editor)
        ├── components/     # Editor, auth forms, share dialog, UI primitives
        └── services/       # API service layer (auth, documents)
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

# Create a .env file and add your PostgreSQL connection string
# DATABASE_URL="postgresql://user:password@localhost:5432/google_doc_clone"

# Run migrations
npx prisma migrate dev

# Start the development server
npm run dev
```

The backend runs on `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend
npm install

# Create a .env.local file
# NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

# Start the development server
npm run dev
```

The frontend runs on `http://localhost:3000`.


## Database Schema

The application uses PostgreSQL with Prisma ORM. The schema consists of three main models:

- **User** — Stores user credentials and profile information
- **Document** — Stores document title and content (as TipTap JSON)
- **DocumentPermission** — Manages role-based access control (VIEWER / EDITOR) for shared documents

