import { AppShell } from '@mantine/core';
import { useState } from 'react';
import './App.css';
import { Layout } from './components/Layout';

function App() {
  return (
    <AppShell
      padding={0}
      styles={{
        main: {
          background: '#1A1B1E',
          height: '100vh',
          overflow: 'hidden',
        },
      }}
    >
      <Layout />
    </AppShell>
  );
}

export default App;
