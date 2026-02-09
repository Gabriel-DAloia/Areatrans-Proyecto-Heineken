import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Building2, 
  MapPin,
  ArrowLeft,
  Loader2,
  Wrench,
  Banknote,
  Truck,
  History,
  Package,
  ShoppingCart,
  Scale,
  Users,
  ChevronRight,
  Calendar,
  Clock
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const categoryConfig = [
  { name: 'Asistencias', icon: Wrench, route: 'asistencias', color: 'bg-blue-500', description: 'Control de asistencia de empleados' },
  { name: 'Liquidaciones', icon: Banknote, route: 'liquidaciones', color: 'bg-emerald-500', description: 'Gestión de liquidaciones' },
  { name: 'Flota', icon: Truck, route: 'flota', color: 'bg-indigo-500', description: 'Control de vehículos' },
  { name: 'Historico de incidencias', icon: History, route: 'historico-incidencias', color: 'bg-amber-500', description: 'Registro de incidencias' },
  { name: 'Repartos', icon: Package, route: 'repartos', color: 'bg-orange-500', description: 'Gestión de repartos' },
  { name: 'Compras', icon: ShoppingCart, route: 'compras', color: 'bg-purple-500', description: 'Control de compras' },
  { name: 'Kilos/Litros', icon: Scale, route: 'kilos-litros', color: 'bg-cyan-500', description: 'Registro de cantidades' },
  { name: 'Contactos', icon: Users, route: 'contactos', color: 'bg-pink-500', description: 'Directorio de contactos' }
];

const HubDetail = () => {
  const { hubId } = useParams();
  const [hub, setHub] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const response = await axios.get(`${API_URL}/hubs/${hubId}`);
        setHub(response.data);
      } catch (error) {
        console.error('Error fetching hub:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHub();
  }, [hubId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Hub no encontrado</p>
        <Link to="/hubs">
          <Button className="mt-4">Volver a Hubs</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="hub-detail-page">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/hubs">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{hub.name}</h1>
              {hub.location && (
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-4 h-4" />
                  <span>{hub.location}</span>
                </div>
              )}
            </div>
          </div>
          {hub.description && (
            <p className="text-slate-600 ml-16">{hub.description}</p>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Secciones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryConfig.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link 
                to={`/hub/${hubId}/${category.route}`} 
                key={category.route}
                data-testid={`category-link-${category.route}`}
              >
                <Card 
                  className="border border-slate-200 hover:border-blue-400 transition-all card-hover cursor-pointer group h-full"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`w-11 h-11 ${category.color} rounded-xl flex items-center justify-center mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HubDetail;
