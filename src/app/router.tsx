import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingPage from '@/components/LoadingPage';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const Notes = lazy(() => import('@/pages/Notes'));
const AttendanceModule = lazy(() => import('@/modules/attendance/AttendanceModule'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Announcements = lazy(() => import('@/pages/Announcements'));
const Rewards = lazy(() => import('@/pages/Rewards'));
const Settings = lazy(() => import('@/pages/Settings'));
const Admin = lazy(() => import('@/pages/Admin'));
const NoteRequests = lazy(() => import('@/pages/NoteRequests'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Suspense Wrapper component
const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingPage />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  // Public auth pages (outside main shell layout)
  {
    path: '/login',
    element: <ErrorBoundary><SuspenseWrapper><Login /></SuspenseWrapper></ErrorBoundary>,
  },
  {
    path: '/register',
    element: <ErrorBoundary><SuspenseWrapper><Register /></SuspenseWrapper></ErrorBoundary>,
  },
  {
    path: '/forgot-password',
    element: <ErrorBoundary><SuspenseWrapper><ForgotPassword /></SuspenseWrapper></ErrorBoundary>,
  },

  // Main application shell
  {
    path: '/',
    element: <ErrorBoundary><ProtectedRoute><RootLayout /></ProtectedRoute></ErrorBoundary>,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'notes',
        element: <Notes />,
      },
      {
        path: 'attendance',
        element: <AttendanceModule />,
      },
      {
        path: 'requests',
        element: <NoteRequests />,
      },
      {
        path: 'calendar',
        element: <Calendar />,
      },
      {
        path: 'announcements',
        element: <Announcements />,
      },
      {
        path: 'rewards',
        element: <Rewards />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'admin',
        element: <ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
