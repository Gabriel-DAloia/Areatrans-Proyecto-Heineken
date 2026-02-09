import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  Loader2,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Save,
  User,
  MapPin,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getDayName = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return DAYS_SHORT[date.getDay()];
};

const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const Liquidaciones = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [entries, setEntries] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Date selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [daysInMonth, setDaysInMonth] = useState(31);
  
  // Route dialog
  const [isRouteDialogOpen, setIsRouteDialogOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [addingRoute, setAddingRoute] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hubRes, routesRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/routes`)
      ]);
      
      setHub(hubRes.data);
      setRoutes(routesRes.data);
      
      // Calculate days in month
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      setDaysInMonth(lastDay);
      
      // If we have routes, select the first one and fetch its data
      if (routesRes.data.length > 0) {
        const firstRoute = routesRes.data[0];
        setSelectedRoute(firstRoute.id);
        await fetchRouteData(firstRoute.id);
      }
      
      // Fetch summary
      await fetchSummary();
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [hubId, selectedYear, selectedMonth]);

  const fetchRouteData = async (routeId) => {
    try {
      const response = await axios.get(`${API_URL}/hubs/${hubId}/liquidations`, {
        params: { year: selectedYear, month: selectedMonth, route_id: routeId }
      });
      
      // Convert to map by date
      const entriesMap = {};
      response.data.forEach(entry => {
        entriesMap[entry.date] = entry;
      });
      setEntries(entriesMap);
    } catch (error) {
      console.error('Error fetching route data:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/hubs/${hubId}/liquidations/summary`, {
        params: { year: selectedYear, month: selectedMonth }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedRoute) {
      fetchRouteData(selectedRoute);
    }
  }, [selectedRoute, selectedYear, selectedMonth]);

  const handleRouteChange = (routeId) => {
    setSelectedRoute(routeId);
    setHasChanges(false);
  };

  const handleCellChange = (date, field, value) => {
    setEntries(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: field === 'repartidor' ? value.toLowerCase() : value
      }
    }));
    setHasChanges(true);
  };

  const getEntryValue = (date, field) => {
    return entries[date]?.[field] || (field === 'metalico' || field === 'ingreso' ? '' : '');
  };

  const getDiferencia = (date) => {
    const metalico = parseFloat(entries[date]?.metalico) || 0;
    const ingreso = parseFloat(entries[date]?.ingreso) || 0;
    return metalico - ingreso;
  };

  const handleSave = async () => {
    if (!selectedRoute) return;
    
    setSaving(true);
    try {
      const entriesToSave = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const entry = entries[date];
        
        if (entry && (entry.repartidor || entry.metalico || entry.ingreso || entry.comentario)) {
          entriesToSave.push({
            route_id: selectedRoute,
            hub_id: hubId,
            date: date,
            repartidor: entry.repartidor || '',
            metalico: parseFloat(entry.metalico) || 0,
            ingreso: parseFloat(entry.ingreso) || 0,
            comentario: entry.comentario || ''
          });
        }
      }
      
      if (entriesToSave.length > 0) {
        await axios.post(`${API_URL}/hubs/${hubId}/liquidations/bulk`, entriesToSave);
      }
      
      toast.success('Liquidaciones guardadas');
      setHasChanges(false);
      await fetchSummary();
      
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoute = async () => {
    if (!newRouteName.trim()) {
      toast.error('El nombre de la ruta es obligatorio');
      return;
    }
    
    setAddingRoute(true);
    try {
      await axios.post(`${API_URL}/hubs/${hubId}/routes`, {
        hub_id: hubId,
        name: newRouteName.trim()
      });
      toast.success('Ruta agregada');
      setNewRouteName('');
      setIsRouteDialogOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar ruta');
    } finally {
      setAddingRoute(false);
    }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    if (!window.confirm(`¿Eliminar la ruta ${routeName}? También se eliminarán todas sus liquidaciones.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/routes/${routeId}`);
      toast.success('Ruta eliminada');
      if (selectedRoute === routeId) {
        setSelectedRoute(null);
        setEntries({});
      }
      await fetchData();
    } catch (error) {
      toast.error('Error al eliminar ruta');
    }
  };

  const navigateMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    setHasChanges(false);
  };

  // Calculate totals for current route
  const calculateRouteTotals = () => {
    let totalMetalico = 0;
    let totalIngreso = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      totalMetalico += parseFloat(entries[date]?.metalico) || 0;
      totalIngreso += parseFloat(entries[date]?.ingreso) || 0;
    }
    
    return { totalMetalico, totalIngreso, diferencia: totalMetalico - totalIngreso };
  };

  const routeTotals = calculateRouteTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="liquidaciones-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Liquidaciones</h1>
            <p className="text-slate-500">{hub?.name}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigation */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 font-medium text-sm min-w-[140px] text-center">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => setIsRouteDialogOpen(true)}
            variant="outline"
            data-testid="add-route-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ruta
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={saving || !hasChanges || !selectedRoute}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="save-liquidaciones-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="data" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="data" className="data-[state=active]:bg-white">
            Datos por Ruta
          </TabsTrigger>
          <TabsTrigger value="repartidores" className="data-[state=active]:bg-white">
            Descuadre por Repartidor
          </TabsTrigger>
          <TabsTrigger value="rutas" className="data-[state=active]:bg-white">
            Descuadre por Ruta
          </TabsTrigger>
        </TabsList>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          {/* Route Selection */}
          {routes.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-4">No hay rutas registradas</p>
                <Button onClick={() => setIsRouteDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Ruta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-sm font-medium mr-2">Ruta:</Label>
                    {routes.map(route => (
                      <div key={route.id} className="flex items-center">
                        <Button
                          variant={selectedRoute === route.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleRouteChange(route.id)}
                          className={selectedRoute === route.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        >
                          {route.name}
                        </Button>
                        {user?.is_admin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRoute(route.id, route.name)}
                            className="h-8 w-8 ml-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedRoute && (
                <>
                  {/* Route Totals */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="border border-slate-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase font-medium">Metálico</p>
                        <p className="text-2xl font-bold text-slate-900">{routeTotals.totalMetalico.toFixed(2)} €</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-slate-200">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase font-medium">Ingreso</p>
                        <p className="text-2xl font-bold text-slate-900">{routeTotals.totalIngreso.toFixed(2)} €</p>
                      </CardContent>
                    </Card>
                    <Card className={`border ${routeTotals.diferencia !== 0 ? (routeTotals.diferencia > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50') : 'border-slate-200'}`}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-slate-500 uppercase font-medium">Descuadre</p>
                        <p className={`text-2xl font-bold ${routeTotals.diferencia > 0 ? 'text-red-600' : routeTotals.diferencia < 0 ? 'text-green-600' : 'text-slate-900'}`}>
                          {routeTotals.diferencia.toFixed(2)} €
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Data Table */}
                  <Card className="border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[100px]">Fecha</th>
                            <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[150px]">Repartidor</th>
                            <th className="px-3 py-3 text-right font-semibold text-slate-700 min-w-[100px]">Metálico</th>
                            <th className="px-3 py-3 text-right font-semibold text-slate-700 min-w-[100px]">Ingreso</th>
                            <th className="px-3 py-3 text-right font-semibold text-slate-700 min-w-[100px]">Diferencia</th>
                            <th className="px-3 py-3 text-left font-semibold text-slate-700 min-w-[150px]">Comentario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayName = getDayName(date);
                            const isWeekend = dayName === 'Sáb' || dayName === 'Dom';
                            const diferencia = getDiferencia(date);
                            
                            return (
                              <tr key={day} className={`border-b border-slate-100 ${isWeekend ? 'bg-slate-50' : ''}`}>
                                <td className="px-3 py-2">
                                  <span className="font-medium">{String(day).padStart(2, '0')}</span>
                                  <span className={`ml-2 text-xs ${isWeekend ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                                    {dayName}
                                  </span>
                                </td>
                                <td className="px-3 py-1">
                                  <Input
                                    value={getEntryValue(date, 'repartidor')}
                                    onChange={(e) => handleCellChange(date, 'repartidor', e.target.value)}
                                    className="h-8 text-xs lowercase"
                                    placeholder="nombre"
                                    style={{ textTransform: 'lowercase' }}
                                  />
                                </td>
                                <td className="px-3 py-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={getEntryValue(date, 'metalico')}
                                    onChange={(e) => handleCellChange(date, 'metalico', e.target.value)}
                                    className="h-8 text-xs text-right"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-3 py-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={getEntryValue(date, 'ingreso')}
                                    onChange={(e) => handleCellChange(date, 'ingreso', e.target.value)}
                                    className="h-8 text-xs text-right"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`font-mono font-medium ${
                                    diferencia > 0 ? 'text-red-600' : diferencia < 0 ? 'text-green-600' : 'text-slate-400'
                                  }`}>
                                    {diferencia !== 0 ? diferencia.toFixed(2) : '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-1">
                                  <Input
                                    value={getEntryValue(date, 'comentario')}
                                    onChange={(e) => handleCellChange(date, 'comentario', e.target.value)}
                                    className="h-8 text-xs"
                                    placeholder=""
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* Repartidores Tab */}
        <TabsContent value="repartidores" className="space-y-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Descuadre por Empleado - {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.by_repartidor || summary.by_repartidor.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay datos de repartidores</p>
              ) : (
                <div className="space-y-4">
                  {summary.by_repartidor.map((rep, index) => (
                    <Card key={index} className={`border ${rep.total > 0 ? 'border-red-200 bg-red-50' : rep.total < 0 ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rep.total > 0 ? 'bg-red-100' : rep.total < 0 ? 'bg-green-100' : 'bg-slate-100'}`}>
                              <User className={`w-5 h-5 ${rep.total > 0 ? 'text-red-600' : rep.total < 0 ? 'text-green-600' : 'text-slate-600'}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 lowercase">{rep.repartidor}</p>
                              <p className={`text-sm ${rep.total > 0 ? 'text-red-600' : rep.total < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                                {rep.estado}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${rep.total > 0 ? 'text-red-600' : rep.total < 0 ? 'text-green-600' : 'text-slate-900'}`}>
                              {rep.total > 0 ? '+' : ''}{rep.total.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="rutas" className="space-y-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Descuadre por Ruta - {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.by_route || summary.by_route.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay datos de rutas</p>
              ) : (
                <div className="space-y-6">
                  {summary.by_route.map((route, index) => (
                    <Card key={index} className="border border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <Badge className="bg-emerald-100 text-emerald-700 text-lg px-3 py-1">
                            Ruta {route.route_name}
                          </Badge>
                          <div className={`text-right px-4 py-2 rounded-lg ${route.descuadre !== 0 ? (route.descuadre > 0 ? 'bg-red-100' : 'bg-green-100') : 'bg-slate-100'}`}>
                            <p className="text-xs text-slate-500">Descuadre</p>
                            <p className={`text-xl font-bold ${route.descuadre > 0 ? 'text-red-600' : route.descuadre < 0 ? 'text-green-600' : 'text-slate-900'}`}>
                              {route.descuadre.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Generó (Metálico)</p>
                            <p className="text-lg font-semibold text-slate-900">{route.total_metalico.toFixed(2)} €</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-500">Ingresó (Banco)</p>
                            <p className="text-lg font-semibold text-slate-900">{route.total_ingreso.toFixed(2)} €</p>
                          </div>
                        </div>
                        
                        {route.descuadres_detectados && route.descuadres_detectados.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                              Descuadres detectados:
                            </p>
                            <div className="space-y-2">
                              {route.descuadres_detectados.map((d, i) => (
                                <div key={i} className={`flex items-center justify-between p-2 rounded ${d.diferencia > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500">{formatDate(d.date)}</span>
                                    <span className="text-slate-700 lowercase">{d.repartidor}</span>
                                  </div>
                                  <span className={`font-mono font-medium ${d.diferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {d.diferencia > 0 ? '+' : ''}{d.diferencia.toFixed(2)} €
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Route Dialog */}
      <Dialog open={isRouteDialogOpen} onOpenChange={setIsRouteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Ruta</DialogTitle>
            <DialogDescription>
              Agrega una nueva ruta de reparto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">Nombre de la Ruta *</Label>
              <Input
                id="routeName"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="Ej: 005, 103, 143..."
                data-testid="route-name-input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsRouteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddRoute}
              disabled={addingRoute}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="submit-route-btn"
            >
              {addingRoute && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Agregar Ruta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Liquidaciones;
