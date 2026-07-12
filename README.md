# LinguaCore — Language Center Management System
> **Prepared by Novexus Solutions**

---

## Prerequisites

| Software | Version | Download |
|----------|---------|----------|
| .NET 9 SDK | 9.x | https://dotnet.microsoft.com/download/dotnet/9.0 |
| Node.js | 20+ | https://nodejs.org |
| SQL Server Express | Any | https://www.microsoft.com/en-us/sql-server/sql-server-downloads |
| dotnet-ef tools | 9.x | `dotnet tool install -g dotnet-ef` |

---

## First-Time Setup (Step by Step)

### Step 1 — Configure `appsettings.json`
Open `LinguaCore.API/appsettings.json` and fill in:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=.\\SQL2025;Database=LanguaCenterDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!"
  },
  "Smtp": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "EnableSsl": true,
    "Username": "your-center@gmail.com",
    "Password": "your-gmail-app-password"
  },
  "Firebase": {
    "DatabaseUrl": "https://your-project-default-rtdb.firebaseio.com"
  },
  "Seeding": {
    "BranchName": "Main Branch",
    "BranchAddress": "123 Center Street, Cairo"
  }
}
```

### Step 2 — Create the Database
Run from the **solution root** (where `LinguaCore.sln` is):
```powershell
.\run-migrations.ps1
```
This creates all tables, applies seed data (levels A1–C2, lookup tables, Super Admin role, seeded branch).

### Step 3 — Build the EXE
```powershell
.\build-and-publish.ps1
```
This:
1. Builds the React frontend (npm install + npm run build)
2. Restores and builds .NET
3. Publishes a single self-contained `LinguaCore.API.exe` to `./publish/`
4. Copies `appsettings.json` next to the EXE

### Step 4 — Run the Application
```
.\publish\LinguaCore.API.exe
```
Or simply **double-click** `LinguaCore.API.exe` in File Explorer.

The browser opens automatically at **http://localhost:5000**

**First launch:** Shows the **Initial Setup** page (no users in DB).
Create your Super Admin account — branch and role are auto-assigned.

---

## How the EXE Works

```
LinguaCore.API.exe
│
├── Starts Kestrel HTTP server on port 5000
├── Applies pending EF migrations automatically on startup
├── Seeds branch + Super Admin role if DB is empty
├── Serves React SPA from embedded wwwroot/
├── Exposes REST API at /api/*
├── Starts Firebase sync background worker (every 5 min)
└── Opens browser at http://localhost:5000
```

**The EXE is 100% self-contained** — no .NET runtime installation needed on the target machine.
Only SQL Server Express must be installed separately.

---

## Distributing to Client

Copy these two files to the client machine:
```
publish/
  LinguaCore.API.exe        ← the application
  appsettings.json          ← configuration (edit before first run)
```

The client needs:
- SQL Server Express installed and running
- The connection string in `appsettings.json` pointing to their SQL Server instance
- WhatsApp Desktop installed and logged in (for WhatsApp notifications)

---

## Development Mode

### Run backend with hot reload:
```powershell
cd LinguaCore.API
dotnet watch run
```

### Run React dev server (with hot reload + API proxy):
```powershell
cd frontend
npm run dev
```
Frontend: http://localhost:5173 (proxies API calls to http://localhost:5000)

---

## Project Structure

```
LinguaCore/
├── LinguaCore.Domain/               # Entities, interfaces (no dependencies)
│   ├── Entities/                    # 34 entity classes with business methods
│   └── Interfaces/
│       ├── IUnitOfWork.cs
│       └── Repositories/            # 14 repository interfaces
│
├── LinguaCore.Infrastructure/       # Data access, external services
│   ├── Data/AppDbContext.cs         # EF Core DbContext + seeding + cascade config
│   ├── Repositories/                # 14 repository implementations
│   ├── Services/
│   │   ├── NotificationService.cs   # SMTP email + WhatsApp Win32 automation
│   │   ├── FirebaseSyncService.cs   # Firebase REST sync (delta by modified_at)
│   │   └── FirebaseSyncWorker.cs    # Background service (every 5 min)
│   ├── Seeding/DatabaseSeeder.cs    # Auto-seeds branch + role on startup
│   └── UnitOfWork.cs
│
├── LinguaCore.Application/          # Business logic, DTOs
│   ├── DTOs/Request/                # 10 request DTO files
│   ├── DTOs/Response/               # 14 response DTO files
│   ├── Interfaces/Services/         # 13 service interfaces
│   └── Services/                    # 11 service implementations
│
├── LinguaCore.API/                  # ASP.NET Core Web API
│   ├── Controllers/                 # 13 controllers
│   ├── Middleware/ExceptionMiddleware.cs
│   ├── Program.cs                   # Startup: DI + JWT + SPA + seeder
│   └── appsettings.json             # ← Configure this
│
├── frontend/                        # React 18 + Vite + Tailwind
│   └── src/
│       ├── pages/                   # 9 fully-built pages
│       ├── components/
│       │   ├── Layout.jsx           # Sidebar + dark mode toggle
│       │   └── ui.jsx               # All shared UI components
│       ├── services/                # Axios API client + all endpoints
│       └── context/                 # Zustand auth + theme stores
│
├── build-and-publish.ps1            # One-command build → EXE
└── run-migrations.ps1               # Database setup
```

---

## Features Summary

| Module | Status |
|--------|--------|
| Auth (JWT + first-user setup) | ✅ Full |
| Students (CRUD + QR + portfolio) | ✅ Full |
| Instructors (CRUD + commissions) | ✅ Full |
| Groups (CRUD + change instructor) | ✅ Full |
| Sessions (schedule + manual/QR attendance) | ✅ Full |
| Exams (CRUD + results + rankings + certificates) | ✅ Full |
| Payments (record + refund + monthly closing) | ✅ Full |
| Waiting List (CRUD + convert + alarms) | ✅ Full |
| Dashboard (7 sub-dashboards with charts) | ✅ Full |
| Settings (all lookups + roles + branches) | ✅ Full |
| Notifications (Gmail SMTP + WhatsApp Win32) | ✅ Full |
| Firebase sync (delta by modified_at, 5-min worker) | ✅ Full |
| Dark / Light mode | ✅ Full |
| First-run setup page | ✅ Full |

---

*LinguaCore v1.0 — Novexus Solutions — Confidential*
# Linguacore-Neon
