import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // <- garanta que essa linha existe
import { setAuth } from './lib/api';
const saved = localStorage.getItem('token');
if (saved) setAuth(saved);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
