# ClassNotes

ClassNotes is a production-ready, cohort-based study material sharing platform for students. It features user authentication, a peer rewards point system, notes upload verification queues, and class notice tracking.

## Features

- **Cohort Filtering**: Automatically filters notes, requests, and calendars based on the student's Course, Semester, and Batch.
- **Notes Approval Queue**: Uploaded notes enter a pending state and are only published after admin validation. Uploaders earn points upon admin approval.
- **Optional Learning Resources**: Notes can include reference links (such as YouTube videos, Wikipedia, or educational websites) styled with site-specific icons and animated links.
- **Note Requests**: Students can post requests for study guides or cheatsheets, vote on requests ("I Need This Too"), and fulfill them directly via note uploads.
- **Rewards System**: Earn coins by uploading helpful notes and redeem them to download notes or download premium study cheat sheets.
- **Calendar & Notices**: Track class timetables, event schedules, and official cohort notices in real-time.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS 4, Framer Motion
- **State Management**: Zustand
- **Query Caching**: TanStack React Query
- **Database & Auth**: Firebase (Authentication & Cloud Firestore)
- **Asset Storage**: Cloudinary (Image & PDF uploads)
- **Hosting**: Designed for Vercel

## Folder Structure

```text
├── .github/                # GitHub CI/CD workflows
├── src/
│   ├── app/                # Router configurations
│   ├── components/         # Shared UI Components (Modals, ProtectedRoute)
│   ├── features/           # Zustand state store hooks (Auth, Notes, Rewards)
│   ├── firebase/           # Firebase initialization client SDK config
│   ├── hooks/              # Custom React Hooks
│   ├── layouts/            # Layout shells (RootLayout)
│   ├── pages/              # Application Pages (Dashboard, Notes, Admin)
│   ├── services/           # Data services (Notes, Rewards, Bookmarks)
│   ├── types/              # TypeScript types and Zod database schemas
│   └── utils/              # Utility helper scripts
├── firestore.rules         # Security Rules for Firestore Database
├── vercel.json             # Vercel deployment redirection configurations
└── package.json            # Scripts and dependencies definitions
```

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rajmehta23/ClassNotes.git
   cd ClassNotes
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and specify the keys (refer to `.env.example`):
   ```ini
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
   ```

## Running Locally

To start the development server:
```bash
npm run dev
```

To run a production preview locally:
```bash
npm run build
npm run preview
```

## Deployment

### Deploying to Vercel
1. Import the repository into your Vercel Dashboard.
2. In the project settings, add the environment variables defined above.
3. Deploy! Vercel will automatically read `vercel.json` for SPA routing configuration.

## Screenshots

*(Screenshots placeholders)*
- **Dashboard Overview**: `[Insert Dashboard Screenshot Here]`
- **Lecture Notes Grid**: `[Insert Notes Screenshot Here]`
- **Cohort requests**: `[Insert Requests Screenshot Here]`

## License

This project is licensed under the MIT License.
