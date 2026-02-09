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
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const HOLIDAY_TYPES = [
  { value: 'nacional', label: 'Nacional', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'autonomico', label: 'Autonómico', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'local', label: 'Local', color: 'bg-blue-100 text-blue-700 border-blue-200' }
];

const getTypeConfig = (type) => {
  return HOLIDAY_TYPES.find(t => t.value === type) || HOLIDAY_TYPES[2];
};

const DiasFestivos = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Year selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // Add holiday dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    name: '',
    type: 'local'
  });
  const [addingHoliday, setAddingHoliday] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hubRes, holidaysRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/holidays`, { params: { year: selectedYear } })
      ]);
      
      setHub(hubRes.data);
      setHolidays(holidaysRes.data.holidays || []);
      setLocation(holidaysRes.data.location || '');
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [hubId, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name.trim()) {
      toast.error('La fecha y el nombre son obligatorios');
      return;
    }
    
    setAddingHoliday(true);
    try {
      await axios.post(`${API_URL}/hubs/${hubId}/holidays`, {
        hub_id: hubId,
        date: newHoliday.date,
        name: newHoliday.name.trim(),
        type: newHoliday.type
      });
      
      toast.success('Festivo agregado');
      setNewHoliday({ date: '', name: '', type: 'local' });
      setIsAddDialogOpen(false);
      await fetchData();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar festivo');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (holidayId, isPreset) => {
    if (isPreset) {
      toast.error('No se pueden eliminar los festivos predefinidos');
      return;
    }
    
    if (!window.confirm('¿Eliminar este festivo?')) return;
    
    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/holidays/${holidayId}`);
      toast.success('Festivo eliminado');
      await fetchData();
    } catch (error) {
      toast.error('Error al eliminar festivo');
    }
  };

  const navigateYear = (direction) => {
    setSelectedYear(prev => prev + direction);
  };

  // Generate calendar data for current month
  const generateCalendarDays = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const holiday = holidays.find(h => h.date === date);
      days.push({ day, date, holiday });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get holidays for current month (for list view)
  const monthHolidays = holidays.filter(h => {
    const [year, month] = h.date.split('-');
    return parseInt(month) === selectedMonth + 1;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Get all holidays for the year (for annual list)
  const yearHolidays = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return `${day}/${month} - ${DAYS_SHORT[date.getDay()]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dias-festivos-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-11 h-11 bg-red-500 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Días Festivos</h1>
            <p className="text-slate-500">{hub?.name} • {location && <span className="capitalize">{location}</span>}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Navigation */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={() => navigateYear(-1)} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 font-medium text-sm min-w-[80px] text-center">
              {selectedYear}
            </span>
            <Button variant="ghost" size="icon" onClick={() => navigateYear(1)} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-red-600 hover:bg-red-700"
            data-testid="add-holiday-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Festivo
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {HOLIDAY_TYPES.map(type => (
          <Badge key={type.value} className={`${type.color} border`}>
            {type.label}
          </Badge>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-red-600" />
                  Calendario
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedMonth(prev => prev === 0 ? 11 : prev - 1)}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-medium text-sm min-w-[120px] text-center">
                    {MONTHS[selectedMonth]} {selectedYear}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedMonth(prev => prev === 11 ? 0 : prev + 1)}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {DAYS_SHORT.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {calendarDays.map((item, index) => {
                  if (!item.day) {
                    return <div key={`empty-${index}`} className="h-20" />;
                  }
                  
                  const isWeekend = (index % 7 === 0) || (index % 7 === 6);
                  const typeConfig = item.holiday ? getTypeConfig(item.holiday.type) : null;
                  
                  return (
                    <div 
                      key={item.date}
                      className={`h-20 p-1 border rounded-lg ${
                        item.holiday 
                          ? typeConfig.color 
                          : isWeekend 
                            ? 'bg-slate-50 border-slate-200' 
                            : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className={`text-sm font-medium ${isWeekend && !item.holiday ? 'text-blue-600' : ''}`}>
                        {item.day}
                      </div>
                      {item.holiday && (
                        <div className="text-xs mt-1 line-clamp-2" title={item.holiday.name}>
                          {item.holiday.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holidays List */}
        <div className="space-y-4">
          {/* Month Holidays */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-600" />
                Festivos de {MONTHS[selectedMonth]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthHolidays.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No hay festivos este mes</p>
              ) : (
                <div className="space-y-2">
                  {monthHolidays.map(holiday => {
                    const typeConfig = getTypeConfig(holiday.type);
                    return (
                      <div 
                        key={holiday.id} 
                        className={`flex items-center justify-between p-2 rounded-lg border ${typeConfig.color}`}
                      >
                        <div>
                          <p className="font-medium text-sm">{holiday.name}</p>
                          <p className="text-xs opacity-75">{formatDate(holiday.date)}</p>
                        </div>
                        {!holiday.is_preset && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHoliday(holiday.id, holiday.is_preset)}
                            className="h-7 w-7 hover:bg-red-200"
                            data-testid={`delete-holiday-${holiday.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Year Holidays Summary */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                Resumen {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nacionales:</span>
                  <span className="font-medium">{yearHolidays.filter(h => h.type === 'nacional').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Autonómicos:</span>
                  <span className="font-medium">{yearHolidays.filter(h => h.type === 'autonomico').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Locales:</span>
                  <span className="font-medium">{yearHolidays.filter(h => h.type === 'local').length}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-red-600">{yearHolidays.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complete List */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Todos los Festivos {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {yearHolidays.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No hay festivos</p>
              ) : (
                <div className="space-y-1">
                  {yearHolidays.map(holiday => {
                    const typeConfig = getTypeConfig(holiday.type);
                    return (
                      <div 
                        key={holiday.id} 
                        className="flex items-center justify-between py-1 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className={`${typeConfig.color} border text-xs px-1.5`}>
                            {holiday.type.substring(0, 3).toUpperCase()}
                          </Badge>
                          <span>{holiday.name}</span>
                        </div>
                        <span className="text-slate-500 text-xs">{formatDate(holiday.date)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Festivo</DialogTitle>
            <DialogDescription>
              Agrega un nuevo día festivo para esta plaza
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holidayDate">Fecha *</Label>
              <Input
                id="holidayDate"
                type="date"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                data-testid="holiday-date-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holidayName">Nombre del Festivo *</Label>
              <Input
                id="holidayName"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Fiesta Local"
                data-testid="holiday-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={newHoliday.type} 
                onValueChange={(v) => setNewHoliday(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger data-testid="holiday-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOLIDAY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddHoliday}
              disabled={addingHoliday}
              className="bg-red-600 hover:bg-red-700"
              data-testid="submit-holiday-btn"
            >
              {addingHoliday && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiasFestivos;
