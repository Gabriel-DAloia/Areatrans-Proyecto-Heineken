import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Search,
  Truck,
  Car
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const VEHICLE_TYPES = ["Moto", "Furgoneta", "Carrozado", "Trailer", "Camión", "MUS"];

const vehicleTypeColors = {
  'Moto': 'bg-blue-100 text-blue-700',
  'Furgoneta': 'bg-emerald-100 text-emerald-700',
  'Carrozado': 'bg-purple-100 text-purple-700',
  'Trailer': 'bg-orange-100 text-orange-700',
  'Camión': 'bg-red-100 text-red-700',
  'MUS': 'bg-amber-100 text-amber-700'
};

const Flota = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate: '',
    vehicle_type: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [hubId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hubRes, vehiclesRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/vehicles`)
      ]);
      setHub(hubRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plate: vehicle.plate,
        vehicle_type: vehicle.vehicle_type
      });
    } else {
      setEditingVehicle(null);
      setFormData({ plate: '', vehicle_type: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingVehicle(null);
    setFormData({ plate: '', vehicle_type: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.plate.trim()) {
      toast.error('La matrícula es obligatoria');
      return;
    }
    if (!formData.vehicle_type) {
      toast.error('Selecciona un tipo de vehículo');
      return;
    }

    setSubmitting(true);
    try {
      if (editingVehicle) {
        await axios.put(`${API_URL}/hubs/${hubId}/vehicles/${editingVehicle.id}`, formData);
        toast.success('Vehículo actualizado');
      } else {
        await axios.post(`${API_URL}/hubs/${hubId}/vehicles`, {
          hub_id: hubId,
          ...formData
        });
        toast.success('Vehículo agregado');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vehicleId, plate) => {
    if (!window.confirm(`¿Eliminar el vehículo ${plate}? También se eliminarán sus incidencias.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/vehicles/${vehicleId}`);
      toast.success('Vehículo eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || vehicle.vehicle_type === filterType;
    return matchesSearch && matchesType;
  });

  // Count by type
  const countByType = VEHICLE_TYPES.reduce((acc, type) => {
    acc[type] = vehicles.filter(v => v.vehicle_type === type).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="flota-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Flota</h1>
            <p className="text-slate-500">{hub?.name}</p>
          </div>
        </div>
        {user?.is_admin && (
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="add-vehicle-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Vehículo
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {VEHICLE_TYPES.map(type => (
          <Card key={type} className="border border-slate-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{countByType[type]}</p>
              <p className="text-xs text-slate-500">{type}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="vehicle-search-input"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48" data-testid="vehicle-type-filter">
                <SelectValue placeholder="Tipo de vehículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {VEHICLE_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="border border-slate-200">
        <CardContent className="p-0">
          {filteredVehicles.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">
                {searchTerm || filterType !== 'all' 
                  ? 'No se encontraron vehículos' 
                  : 'No hay vehículos registrados'}
              </p>
              {user?.is_admin && !searchTerm && filterType === 'all' && (
                <Button onClick={() => handleOpenDialog()} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Vehículo
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Matrícula</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Fecha Registro</TableHead>
                    {user?.is_admin && (
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} className="table-row-hover" data-testid={`vehicle-row-${vehicle.id}`}>
                      <TableCell className="font-mono font-semibold text-slate-900">
                        {vehicle.plate}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${vehicleTypeColors[vehicle.vehicle_type] || 'bg-slate-100 text-slate-700'}`}>
                          {vehicle.vehicle_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(vehicle.created_at).toLocaleDateString('es-ES')}
                      </TableCell>
                      {user?.is_admin && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenDialog(vehicle)}
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              data-testid={`edit-vehicle-${vehicle.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(vehicle.id, vehicle.plate)}
                              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                              data-testid={`delete-vehicle-${vehicle.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle 
                ? 'Modifica los datos del vehículo' 
                : 'Agrega un nuevo vehículo a la flota'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plate">Matrícula *</Label>
              <Input
                id="plate"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                placeholder="Ej: 1234 KXX"
                className="font-mono"
                data-testid="vehicle-plate-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Tipo de Vehículo *</Label>
              <Select 
                value={formData.vehicle_type} 
                onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
              >
                <SelectTrigger data-testid="vehicle-type-select">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="vehicle-submit-btn"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingVehicle ? 'Guardar Cambios' : 'Agregar Vehículo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Flota;
