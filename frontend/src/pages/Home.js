import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Building2, 
  Users, 
  Clock,
  ArrowRight,
  MapPin,
  ChevronRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, hubsRes] = await Promise.all([
          axios.get(`${API_URL}/stats`),
          axios.get(`${API_URL}/hubs`)
        ]);
        setStats(statsRes.data);
        setHubs(hubsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="home-dashboard">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        {/* Welcome Card */}
        <Card className="lg:col-span-4 row-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center gap-2 text-blue-200 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2" data-testid="welcome-message">
              {getGreeting()}, {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-lg text-blue-100 mb-6 max-w-lg">
              Bienvenido a HubManager. Selecciona un hub para gestionar sus operaciones.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/hubs">
                <Button className="bg-white text-blue-600 hover:bg-blue-50 font-medium" data-testid="view-hubs-btn">
                  <MapPin className="w-4 h-4 mr-2" />
                  Ver Hubs
                </Button>
              </Link>
              {user?.is_admin && (
                <Link to="/admin">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" data-testid="admin-panel-btn">
                    Panel Admin
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card className="lg:col-span-2 border border-slate-200 hover:border-blue-300 transition-colors card-hover">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Total Hubs</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-hubs-count">
                {loading ? '-' : stats?.total_hubs || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border border-slate-200 hover:border-blue-300 transition-colors card-hover">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Empleados</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-employees-count">
                {loading ? '-' : stats?.total_employees || 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hubs Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Hubs</h2>
          <Link to="/hubs">
            <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="border border-slate-200 animate-pulse">
                <CardContent className="p-5">
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : (
            hubs.map((hub, index) => (
              <Link to={`/hub/${hub.id}`} key={hub.id}>
                <Card 
                  className="border border-slate-200 hover:border-blue-400 transition-all card-hover cursor-pointer group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  data-testid={`hub-card-${hub.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {hub.name}
                            </h3>
                            {hub.location && (
                              <div className="flex items-center gap-1 text-sm text-slate-500">
                                <MapPin className="w-3 h-3" />
                                <span>{hub.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {hub.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 ml-13">{hub.description}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Admin Quick Stats */}
      {user?.is_admin && stats?.pending_users > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-900">Usuarios pendientes de aprobación</p>
                <p className="text-sm text-amber-700">{stats.pending_users} usuario{stats.pending_users !== 1 ? 's' : ''} esperando</p>
              </div>
            </div>
            <Link to="/admin">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="pending-users-btn">
                Revisar
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Home;
