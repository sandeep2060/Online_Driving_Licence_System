# Drive License Application System

A web application for managing driving license applications and examinations in Nepal.

## Features

- 👤 User authentication with Supabase
- 📝 License application management
- 🧪 Online examination system
- 👨‍💼 Admin dashboard for application review
- 🗣️ Multi-language support (English & Nepali)
- 📱 Responsive design
- 🔐 Row-level security for data privacy

## Quick Start

1. **Clone and install**:
   ```bash
   npm install
   ```

2. **Setup Supabase** (see [SETUP.md](SETUP.md) for detailed instructions)

3. **Start development**:
   ```bash
   npm run dev
   ```

## Documentation

- [Complete Setup Guide](SETUP.md) - Detailed instructions for environment setup
- Database schema is in `supabase/schema.sql`

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: CSS
- **Router**: React Router
- **State Management**: React Context API

## Project Structure

```
src/
├── pages/          # Page components (Login, SignUp, Dashboards)
├── context/        # Auth & Language contexts
├── components/     # Reusable UI components
└── lib/            # Supabase client
supabase/
└── schema.sql      # Database schema
```

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```
