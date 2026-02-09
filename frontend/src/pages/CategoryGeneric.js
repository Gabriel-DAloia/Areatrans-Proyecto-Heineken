import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  ArrowLeft,
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Search,
  FileText,
  Banknote,
  Truck,
  History,
  Package,
  ShoppingCart,
  Scale,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const categoryConfig = {
  'liquidaciones': { name: 'Liquidaciones', icon: Banknote, color: 'bg-emerald-500' },
  'flota': { name: 'Flota', icon: Truck, color: 'bg-indigo-500' },
  'historico-incidencias': { name: 'Histórico de Incidencias', icon: History, color: 'bg-amber-500' },
  'repartos': { name: 'Repartos', icon: Package, color: 'bg-orange-500' },
  'compras': { name: 'Compras', icon: ShoppingCart, color: 'bg-purple-500' },
  'kilos-litros': { name: 'Kilos/Litros', icon: Scale, color: 'bg-cyan-500' },
  'contactos': { name: 'Contactos', icon: Users, color: 'bg-pink-500' }
};

const CategoryGeneric = () => {
  const { hubId, category } = useParams();
  const config = categoryConfig[category] || { name: category, icon: FileText, color: 'bg-slate-500' };
  const Icon = config.icon;

  const [hub, setHub] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [hubId, category]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hubRes, recordsRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/records`, { params: { category: config.name } })
      ]);
      setHub(hubRes.data);
      setRecords(recordsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        title: record.title,
        description: record.description || ''
      });
    } else {
      setEditingRecord(null);
      setFormData({ title: '', description: '' });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({ title: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRecord) {
        await axios.put(`${API_URL}/hubs/${hubId}/records/${editingRecord.id}`, formData);
        toast.success('Registro actualizado');
      } else {
        await axios.post(`${API_URL}/hubs/${hubId}/records`, {
          hub_id: hubId,
          category: config.name,
          ...formData
        });
        toast.success('Registro creado');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/records/${recordId}`);
      toast.success('Registro eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredRecords = records.filter(record =>
    record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="category-generic-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className={`w-11 h-11 ${config.color} rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
            <p className="text-slate-500">{hub?.name}</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="add-record-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Registro
        </Button>
      </div>

      {/* Search */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="border border-slate-200">
        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">
                {searchTerm ? 'No se encontraron registros' : 'No hay registros en esta categoría'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Título</TableHead>
                    <TableHead className="font-semibold">Descripción</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="table-row-hover" data-testid={`record-row-${record.id}`}>
                      <TableCell className="font-medium">{record.title}</TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">
                        {record.description || '-'}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDate(record.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDialog(record)}
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            data-testid={`edit-record-${record.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(record.id)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            data-testid={`delete-record-${record.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Editar Registro' : 'Nuevo Registro'}
            </DialogTitle>
            <DialogDescription>
              {editingRecord 
                ? 'Modifica los datos del registro' 
                : `Crear un nuevo registro en ${config.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título del registro"
                data-testid="record-title-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción detallada"
                rows={4}
                data-testid="record-description-input"
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
                data-testid="record-submit-btn"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingRecord ? 'Guardar Cambios' : 'Crear Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryGeneric;
