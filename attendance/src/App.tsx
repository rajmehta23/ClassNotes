import { AttendanceModule } from './features/attendance';

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      <AttendanceModule userId="demo_student_user" />
    </div>
  );
}

export default App;
