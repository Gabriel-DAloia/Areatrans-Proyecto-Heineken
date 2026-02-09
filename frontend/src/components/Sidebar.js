import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

const categoryIcons = {
  'Asistencias': Wrench,
  'Liquidaciones': Banknote,
  'Flota': Truck,
  'Historico de incidencias': History,
  'Repartos': Package,
  'Compras': ShoppingCart,
  'Kilos/Litros': Scale,
  'Contactos': Users
};

const categoryColors = {
  'Asistencias': 'text-blue-500',
  'Liquidaciones': 'text-emerald-500',
  'Flota': 'text-indigo-500',
  'Historico de incidencias': 'text-amber-500',
  'Repartos': 'text-orange-500',
  'Compras': 'text-purple-500',
  'Kilos/Litros': 'text-cyan-500',
  'Contactos': 'text-pink-500'
};

const categories = [
  'Asistencias',
  'Liquidaciones',
  'Flota',
  'Historico de incidencias',
  'Repartos',
  'Compras',
  'Kilos/Litros',
  'Contactos'
];

const SidebarContent = ({ isCollapsed, onToggle, isMobile = false }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path;
  const isCategoryActive = (category) => location.pathname === `/categoria/${encodeURIComponent(category)}`;

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
          <NavItem to="/hubs" icon={MapPin} label="Hubs" />
          
          {user?.is_admin && (
            <NavItem to="/admin" icon={Settings} label="Administración" />
          )}
        </div>

        {/* Categories Section */}
        <div className="mt-6">
          {!isCollapsed && (
            <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Categorías
            </p>
          )}
          <div className="space-y-1">
            {categories.map((category) => {
              const Icon = categoryIcons[category] || Package;
              const iconColor = categoryColors[category] || 'text-slate-400';
              return (
                <Link to={`/categoria/${encodeURIComponent(category)}`} key={category}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isCategoryActive(category)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    data-testid={`nav-category-${category.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isCategoryActive(category) ? 'text-white' : iconColor}`} />
                    {!isCollapsed && <span className="text-sm font-medium truncate">{category}</span>}
                  </div>
                </Link>
              );
            })}
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
