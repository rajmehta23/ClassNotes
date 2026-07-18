import type { RouteObject } from 'react-router-dom';
import { AttendanceHomePage } from '../pages/AttendanceHomePage';
import { AttendanceHistoryPage } from '../pages/AttendanceHistoryPage';
import { AttendanceStatsPage } from '../pages/AttendanceStatsPage';
import { AttendanceSettingsPage } from '../pages/AttendanceSettingsPage';

export const attendanceRoutes: RouteObject[] = [
  {
    path: '',
    element: <AttendanceHomePage />,
  },
  {
    path: 'history',
    element: <AttendanceHistoryPage />,
  },
  {
    path: 'stats',
    element: <AttendanceStatsPage />,
  },
  {
    path: 'settings',
    element: <AttendanceSettingsPage />,
  },
];
