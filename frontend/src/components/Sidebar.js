import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { 
  Building2, 
  Home, 
  Settings, 
  Users, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wrench,
  Banknote,
  Truck,
  History,
  Package,
  ShoppingCart,
  Scale,
  UserCircle,
  MapPin,
  Menu,
  ChevronDown,
  Calendar,
  Clock
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const categoryConfig = [
  { name: 'Asistencias', icon: Wrench, route: 'asistencias', color: 'text-blue-500' },
  { name: 'Liquidaciones', icon: Banknote, route: 'liquidaciones', color: 'text-emerald-500' },
  { name: 'Flota', icon: Truck, route: 'flota', color: 'text-indigo-500' },
  { name: 'Histórico', icon: History, route: 'historico-incidencias', color: 'text-amber-500' },
  { name: 'Repartos', icon: Package, route: 'repartos', color: 'text-orange-500' },
  { name: 'Compras', icon: ShoppingCart, route: 'compras', color: 'text-purple-500' },
  { name: 'Kilos/Litros', icon: Scale, route: 'kilos-litros', color: 'text-cyan-500' },
  { name: 'Contactos', icon: Users, route: 'contactos', color: 'text-pink-500' }
];

const SidebarContent = ({ isCollapsed, onToggle, isMobile = false }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [hubs, setHubs] = useState([]);
  const [expandedHub, setExpandedHub] = useState(null);

  useEffect(() => {
    const fetchHubs = async () => {
      try {
        const response = await axios.get(`${API_URL}/hubs`);
        setHubs(response.data);
      } catch (error) {
        console.error('Error fetching hubs:', error);
      }
    };
    fetchHubs();
  }, []);

  // Auto-expand hub based on current route
  useEffect(() => {
    const match = location.pathname.match(/\/hub\/([^/]+)/);
    if (match) {
      setExpandedHub(match[1]);
    }
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isHubActive = (hubId) => location.pathname.startsWith(`/hub/${hubId}`);

  const NavItem = ({ to, icon: Icon, label, iconColor = 'text-slate-400' }) => (
    <Link to={to}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          isActive(to) 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive(to) ? 'text-white' : iconColor}`} />
        {!isCollapsed && <span className="text-sm font-medium truncate">{label}</span>}
      </div>
    </Link>
  );

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${isCollapsed ? 'w-16' : 'w-64'} sidebar-transition`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">HubManager</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          <NavItem to="/" icon={Home} label="Inicio" />
          
          {user?.is_admin && (
            <NavItem to="/admin" icon={Settings} label="Administración" />
          )}
        </div>

        {/* Hubs Section */}
        <div className="mt-6">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hubs
              </p>
              <Link to="/hubs" className="text-xs text-blue-400 hover:text-blue-300">
                Ver todos
              </Link>
            </div>
          )}
          <div className="space-y-1">
            {hubs.slice(0, isCollapsed ? 6 : 10).map((hub) => (
              <Collapsible 
                key={hub.id} 
                open={expandedHub === hub.id && !isCollapsed}
                onOpenChange={(open) => setExpandedHub(open ? hub.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                      isHubActive(hub.id)
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    data-testid={`nav-hub-${hub.id}`}
                  >
                    <MapPin className={`w-5 h-5 flex-shrink-0 ${isHubActive(hub.id) ? 'text-blue-400' : 'text-slate-400'}`} />
                    {!isCollapsed && (
                      <>
                        <span className="text-sm font-medium truncate flex-1">{hub.name}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedHub === hub.id ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </div>
                </CollapsibleTrigger>
                {!isCollapsed && (
                  <CollapsibleContent className="pl-6 space-y-1 mt-1">
                    {categoryConfig.map((cat) => {
                      const Icon = cat.icon;
                      const catPath = `/hub/${hub.id}/${cat.route}`;
                      const isCatActive = location.pathname === catPath;
                      return (
                        <Link to={catPath} key={cat.route}>
                          <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                              isCatActive
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isCatActive ? 'text-white' : cat.color}`} />
                            <span className="truncate">{cat.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                )}
              </Collapsible>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* User Section */}
      <div className="p-3 border-t border-slate-800">
        {!isCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
            data-testid="logout-btn-collapsed"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0">
        <SidebarContent 
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)} 
        />
      </div>

      {/* Mobile Sidebar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">HubManager</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent isCollapsed={false} isMobile={true} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
