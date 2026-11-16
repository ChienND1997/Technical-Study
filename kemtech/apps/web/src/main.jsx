import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import AppProviders from '@/app/providers.jsx';
import { router } from '@/app/router.jsx';
import './styles/global.css';
import './styles/practice.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);