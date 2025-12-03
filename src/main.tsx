import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializePerformanceOptimizations } from './utils/performance'

// Initialize performance optimizations
initializePerformanceOptimizations();

createRoot(document.getElementById("root")!).render(<App />);
