import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Search,
  FileUp,
  Download,
  FileText,
  Wrench,
  Banknote,
  Truck,
  History,
  Package,
  ShoppingCart,
  Scale,
  Users,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

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
  'Asistencias': 'bg-blue-500',
  'Liquidaciones': 'bg-emerald-500',
  'Flota': 'bg-indigo-500',
  'Historico de incidencias': 'bg-amber-500',
  'Repartos': 'bg-orange-500',
  'Compras': 'bg-purple-500',
  'Kilos/Litros': 'bg-cyan-500',
  'Contactos': 'bg-pink-500'
};

const Category = () => {
  const { categoryName } = useParams();
  const decodedCategory = decodeURIComponent(categoryName);
  const Icon = categoryIcons[decodedCategory] || Package;
  const bgColor = categoryColors[decodedCategory] || 'bg-slate-500';

  const [records, setRecords] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHub, setSelectedHub] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    hub_id: '',
    title: '',
    description: '',
    data: {}
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [decodedCategory]);

  const fetchData = async () => {
    try {
      const [recordsRes, hubsRes] = await Promise.all([
        axios.get(`${API_URL}/records`, { params: { category: decodedCategory } }),
        axios.get(`${API_URL}/hubs`)
      ]);
      setRecords(recordsRes.data);
      setHubs(hubsRes.data);
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
        hub_id: record.hub_id,
        title: record.title,
        description: record.description || '',
        data: record.data || {}
      });
    } else {
      setEditingRecord(null);
      setFormData({
        hub_id: hubs[0]?.id || '',
        title: '',
        description: '',
        data: {}
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({ hub_id: '', title: '', description: '', data: {} });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!formData.hub_id) {
      toast.error('Selecciona un hub');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRecord) {
        await axios.put(`${API_URL}/records/${editingRecord.id}`, {
          title: formData.title,
          description: formData.description,
          data: formData.data
        });
        toast.success('Registro actualizado');
      } else {
        await axios.post(`${API_URL}/records`, {
          hub_id: formData.hub_id,
          category: decodedCategory,
          title: formData.title,
          description: formData.description,
          data: formData.data
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
      await axios.delete(`${API_URL}/records/${recordId}`);
      toast.success('Registro eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleFileUpload = async (recordId, file) => {
    if (!file) return;

    setUploadingFile(recordId);
    const formDataFile = new FormData();
    formDataFile.append('file', file);

    try {
      await axios.post(`${API_URL}/records/${recordId}/upload`, formDataFile, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Archivo subido correctamente');
      fetchData();
    } catch (error) {
      toast.error('Error al subir archivo');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleDownload = (record) => {
    if (!record.file_data || !record.file_name) return;

    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${record.file_data}`;
    link.download = record.file_name;
    link.click();
  };

  const getHubName = (hubId) => {
    const hub = hubs.find(h => h.id === hubId);
    return hub?.name || 'Hub desconocido';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHub = selectedHub === 'all' || record.hub_id === selectedHub;
    return matchesSearch && matchesHub;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="category-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{decodedCategory}</h1>
            <p className="text-slate-500">{filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''}</p>
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

      {/* Filters */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar registros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="record-search-input"
              />
            </div>
            <Select value={selectedHub} onValueChange={setSelectedHub}>
              <SelectTrigger className="w-full sm:w-48" data-testid="hub-filter-select">
                <SelectValue placeholder="Filtrar por Hub" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Hubs</SelectItem>
                {hubs.map(hub => (
                  <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                {searchTerm || selectedHub !== 'all' 
                  ? 'No se encontraron registros' 
                  : 'No hay registros en esta categoría'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Título</TableHead>
                    <TableHead className="font-semibold">Hub</TableHead>
                    <TableHead className="font-semibold">Descripción</TableHead>
                    <TableHead className="font-semibold">Archivo</TableHead>
                    <TableHead className="font-semibold">Fecha</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="table-row-hover" data-testid={`record-row-${record.id}`}>
                      <TableCell className="font-medium">{record.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {getHubName(record.hub_id)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">
                        {record.description || '-'}
                      </TableCell>
                      <TableCell>
                        {record.file_name ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(record)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                            data-testid={`download-file-${record.id}`}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            {record.file_name.length > 15 
                              ? record.file_name.substring(0, 15) + '...' 
                              : record.file_name}
                          </Button>
                        ) : (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(record.id, e.target.files[0])}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 h-8"
                              disabled={uploadingFile === record.id}
                              asChild
                              data-testid={`upload-file-${record.id}`}
                            >
                              <span>
                                {uploadingFile === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <FileUp className="w-4 h-4 mr-1" />
                                    Subir
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        )}
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
                : `Crear un nuevo registro en ${decodedCategory}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingRecord && (
              <div className="space-y-2">
                <Label htmlFor="hub">Hub *</Label>
                <Select 
                  value={formData.hub_id} 
                  onValueChange={(value) => setFormData({ ...formData, hub_id: value })}
                >
                  <SelectTrigger data-testid="record-hub-select">
                    <SelectValue placeholder="Selecciona un hub" />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs.map(hub => (
                      <SelectItem key={hub.id} value={hub.id}>{hub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

export default Category;
