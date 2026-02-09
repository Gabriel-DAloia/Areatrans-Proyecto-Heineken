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
  Scale,
  ChevronLeft,
  ChevronRight,
  Save,
  User,
  MapPin,
  Droplets,
  Package,
  Users,
  RefreshCw,
  FileSpreadsheet
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

const formatDateShort = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const KilosLitros = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Date selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [daysInMonth, setDaysInMonth] = useState(31);
  
  // New entry form
  const [newEntry, setNewEntry] = useState({
    route_id: '',
    repartidor: '',
    clientes: '',
    kilos: '',
    litros: '',
    bultos: ''
  });
  const [addingEntry, setAddingEntry] = useState(false);
  
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
      
      // Set default route if available
      if (routesRes.data.length > 0 && !newEntry.route_id) {
        setNewEntry(prev => ({ ...prev, route_id: routesRes.data[0].id }));
      }
      
      // Fetch entries and summary
      await Promise.all([
        fetchEntries(),
        fetchSummary()
      ]);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [hubId, selectedYear, selectedMonth]);

  const fetchEntries = async () => {
    try {
      const response = await axios.get(`${API_URL}/hubs/${hubId}/kilos-litros`, {
        params: { year: selectedYear, month: selectedMonth }
      });
      setEntries(response.data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}/hubs/${hubId}/kilos-litros/summary`, {
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
    if (routes.length > 0 && !newEntry.route_id) {
      setNewEntry(prev => ({ ...prev, route_id: routes[0].id }));
    }
  }, [routes]);

  const handleAddEntry = async () => {
    if (!newEntry.route_id || !newEntry.repartidor.trim()) {
      toast.error('La ruta y el nombre son obligatorios');
      return;
    }
    
    setAddingEntry(true);
    try {
      const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      
      await axios.post(`${API_URL}/hubs/${hubId}/kilos-litros`, {
        hub_id: hubId,
        route_id: newEntry.route_id,
        date: date,
        repartidor: newEntry.repartidor.toLowerCase(),
        clientes: parseInt(newEntry.clientes) || 0,
        kilos: parseFloat(newEntry.kilos) || 0,
        litros: parseFloat(newEntry.litros) || 0,
        bultos: parseInt(newEntry.bultos) || 0
      });
      
      toast.success('Registro agregado');
      setNewEntry(prev => ({
        ...prev,
        repartidor: '',
        clientes: '',
        kilos: '',
        litros: '',
        bultos: ''
      }));
      
      await Promise.all([fetchEntries(), fetchSummary()]);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar registro');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    
    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/kilos-litros/${entryId}`);
      toast.success('Registro eliminado');
      await Promise.all([fetchEntries(), fetchSummary()]);
    } catch (error) {
      toast.error('Error al eliminar registro');
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
  };

  const getRouteName = (routeId) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : '-';
  };

  // Get entries for selected day
  const dayEntries = entries.filter(e => {
    const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return e.date === date;
  });

  // Export to CSV
  const exportToCSV = () => {
    if (entries.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    
    const headers = ['Fecha', 'Ruta', 'Repartidor', 'Clientes', 'Kilos', 'Litros', 'Bultos'];
    const rows = entries.map(e => [
      formatDateShort(e.date),
      getRouteName(e.route_id),
      e.repartidor,
      e.clientes,
      e.kilos,
      e.litros,
      e.bultos
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kilos_litros_${hub?.name}_${MONTHS[selectedMonth - 1]}_${selectedYear}.csv`;
    link.click();
    
    toast.success('CSV exportado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="kilos-litros-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kilos / Litros</h1>
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
            onClick={() => Promise.all([fetchEntries(), fetchSummary()])}
            variant="outline"
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refrescar
          </Button>
          
          <Button 
            onClick={exportToCSV}
            variant="outline"
            data-testid="export-csv-btn"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500 uppercase font-medium">Clientes</p>
            <p className="text-2xl font-bold text-slate-900">{summary?.totals?.clientes || 0}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Scale className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-xs text-slate-500 uppercase font-medium">Kilos</p>
            <p className="text-2xl font-bold text-slate-900">{(summary?.totals?.kilos || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Droplets className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-xs text-slate-500 uppercase font-medium">Litros</p>
            <p className="text-2xl font-bold text-slate-900">{(summary?.totals?.litros || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xs text-slate-500 uppercase font-medium">Bultos</p>
            <p className="text-2xl font-bold text-slate-900">{summary?.totals?.bultos || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="entry" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="entry" className="data-[state=active]:bg-white">
            Registro Diario
          </TabsTrigger>
          <TabsTrigger value="repartidores" className="data-[state=active]:bg-white">
            Por Repartidor
          </TabsTrigger>
          <TabsTrigger value="rutas" className="data-[state=active]:bg-white">
            Por Ruta
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white">
            Historial del Mes
          </TabsTrigger>
        </TabsList>

        {/* Daily Entry Tab */}
        <TabsContent value="entry" className="space-y-4">
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
              {/* Add Entry Form */}
              <Card className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Agregar Registro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 items-end">
                    {/* Day Selection */}
                    <div className="space-y-1">
                      <Label className="text-xs">Día</Label>
                      <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                        <SelectTrigger className="h-9" data-testid="day-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                            <SelectItem key={day} value={String(day)}>
                              {String(day).padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Route Selection */}
                    <div className="space-y-1">
                      <Label className="text-xs">Ruta *</Label>
                      <Select value={newEntry.route_id} onValueChange={(v) => setNewEntry(prev => ({ ...prev, route_id: v }))}>
                        <SelectTrigger className="h-9" data-testid="route-select">
                          <SelectValue placeholder="Ruta" />
                        </SelectTrigger>
                        <SelectContent>
                          {routes.map(route => (
                            <SelectItem key={route.id} value={route.id}>
                              {route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Repartidor */}
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre *</Label>
                      <Input
                        value={newEntry.repartidor}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, repartidor: e.target.value }))}
                        className="h-9 text-sm lowercase"
                        placeholder="ej: gabriel"
                        style={{ textTransform: 'lowercase' }}
                        data-testid="repartidor-input"
                      />
                    </div>
                    
                    {/* Clientes */}
                    <div className="space-y-1">
                      <Label className="text-xs">Clientes</Label>
                      <Input
                        type="number"
                        value={newEntry.clientes}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, clientes: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="0"
                        data-testid="clientes-input"
                      />
                    </div>
                    
                    {/* Kilos */}
                    <div className="space-y-1">
                      <Label className="text-xs">Kilos</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newEntry.kilos}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, kilos: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="0.00"
                        data-testid="kilos-input"
                      />
                    </div>
                    
                    {/* Litros */}
                    <div className="space-y-1">
                      <Label className="text-xs">Litros</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newEntry.litros}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, litros: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="0.00"
                        data-testid="litros-input"
                      />
                    </div>
                    
                    {/* Bultos */}
                    <div className="space-y-1">
                      <Label className="text-xs">Bultos</Label>
                      <Input
                        type="number"
                        value={newEntry.bultos}
                        onChange={(e) => setNewEntry(prev => ({ ...prev, bultos: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="0"
                        data-testid="bultos-input"
                      />
                    </div>
                    
                    {/* Add Button */}
                    <Button 
                      onClick={handleAddEntry}
                      disabled={addingEntry}
                      className="h-9 bg-orange-600 hover:bg-orange-700"
                      data-testid="add-entry-btn"
                    >
                      {addingEntry ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Day's Entries */}
              <Card className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Registros del día {String(selectedDay).padStart(2, '0')}/{String(selectedMonth).padStart(2, '0')}/{selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dayEntries.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">No hay registros para este día</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Ruta</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-700">Repartidor</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Clientes</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Kilos</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Litros</th>
                            <th className="px-3 py-2 text-right font-semibold text-slate-700">Bultos</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dayEntries.map(entry => (
                            <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <Badge variant="outline">{getRouteName(entry.route_id)}</Badge>
                              </td>
                              <td className="px-3 py-2 lowercase">{entry.repartidor}</td>
                              <td className="px-3 py-2 text-right font-mono">{entry.clientes}</td>
                              <td className="px-3 py-2 text-right font-mono">{entry.kilos.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-mono">{entry.litros.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-mono">{entry.bultos}</td>
                              <td className="px-3 py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  data-testid={`delete-entry-${entry.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setIsRouteDialogOpen(true)}
                  variant="outline"
                  data-testid="new-route-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Ruta
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Repartidores Tab */}
        <TabsContent value="repartidores" className="space-y-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-orange-600" />
                Resumen por Empleado - {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.by_repartidor || summary.by_repartidor.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay datos de repartidores</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Repartidor</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Clientes</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Kilos</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Litros</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Bultos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_repartidor.map((rep, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-orange-600" />
                              </div>
                              <span className="font-medium lowercase">{rep.repartidor}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{rep.clientes}</td>
                          <td className="px-4 py-3 text-right font-mono">{rep.kilos.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{rep.litros.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{rep.bultos}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-orange-50 font-semibold">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right font-mono">{summary.totals?.clientes || 0}</td>
                        <td className="px-4 py-3 text-right font-mono">{(summary.totals?.kilos || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{(summary.totals?.litros || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{summary.totals?.bultos || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
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
                <MapPin className="w-5 h-5 text-orange-600" />
                Resumen por Ruta - {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.by_route || summary.by_route.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay datos de rutas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Ruta</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Clientes</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Kilos</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Litros</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">Bultos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_route.map((route, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <Badge className="bg-orange-100 text-orange-700">Ruta {route.route_name}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{route.clientes}</td>
                          <td className="px-4 py-3 text-right font-mono">{route.kilos.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{route.litros.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono">{route.bultos}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-orange-50 font-semibold">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right font-mono">{summary.totals?.clientes || 0}</td>
                        <td className="px-4 py-3 text-right font-mono">{(summary.totals?.kilos || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{(summary.totals?.litros || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono">{summary.totals?.bultos || 0}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg">
                Historial - {MONTHS[selectedMonth - 1]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {entries.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay registros para este mes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Fecha</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Ruta</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Repartidor</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700">Clientes</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700">Kilos</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700">Litros</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700">Bultos</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(entry => {
                        const dayName = getDayName(entry.date);
                        const isWeekend = dayName === 'Sáb' || dayName === 'Dom';
                        
                        return (
                          <tr key={entry.id} className={`border-b border-slate-100 ${isWeekend ? 'bg-slate-50' : ''}`}>
                            <td className="px-3 py-2">
                              <span className="font-medium">{formatDateShort(entry.date)}</span>
                              <span className={`ml-2 text-xs ${isWeekend ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                                {dayName}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">{getRouteName(entry.route_id)}</Badge>
                            </td>
                            <td className="px-3 py-2 lowercase">{entry.repartidor}</td>
                            <td className="px-3 py-2 text-right font-mono">{entry.clientes}</td>
                            <td className="px-3 py-2 text-right font-mono">{entry.kilos.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono">{entry.litros.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono">{entry.bultos}</td>
                            <td className="px-3 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
              className="bg-orange-600 hover:bg-orange-700"
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

export default KilosLitros;
