import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import RegisterOrganization from '@/pages/RegisterOrganization';
import Dashboard from '@/pages/Dashboard';
import TerritoryManagement from '@/pages/TerritoryManagement';
import LeadManagement from '@/pages/LeadManagement';
import RepTurf from '@/pages/RepTurf';
import AnalyticsPage from '@/pages/AnalyticsPage';
import TeamManagementPage from '@/pages/TeamManagementPage';
import PerformancePage from '@/pages/PerformancePage';
import SettingsPage from '@/pages/SettingsPage';
import UserProfile from '@/pages/UserProfile';
import ProtectedRoute from '@/components/ProtectedRoute';

const AppRouter: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<RegisterOrganization />} />

    {/* Admin/Manager Routes */}
    <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER']} />}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/territories" element={<TerritoryManagement />} />
      <Route path="/leads" element={<LeadManagement />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/team" element={<TeamManagementPage />} />
      <Route path="/performance" element={<PerformancePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>

    {/* Rep Routes */}
    <Route element={<ProtectedRoute roles={['REP']} />}>
      <Route path="/" element={<Navigate to="/turf" replace />} />
      <Route path="/turf" element={<RepTurf />} />
    </Route>

    {/* Shared Routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/profile" element={<UserProfile />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
