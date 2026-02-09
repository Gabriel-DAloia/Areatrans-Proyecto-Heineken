import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Hubs from './pages/Hubs';
import HubDetail from './pages/HubDetail';
import Asistencias from './pages/Asistencias';
import Flota from './pages/Flota';
import HistoricoIncidencias from './pages/HistoricoIncidencias';
import Liquidaciones from './pages/Liquidaciones';
import Compras from './pages/Compras';
import Contactos from './pages/Contactos';
import KilosLitros from './pages/KilosLitros';
import DiasFestivos from './pages/DiasFestivos';
import RestriccionesHorarias from './pages/RestriccionesHorarias';
import CategoryGeneric from './pages/CategoryGeneric';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/admin" element={<Layout><Admin /></Layout>} />
          <Route path="/hubs" element={<Layout><Hubs /></Layout>} />
          <Route path="/hub/:hubId" element={<Layout><HubDetail /></Layout>} />
          <Route path="/hub/:hubId/asistencias" element={<Layout><Asistencias /></Layout>} />
          <Route path="/hub/:hubId/flota" element={<Layout><Flota /></Layout>} />
          <Route path="/hub/:hubId/historico-incidencias" element={<Layout><HistoricoIncidencias /></Layout>} />
          <Route path="/hub/:hubId/liquidaciones" element={<Layout><Liquidaciones /></Layout>} />
          <Route path="/hub/:hubId/compras" element={<Layout><Compras /></Layout>} />
          <Route path="/hub/:hubId/contactos" element={<Layout><Contactos /></Layout>} />
          <Route path="/hub/:hubId/kilos-litros" element={<Layout><KilosLitros /></Layout>} />
          <Route path="/hub/:hubId/dias-festivos" element={<Layout><DiasFestivos /></Layout>} />
          <Route path="/hub/:hubId/restricciones-horarias" element={<Layout><RestriccionesHorarias /></Layout>} />
          <Route path="/hub/:hubId/:category" element={<Layout><CategoryGeneric /></Layout>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster 
        position="top-right" 
        richColors 
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif'
          }
        }}
      />
    </AuthProvider>
  );
}

export default App;
