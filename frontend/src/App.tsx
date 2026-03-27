import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { IDEPage } from './pages/IDEPage';
import { SkillDetailPage } from './pages/SkillDetailPage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { SessionsPage } from './pages/SessionsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="skills" replace />} />
            <Route path="skills" element={<Dashboard />} />
            <Route path="sessions" element={<SessionsPage />} />
          </Route>
          <Route path="/skills/:author/:name" element={<SkillDetailPage />} />
          <Route path="/ide/:author/:name" element={<IDEPage />} />
          <Route path="/ide" element={<IDEPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
