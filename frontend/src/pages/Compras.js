import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  ShoppingCart,
  Euro
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const Compras = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [formData, setFormData] = useState({
    item: '',
    specifications: '',
    supplier: '',
    price: '1',
    quantity: '1'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [hubId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hubRes, purchasesRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/purchases`)
      ]);
      setHub(hubRes.data);
      setPurchases(purchasesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (purchase = null) => {
    if (purchase) {
      setEditingPurchase(purchase);
      setFormData({
        item: purchase.item,
        specifications: purchase.specifications || '',
        supplier: purchase.supplier || '',
        price: purchase.price?.toString() || '1',
        quantity: purchase.quantity?.toString() || '1'
      });
    } else {
      setEditingPurchase(null);
      setFormData({
        item: '',
        specifications: '',
        supplier: '',
        price: '1',
        quantity: '1'
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPurchase(null);
    setFormData({
      item: '',
      specifications: '',
      supplier: '',
      price: '1',
      quantity: '1'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item.trim()) {
      toast.error('El nombre del producto es obligatorio');
      return;
    }

    setSubmitting(true);
    try {
      const price = parseFloat(formData.price) || 1;
      const quantity = parseInt(formData.quantity) || 1;
      
      const payload = {
        hub_id: hubId,
        item: formData.item,
        specifications: formData.specifications,
        supplier: formData.supplier,
        price: price,
        quantity: quantity,
        total: price * quantity
      };

      if (editingPurchase) {
        await axios.put(`${API_URL}/hubs/${hubId}/purchases/${editingPurchase.id}`, payload);
        toast.success('Compra actualizada');
      } else {
        await axios.post(`${API_URL}/hubs/${hubId}/purchases`, payload);
        toast.success('Compra agregada');
      }
      handleCloseDialog();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (purchaseId) => {
    if (!window.confirm('¿Eliminar este registro de compra?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/purchases/${purchaseId}`);
      toast.success('Compra eliminada');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const calculateTotal = () => {
    const price = parseFloat(formData.price) || 1;
    const quantity = parseInt(formData.quantity) || 1;
    return (price * quantity).toFixed(2);
  };

  const filteredPurchases = purchases.filter(p =>
    p.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.specifications?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grandTotal = filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="compras-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-purple-500 rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
            <p className="text-slate-500">{hub?.name}</p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenDialog()}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="add-purchase-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Compra
        </Button>
      </div>

      {/* Search and Total */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="border border-slate-200 flex-1">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por producto, proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="purchase-search-input"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-purple-200 bg-purple-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Euro className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-xs text-purple-600 font-medium">Total</p>
              <p className="text-xl font-bold text-purple-700">{grandTotal.toFixed(2)} €</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card className="border border-slate-200">
        <CardContent className="p-0">
          {filteredPurchases.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">
                {searchTerm ? 'No se encontraron compras' : 'No hay compras registradas'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Qué comprar</TableHead>
                    <TableHead className="font-semibold">Especificaciones</TableHead>
                    <TableHead className="font-semibold">Dónde comprar</TableHead>
                    <TableHead className="font-semibold text-right">Precio</TableHead>
                    <TableHead className="font-semibold text-center">Cantidad</TableHead>
                    <TableHead className="font-semibold text-right">Total</TableHead>
                    <TableHead className="font-semibold text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className="table-row-hover" data-testid={`purchase-row-${purchase.id}`}>
                      <TableCell className="font-medium text-slate-900">
                        {purchase.item}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {purchase.specifications || '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {purchase.supplier || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {purchase.price?.toFixed(2) || '1.00'} €
                      </TableCell>
                      <TableCell className="text-center">
                        {purchase.quantity || 1}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-purple-600">
                        {purchase.total?.toFixed(2) || '1.00'} €
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenDialog(purchase)}
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            data-testid={`edit-purchase-${purchase.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(purchase.id)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                            data-testid={`delete-purchase-${purchase.id}`}
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
              {editingPurchase ? 'Editar Compra' : 'Nueva Compra'}
            </DialogTitle>
            <DialogDescription>
              {editingPurchase 
                ? 'Modifica los datos de la compra' 
                : 'Registra un nuevo artículo para comprar'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item">Qué comprar *</Label>
              <Input
                id="item"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="Ej: cinta embalar"
                data-testid="purchase-item-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specifications">Especificaciones</Label>
              <Input
                id="specifications"
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                placeholder="Ej: 48mm x 66m"
                data-testid="purchase-specs-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Dónde comprar</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Ej: Amazon / proveedor"
                data-testid="purchase-supplier-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1.00"
                  data-testid="purchase-price-input"
                />
                <p className="text-xs text-slate-400">Vacío = 1</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="1"
                  data-testid="purchase-quantity-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="h-10 px-3 flex items-center bg-purple-50 border border-purple-200 rounded-md">
                  <span className="font-mono font-semibold text-purple-700">
                    {calculateTotal()} €
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="purchase-submit-btn"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingPurchase ? 'Guardar Cambios' : 'Agregar Compra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Compras;
