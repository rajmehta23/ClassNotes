# Repository Folder Structure

```
class-notes/
├── docs/                     # System architecture & design documentation
│   ├── ARCHITECTURE.md
│   └── FOLDER_STRUCTURE.md
├── public/                   # Static assets & public media
├── src/
│   ├── app/                  # Application router setup
│   ├── config/               # App configuration & feature flags
│   ├── core/                 # Core infrastructure (Firebase, auth)
│   ├── modules/              # Domain feature modules
│   │   ├── admin/            # Administrative control panel
│   │   ├── ai-assessment/    # AI Essay evaluation
│   │   ├── ai-learning/      # STEM visual engine & AI Tutor
│   │   ├── assignments/      # Homework & assignment management
│   │   ├── attendance/       # Student attendance tracking
│   │   ├── auth/             # Login, registration, password recovery
│   │   ├── chatbot/          # Gemma 3 & multilingual AI assistant
│   │   ├── dashboard/        # Main student analytics dashboard
│   │   ├── notes/            # Study notes & document viewer
│   │   ├── notices/          # Course announcements feed
│   │   ├── profile/          # User settings & profile modal
│   │   ├── requests/         # Peer note requests board
│   │   ├── rewards/          # Gamification & XP leaderboard
│   │   └── voice/            # Voice command assistant
│   ├── shared/               # Reusable UI, hooks, services, types, utilities
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── styles/               # Global CSS & Tailwind configuration
│   ├── main.tsx              # Entry point
│   └── App.tsx               # App root component
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── package.json
└── vite.config.ts
```
