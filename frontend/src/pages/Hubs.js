import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Building2,
  Loader2,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Hubs = () => {
  const { user } = useAuth();
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHub, setEditingHub] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    try {
      const response = await axios.get(`${API_URL}/hubs`);
      setHubs(response.data);
    } catch (error) {
      console.error('Error fetching hubs:', error);
      toast.error('Error al cargar hubs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (hub = null) => {
    if (hub) {
      setEditingHub(hub);
      setFormData({
        name: hub.name,
        description: hub.description || '',
        location: hub.location || ''
      });
    } else {
      setEditingHub(null);
      setFormData({ name: '', description: '', location: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHub(null);
    setFormData({ name: '', description: '', location: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      if (editingHub) {
        await axios.put(`${API_URL}/hubs/${editingHub.id}`, formData);
        toast.success('Hub actualizado correctamente');
      } else {
        await axios.post(`${API_URL}/hubs`, formData);
        toast.success('Hub creado correctamente');
      }
      handleCloseDialog();
      fetchHubs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar hub');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (hubId) => {
    if (!window.confirm('¿Estás seguro de eliminar este hub? También se eliminarán todos sus registros.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/hubs/${hubId}`);
      toast.success('Hub eliminado correctamente');
      fetchHubs();
    } catch (error) {
      toast.error('Error al eliminar hub');
    }
  };

  const filteredHubs = hubs.filter(hub =>
    hub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hub.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="hubs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hubs</h1>
          <p className="text-slate-500 mt-1">Gestiona los centros de distribución</p>
        </div>
        {user?.is_admin && (
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="add-hub-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Hub
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="hub-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hubs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHubs.map((hub, index) => (
          <Card 
            key={hub.id}
            className="border border-slate-200 hover:border-blue-400 transition-all card-hover group"
            style={{ animationDelay: `${index * 0.05}s` }}
            data-testid={`hub-card-${hub.id}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                {user?.is_admin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(hub)}
                      className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                      data-testid={`edit-hub-${hub.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(hub.id)}
                      className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                      data-testid={`delete-hub-${hub.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-1">{hub.name}</h3>
              {hub.location && (
                <div className="flex items-center gap-1 text-sm text-slate-500 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{hub.location}</span>
                </div>
              )}
              {hub.description && (
                <p className="text-sm text-slate-600 line-clamp-2">{hub.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredHubs.length === 0 && (
        <Card className="border border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">
              {searchTerm ? 'No se encontraron hubs' : 'No hay hubs registrados'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingHub ? 'Editar Hub' : 'Nuevo Hub'}
            </DialogTitle>
            <DialogDescription>
              {editingHub ? 'Modifica los datos del hub' : 'Completa los datos para crear un nuevo hub'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre del hub"
                data-testid="hub-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ciudad o dirección"
                data-testid="hub-location-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del hub"
                rows={3}
                data-testid="hub-description-input"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="hub-submit-btn"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingHub ? 'Guardar Cambios' : 'Crear Hub'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Hubs;
