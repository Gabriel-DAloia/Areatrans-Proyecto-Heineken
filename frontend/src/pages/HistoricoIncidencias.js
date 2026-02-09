import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { 
  ArrowLeft,
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  History,
  Car,
  Euro,
  Calendar,
  Gauge,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const vehicleTypeColors = {
  'Moto': 'bg-blue-100 text-blue-700 border-blue-200',
  'Furgoneta': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Carrozado': 'bg-purple-100 text-purple-700 border-purple-200',
  'Trailer': 'bg-orange-100 text-orange-700 border-orange-200',
  'Camión': 'bg-red-100 text-red-700 border-red-200',
  'MUS': 'bg-amber-100 text-amber-700 border-amber-200'
};

const HistoricoIncidencias = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    title: '',
    description: '',
    date: '',
    cost: '',
    km: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [hubId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hubRes, vehiclesRes, incidentsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/vehicles`),
        axios.get(`${API_URL}/hubs/${hubId}/incidents`),
        axios.get(`${API_URL}/hubs/${hubId}/incidents/summary`)
      ]);
      setHub(hubRes.data);
      setVehicles(vehiclesRes.data);
      setIncidents(incidentsRes.data);
      setSummary(summaryRes.data.summaries || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (vehicleId, incident = null) => {
    if (incident) {
      setEditingIncident(incident);
      setFormData({
        vehicle_id: incident.vehicle_id,
        title: incident.title,
        description: incident.description || '',
        date: incident.date,
        cost: incident.cost?.toString() || '',
        km: incident.km?.toString() || ''
      });
    } else {
      setEditingIncident(null);
      const today = new Date();
      const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
      setFormData({
        vehicle_id: vehicleId,
        title: '',
        description: '',
        date: dateStr,
        cost: '',
        km: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIncident(null);
    setFormData({
      vehicle_id: '',
      title: '',
      description: '',
      date: '',
      cost: '',
      km: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!formData.date.trim()) {
      toast.error('La fecha es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicle_id: formData.vehicle_id,
        hub_id: hubId,
        title: formData.title,
        description: formData.description,
        date: formData.date,
        cost: parseFloat(formData.cost) || 0,
        km: parseInt(formData.km) || 0
      };

      if (editingIncident) {
        await axios.put(`${API_URL}/hubs/${hubId}/incidents/${editingIncident.id}`, payload);
        toast.success('Incidencia actualizada');
      } else {
        await axios.post(`${API_URL}/hubs/${hubId}/incidents`, payload);
        toast.success('Incidencia agregada');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (incidentId) => {
    if (!window.confirm('¿Eliminar esta incidencia?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/incidents/${incidentId}`);
      toast.success('Incidencia eliminada');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getVehicleIncidents = (vehicleId) => {
    return incidents.filter(i => i.vehicle_id === vehicleId);
  };

  const getVehicleSummary = (vehicleId) => {
    return summary.find(s => s.vehicle_id === vehicleId) || {
      total_cost_month: 0,
      total_cost_year: 0,
      incidents_count: 0
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="historico-incidencias-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/hub/${hubId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center">
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Histórico de Incidencias</h1>
          <p className="text-slate-500">{hub?.name}</p>
        </div>
      </div>

      {/* Vehicles with incidents */}
      {vehicles.length === 0 ? (
        <Card className="border border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-2">No hay vehículos registrados</p>
            <p className="text-sm text-slate-400">Primero agrega vehículos en la sección de Flota</p>
            <Link to={`/hub/${hubId}/flota`}>
              <Button className="mt-4">
                Ir a Flota
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4" defaultValue={vehicles[0]?.id}>
          {vehicles.map((vehicle) => {
            const vehicleIncidents = getVehicleIncidents(vehicle.id);
            const vehicleSummary = getVehicleSummary(vehicle.id);
            const colorClass = vehicleTypeColors[vehicle.vehicle_type] || 'bg-slate-100 text-slate-700 border-slate-200';
            
            return (
              <AccordionItem 
                key={vehicle.id} 
                value={vehicle.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                  <div className="flex items-center gap-4 w-full">
                    <div className={`px-3 py-1.5 rounded-lg border ${colorClass} font-mono font-semibold text-sm`}>
                      {vehicle.plate}
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {vehicle.vehicle_type}
                    </Badge>
                    <div className="flex-1" />
                    <div className="flex items-center gap-6 text-sm mr-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Este mes</p>
                        <p className="font-semibold text-slate-900">
                          {vehicleSummary.total_cost_month.toFixed(2)} €
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Este año</p>
                        <p className="font-semibold text-slate-900">
                          {vehicleSummary.total_cost_year.toFixed(2)} €
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Incidencias</p>
                        <p className="font-semibold text-slate-900">
                          {vehicleIncidents.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="border-t border-slate-100 pt-4">
                    {/* Add incident button */}
                    <div className="flex justify-end mb-4">
                      <Button 
                        onClick={() => handleOpenDialog(vehicle.id)}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700"
                        data-testid={`add-incident-${vehicle.id}`}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Incidencia
                      </Button>
                    </div>

                    {/* Incidents list */}
                    {vehicleIncidents.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg">
                        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">Sin incidencias todavía.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {vehicleIncidents.map((incident) => (
                          <Card 
                            key={incident.id} 
                            className="border border-slate-200 hover:border-slate-300 transition-colors"
                            data-testid={`incident-card-${incident.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900 mb-1">
                                    {incident.title}
                                  </h4>
                                  {incident.description && (
                                    <p className="text-sm text-slate-600 mb-3">
                                      {incident.description}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <Calendar className="w-4 h-4" />
                                      <span>{incident.date}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <Euro className="w-4 h-4" />
                                      <span className="font-medium text-slate-900">
                                        {incident.cost?.toFixed(2) || '0.00'} €
                                      </span>
                                    </div>
                                    {incident.km > 0 && (
                                      <div className="flex items-center gap-1.5 text-slate-500">
                                        <Gauge className="w-4 h-4" />
                                        <span>{incident.km.toLocaleString()} km</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleOpenDialog(vehicle.id, incident)}
                                    className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    data-testid={`edit-incident-${incident.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDelete(incident.id)}
                                    className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                    data-testid={`delete-incident-${incident.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIncident ? 'Editar Incidencia' : 'Nueva Incidencia'}
            </DialogTitle>
            <DialogDescription>
              {editingIncident 
                ? 'Modifica los datos de la incidencia' 
                : 'Registra una nueva incidencia para el vehículo'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Cambio de aceite, Reparación frenos..."
                data-testid="incident-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción detallada de la incidencia"
                rows={3}
                data-testid="incident-description-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="dd/mm/aaaa"
                  data-testid="incident-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Coste (€)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                  data-testid="incident-cost-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="km">KM</Label>
                <Input
                  id="km"
                  type="number"
                  min="0"
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                  placeholder="0"
                  data-testid="incident-km-input"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="incident-submit-btn"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingIncident ? 'Guardar Cambios' : 'Agregar Incidencia'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoricoIncidencias;
