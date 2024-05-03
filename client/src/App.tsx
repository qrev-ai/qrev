import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import loadable from '@loadable/component';

const Layout = loadable(() => import('./layout/Layout'));
const PrivateRoute = loadable(() => import('./pages/login/PrivateRoute'));
const Login = loadable(() => import('./pages/login/login'));
const Campaigns = loadable(() => import('./pages/campaigns'));
const CRM = loadable(() => import('./pages/crm'));
const CampaignDetails = loadable(() => import('./pages/campaign-details'));
const DefaultApps = loadable(() => import('./pages/apps/DefaultApps'));
const Settings = loadable(() => import('./pages/settings/settings'));
const AgentBot = loadable(() => import('./pages/agent/agent'));

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route path="/" element={<AgentBot />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/details" element={<CampaignDetails />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/apps" element={<DefaultApps />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="/login" element={<Login />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
