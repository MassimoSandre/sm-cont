import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ResponsiveNav from '../components/ResponsiveNav';

export default function MainLayout() {
  return (
    <div className="flex h-screen">
      <ResponsiveNav />
      <main className="pt-0 md:pt-16 pb-16 md:pb-0 flex-1">
        <Outlet />  {/* Carica la pagina attiva */}
      </main>
    </div>
  );
}