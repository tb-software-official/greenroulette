import React from 'react';
import { createRoot } from 'react-dom/client'; // Updated import for React 18
import App from './App';
import { GameProvider } from './GameContext'; // Ensure this is the correct path
import { BrowserRouter as Router } from 'react-router-dom';

// Find the root element
const container = document.getElementById('root');
// Create a root
const root = createRoot(container); // Create a root instance on the container

// Render the app inside the GameProvider
root.render(
  <React.StrictMode>
    <Router>
      <GameProvider>
        <App />
      </GameProvider>
    </Router>
  </React.StrictMode>
);
