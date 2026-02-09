import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  Loader2,
  Clock,
  MapPin,
  Car,
  Leaf,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const APPLIES_TO_OPTIONS = [
  { value: 'vehiculos_0', label: 'Vehículos 0 emisiones', icon: Leaf, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'vehiculos_combustible', label: 'Vehículos de combustible', icon: Car, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'todos', label: 'Todos los vehículos', icon: AlertCircle, color: 'bg-red-100 text-red-700 border-red-200' }
];

const DAYS_OPTIONS = [
  { value: 'L-V', label: 'Lunes a Viernes' },
  { value: 'L-S', label: 'Lunes a Sábado' },
  { value: 'L-D', label: 'Todos los días' },
  { value: 'S-D', label: 'Fines de semana' }
];

const getAppliesToConfig = (value) => {
  return APPLIES_TO_OPTIONS.find(o => o.value === value) || APPLIES_TO_OPTIONS[2];
};

const RestriccionesHorarias = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [restrictions, setRestrictions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    zona: '',
    horario: '',
    dias: 'L-V',
    aplica_a: 'todos',
    notas: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hubRes, restrictionsRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/time-restrictions`)
      ]);
      
      setHub(hubRes.data);
      setRestrictions(restrictionsRes.data);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      zona: '',
      horario: '',
      dias: 'L-V',
      aplica_a: 'todos',
      notas: ''
    });
    setEditingId(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (restriction) => {
    setFormData({
      zona: restriction.zona,
      horario: restriction.horario,
      dias: restriction.dias,
      aplica_a: restriction.aplica_a,
      notas: restriction.notas || ''
    });
    setEditingId(restriction.id);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.zona.trim() || !formData.horario.trim()) {
      toast.error('La zona y el horario son obligatorios');
      return;
    }
    
    setSaving(true);
    try {
      if (editingId) {
        // Update
        await axios.put(`${API_URL}/hubs/${hubId}/time-restrictions/${editingId}`, formData);
        toast.success('Restricción actualizada');
      } else {
        // Create
        await axios.post(`${API_URL}/hubs/${hubId}/time-restrictions`, {
          hub_id: hubId,
          ...formData
        });
        toast.success('Restricción agregada');
      }
      
      setIsDialogOpen(false);
      resetForm();
      await fetchData();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (restrictionId) => {
    if (!window.confirm('¿Eliminar esta restricción?')) return;
    
    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/time-restrictions/${restrictionId}`);
      toast.success('Restricción eliminada');
      await fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Group restrictions by aplica_a
  const groupedRestrictions = {
    vehiculos_0: restrictions.filter(r => r.aplica_a === 'vehiculos_0'),
    vehiculos_combustible: restrictions.filter(r => r.aplica_a === 'vehiculos_combustible'),
    todos: restrictions.filter(r => r.aplica_a === 'todos')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="restricciones-horarias-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-purple-500 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Restricciones Horarias</h1>
            <p className="text-slate-500">{hub?.name}</p>
          </div>
        </div>
        
        <Button 
          onClick={openAddDialog}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="add-restriction-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Restricción
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {APPLIES_TO_OPTIONS.map(option => {
          const count = groupedRestrictions[option.value]?.length || 0;
          const Icon = option.icon;
          return (
            <Card key={option.value} className={`border ${option.color}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${option.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs opacity-75 uppercase">{option.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Restrictions Table */}
      <Card className="border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            Listado de Restricciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {restrictions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 mb-4">No hay restricciones horarias registradas</p>
              <Button onClick={openAddDialog} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Restricción
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Zona</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Horario</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Días</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Aplica a</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Notas</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {restrictions.map(restriction => {
                    const appliesToConfig = getAppliesToConfig(restriction.aplica_a);
                    const Icon = appliesToConfig.icon;
                    const daysOption = DAYS_OPTIONS.find(d => d.value === restriction.dias);
                    
                    return (
                      <tr key={restriction.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="font-medium">{restriction.zona}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-purple-700">{restriction.horario}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {daysOption?.label || restriction.dias}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${appliesToConfig.color} border`}>
                            <Icon className="w-3 h-3 mr-1" />
                            {appliesToConfig.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={restriction.notas}>
                          {restriction.notas || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(restriction)}
                              className="h-8 w-8 text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                              data-testid={`edit-restriction-${restriction.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(restriction.id)}
                              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              data-testid={`delete-restriction-${restriction.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Grouped View */}
      {restrictions.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {APPLIES_TO_OPTIONS.map(option => {
            const Icon = option.icon;
            const items = groupedRestrictions[option.value] || [];
            
            return (
              <Card key={option.value} className="border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">Sin restricciones</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map(r => (
                        <div key={r.id} className={`p-2 rounded-lg border ${option.color}`}>
                          <p className="font-medium text-sm">{r.zona}</p>
                          <p className="text-xs font-mono">{r.horario}</p>
                          <p className="text-xs opacity-75">{DAYS_OPTIONS.find(d => d.value === r.dias)?.label || r.dias}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Restricción' : 'Agregar Restricción'}</DialogTitle>
            <DialogDescription>
              Define las restricciones horarias para esta zona
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zona">Zona *</Label>
              <Input
                id="zona"
                value={formData.zona}
                onChange={(e) => setFormData(prev => ({ ...prev, zona: e.target.value }))}
                placeholder="Ej: Centro Histórico, ZBE Madrid Central"
                data-testid="zona-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="horario">Restricción Horaria *</Label>
              <Input
                id="horario"
                value={formData.horario}
                onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                placeholder="Ej: 7:00 - 10:00 y 18:00 - 21:00"
                data-testid="horario-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Días</Label>
                <Select 
                  value={formData.dias} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, dias: v }))}
                >
                  <SelectTrigger data-testid="dias-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Aplica a *</Label>
                <Select 
                  value={formData.aplica_a} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, aplica_a: v }))}
                >
                  <SelectTrigger data-testid="aplica-a-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLIES_TO_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Información adicional sobre la restricción..."
                rows={2}
                data-testid="notas-input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="submit-restriction-btn"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestriccionesHorarias;
