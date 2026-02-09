import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  Users,
  Phone,
  User
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Contactos = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [hubId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hubRes, contactsRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/contacts`)
      ]);
      setHub(hubRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        position: contact.position || '',
        phone: contact.phone || ''
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: '',
        position: '',
        phone: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    setFormData({
      name: '',
      position: '',
      phone: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        hub_id: hubId,
        name: formData.name,
        position: formData.position,
        phone: formData.phone
      };

      if (editingContact) {
        await axios.put(`${API_URL}/hubs/${hubId}/contacts/${editingContact.id}`, payload);
        toast.success('Contacto actualizado');
      } else {
        await axios.post(`${API_URL}/hubs/${hubId}/contacts`, payload);
        toast.success('Contacto agregado');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (contactId, contactName) => {
    if (!window.confirm(`¿Eliminar el contacto ${contactName}?`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/contacts/${contactId}`);
      toast.success('Contacto eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="contactos-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-pink-500 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
            <p className="text-slate-500">{hub?.name}</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-pink-600 hover:bg-pink-700"
          data-testid="add-contact-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Contacto
        </Button>
      </div>

      {/* Search */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, cargo o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="contact-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      {filteredContacts.length === 0 ? (
        <Card className="border border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">
              {searchTerm ? 'No se encontraron contactos' : 'No hay contactos registrados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <Card 
              key={contact.id} 
              className="border border-slate-200 hover:border-pink-300 transition-colors"
              data-testid={`contact-card-${contact.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                      {contact.position && (
                        <p className="text-sm text-slate-500">{contact.position}</p>
                      )}
                      {contact.phone && (
                        <a 
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 mt-2"
                        >
                          <Phone className="w-4 h-4" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(contact)}
                      className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      data-testid={`edit-contact-${contact.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(contact.id, contact.name)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      data-testid={`delete-contact-${contact.id}`}
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}
            </DialogTitle>
            <DialogDescription>
              {editingContact 
                ? 'Modifica los datos del contacto' 
                : 'Agrega un nuevo contacto al directorio'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Juan Pérez"
                data-testid="contact-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Ej: Coordinador"
                data-testid="contact-position-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ej: +34 600 123 456"
                data-testid="contact-phone-input"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-pink-600 hover:bg-pink-700"
                data-testid="contact-submit-btn"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingContact ? 'Guardar Cambios' : 'Agregar Contacto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contactos;
