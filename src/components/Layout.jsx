import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col safe-top">
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>
    </div>
  );
}
