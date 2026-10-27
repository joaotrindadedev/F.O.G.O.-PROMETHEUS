import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { LimiteErro } from './components/LimiteErro';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LimiteErro>
      <App />
    </LimiteErro>
  </React.StrictMode>,
);
