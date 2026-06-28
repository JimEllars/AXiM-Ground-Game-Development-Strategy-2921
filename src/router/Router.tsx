import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';

// Dynamic import helper with 3-stage exponential backoff (1s, 3s, 5s)
function lazyWithRetries(componentImport: () => Promise<any>) {
  return lazy(async () => {
    const delays = [1000, 3000, 5000];
    let attempt = 0;

    while (attempt < delays.length) {
      try {
        return await componentImport();
      } catch (error) {
        attempt++;
        if (attempt >= delays.length) {
           // On final failure, force a hard reload which might fetch new service worker assets
           window.location.reload();
           return { default: () => <div>Connection lost. Reloading...</div> };
        }
        await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
      }
    }
    return { default: () => <div>Error loading chunk.</div> };
  });
}

// Lazy load route components using the resilient helper
const Login = lazyWithRetries(() => import('@/pages/Login'));
const RegisterOrganization = lazyWithRetries(() => import('@/pages/RegisterOrganization'));
const Dashboard = lazyWithRetries(() => import('@/pages/Dashboard'));
const TerritoryManagement = lazyWithRetries(() => import('@/pages/TerritoryManagement'));
const LeadManagement = lazyWithRetries(() => import('@/pages/LeadManagement'));
const RepTurf = lazyWithRetries(() => import('@/pages/RepTurf'));
const AnalyticsPage = lazyWithRetries(() => import('@/pages/AnalyticsPage'));
const TeamManagementPage = lazyWithRetries(() => import('@/pages/TeamManagementPage'));
const PerformancePage = lazyWithRetries(() => import('@/pages/PerformancePage'));
const SettingsPage = lazyWithRetries(() => import('@/pages/SettingsPage'));
const UserProfile = lazyWithRetries(() => import('@/pages/UserProfile'));

const SuspenseLoader = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    {children}
  </Suspense>
);

const AppRouter: React.FC = () => (
  <Routes>
    <Route path="/login" element={<SuspenseLoader><Login /></SuspenseLoader>} />
    <Route path="/register" element={<SuspenseLoader><RegisterOrganization /></SuspenseLoader>} />

    {/* Admin/Manager Routes */}
    <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER']} />}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<SuspenseLoader><Dashboard /></SuspenseLoader>} />
      <Route path="/territories" element={<SuspenseLoader><TerritoryManagement /></SuspenseLoader>} />
      <Route path="/leads" element={<SuspenseLoader><LeadManagement /></SuspenseLoader>} />
      <Route path="/analytics" element={<SuspenseLoader><AnalyticsPage /></SuspenseLoader>} />
      <Route path="/team" element={<SuspenseLoader><TeamManagementPage /></SuspenseLoader>} />
      <Route path="/performance" element={<SuspenseLoader><PerformancePage /></SuspenseLoader>} />
      <Route path="/settings" element={<SuspenseLoader><SettingsPage /></SuspenseLoader>} />
    </Route>

    {/* Rep Routes */}
    <Route element={<ProtectedRoute roles={['REP']} />}>
      <Route path="/" element={<Navigate to="/turf" replace />} />
      <Route path="/turf" element={<SuspenseLoader><RepTurf /></SuspenseLoader>} />
    </Route>

    {/* Shared Routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/profile" element={<SuspenseLoader><UserProfile /></SuspenseLoader>} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
