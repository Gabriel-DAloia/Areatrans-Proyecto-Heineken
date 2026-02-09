import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
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
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Download,
  Save,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getDayName = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  return DAYS_SHORT[date.getDay()];
};

const STATUS_OPTIONS = [
  { value: '1', label: '1 - Trabajado', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'D', label: 'D - Descanso', color: 'bg-blue-100 text-blue-700' },
  { value: 'IN', label: 'IN - Inasistente', color: 'bg-red-100 text-red-700' },
  { value: 'E', label: 'E - Enfermo', color: 'bg-amber-100 text-amber-700' },
  { value: 'O', label: 'O - Otros', color: 'bg-slate-100 text-slate-700' },
  { value: '', label: '- Vacío', color: 'bg-white text-slate-400' }
];

const getStatusColor = (status) => {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  return option?.color || 'bg-white';
};

const Asistencias = () => {
  const { hubId } = useParams();
  const { user } = useAuth();
  const [hub, setHub] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Date selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [daysInMonth, setDaysInMonth] = useState(31);
  
  // Employee dialog
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePosition, setNewEmployeePosition] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);

  // Summary
  const [summary, setSummary] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hubRes, attendanceRes] = await Promise.all([
        axios.get(`${API_URL}/hubs/${hubId}`),
        axios.get(`${API_URL}/hubs/${hubId}/attendance`, {
          params: { year: selectedYear, month: selectedMonth }
        })
      ]);
      
      setHub(hubRes.data);
      setEmployees(attendanceRes.data.employees || []);
      setAttendance(attendanceRes.data.attendance || {});
      setDaysInMonth(attendanceRes.data.days_in_month || 31);
      
      // Fetch summary
      const summaryRes = await axios.get(`${API_URL}/hubs/${hubId}/attendance/summary`, {
        params: { year: selectedYear, month: selectedMonth }
      });
      setSummary(summaryRes.data.summary || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [hubId, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCellChange = (employeeId, day, field, value) => {
    const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${employeeId}_${date}`;
    
    setAttendance(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const getCellValue = (employeeId, day, field) => {
    const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${employeeId}_${date}`;
    return attendance[key]?.[field] || (field === 'status' ? '' : 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = [];
      
      for (const emp of employees) {
        for (let day = 1; day <= daysInMonth; day++) {
          const date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const key = `${emp.id}_${date}`;
          const cellData = attendance[key];
          
          if (cellData && (cellData.status || cellData.extra_hours || cellData.diet)) {
            entries.push({
              employee_id: emp.id,
              hub_id: hubId,
              date: date,
              status: cellData.status || '',
              extra_hours: parseFloat(cellData.extra_hours) || 0,
              diet: parseInt(cellData.diet) || 0
            });
          }
        }
      }
      
      await axios.post(`${API_URL}/hubs/${hubId}/attendance`, { entries });
      toast.success('Asistencia guardada correctamente');
      setHasChanges(false);
      
      // Refresh summary
      const summaryRes = await axios.get(`${API_URL}/hubs/${hubId}/attendance/summary`, {
        params: { year: selectedYear, month: selectedMonth }
      });
      setSummary(summaryRes.data.summary || []);
      
    } catch (error) {
      toast.error('Error al guardar asistencia');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    
    setAddingEmployee(true);
    try {
      await axios.post(`${API_URL}/hubs/${hubId}/employees`, {
        hub_id: hubId,
        name: newEmployeeName.trim(),
        position: newEmployeePosition.trim()
      });
      toast.success('Empleado agregado');
      setNewEmployeeName('');
      setNewEmployeePosition('');
      setIsEmployeeDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar empleado');
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`¿Eliminar a ${employeeName}? También se eliminarán sus registros de asistencia.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/hubs/${hubId}/employees/${employeeId}`);
      toast.success('Empleado eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar empleado');
    }
  };

  const handleExportExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create attendance sheet data
    const attendanceData = [];
    
    // Header row with days
    const headerRow = ['Empleado'];
    for (let day = 1; day <= daysInMonth; day++) {
      headerRow.push(`${day}`);
    }
    headerRow.push('H.Extras', 'Dietas');
    attendanceData.push(headerRow);
    
    // Data rows
    for (const emp of employees) {
      const row = [emp.name];
      let totalExtras = 0;
      let totalDiets = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const status = getCellValue(emp.id, day, 'status');
        const extras = parseFloat(getCellValue(emp.id, day, 'extra_hours')) || 0;
        const diet = parseInt(getCellValue(emp.id, day, 'diet')) || 0;
        
        row.push(status || '');
        totalExtras += extras;
        totalDiets += diet;
      }
      
      row.push(totalExtras, totalDiets);
      attendanceData.push(row);
    }
    
    const ws1 = XLSX.utils.aoa_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Asistencia');
    
    // Create summary sheet
    const summaryData = [
      ['Empleado', 'Días Trabajados', 'Días Descanso', 'Días Inasistente', 'Días Enfermo', 'Otros', 'Horas Extras', 'Dietas']
    ];
    
    for (const s of summary) {
      summaryData.push([
        s.employee_name,
        s.days_worked,
        s.days_rest,
        s.days_absent,
        s.days_sick,
        s.days_other,
        s.total_extra_hours,
        s.total_diets
      ]);
    }
    
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
    
    // Export
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Asistencia_${hub?.name}_${MONTHS[selectedMonth - 1]}_${selectedYear}.xlsx`);
    
    toast.success('Excel exportado correctamente');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="asistencias-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to={`/hub/${hubId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Asistencias</h1>
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
          
          {user?.is_admin && (
            <Button 
              onClick={() => setIsEmployeeDialogOpen(true)}
              variant="outline"
              data-testid="add-employee-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Empleado
            </Button>
          )}
          
          <Button 
            onClick={handleExportExcel}
            variant="outline"
            data-testid="export-excel-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="save-attendance-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card className="border border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {STATUS_OPTIONS.filter(s => s.value).map(status => (
              <div key={status.value} className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                  {status.value}
                </span>
                <span className="text-slate-600">{status.label.split(' - ')[1]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      {employees.length === 0 ? (
        <Card className="border border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4">No hay empleados registrados</p>
            {user?.is_admin && (
              <Button onClick={() => setIsEmployeeDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Empleado
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-slate-200 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[180px] border-r border-slate-200">
                      Empleado
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                      <th key={day} className="px-1 py-3 text-center text-xs font-semibold text-slate-500 min-w-[60px]">
                        {day}
                      </th>
                    ))}
                    <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[70px] border-l border-slate-200">
                      H.Ext
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[60px]">
                      Dieta
                    </th>
                    {user?.is_admin && (
                      <th className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-[50px]">
                        
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee, empIndex) => (
                    <tr key={employee.id} className={empIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="sticky left-0 z-10 px-4 py-2 text-sm font-medium text-slate-900 border-r border-slate-200" style={{ backgroundColor: empIndex % 2 === 0 ? 'white' : 'rgb(248 250 252 / 0.5)' }}>
                        <div className="truncate max-w-[160px]" title={employee.name}>
                          {employee.name}
                        </div>
                        {employee.position && (
                          <div className="text-xs text-slate-400 truncate">{employee.position}</div>
                        )}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                        <td key={day} className="px-1 py-1">
                          <select
                            value={getCellValue(employee.id, day, 'status')}
                            onChange={(e) => handleCellChange(employee.id, day, 'status', e.target.value)}
                            className={`w-full h-8 text-center text-xs font-medium border-0 rounded cursor-pointer focus:ring-2 focus:ring-blue-500 ${getStatusColor(getCellValue(employee.id, day, 'status'))}`}
                            data-testid={`cell-${employee.id}-${day}`}
                          >
                            <option value="">-</option>
                            <option value="1">1</option>
                            <option value="D">D</option>
                            <option value="IN">IN</option>
                            <option value="E">E</option>
                            <option value="O">O</option>
                          </select>
                        </td>
                      ))}
                      <td className="px-1 py-1 border-l border-slate-200">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={(() => {
                            let total = 0;
                            for (let d = 1; d <= daysInMonth; d++) {
                              total += parseFloat(getCellValue(employee.id, d, 'extra_hours')) || 0;
                            }
                            return total || '';
                          })()}
                          onChange={(e) => {
                            // For simplicity, set extra hours on day 1 when edited in total
                            handleCellChange(employee.id, 1, 'extra_hours', e.target.value);
                          }}
                          className="w-full h-8 text-center text-xs border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <div className="text-center text-xs font-medium text-slate-600">
                          {(() => {
                            let total = 0;
                            for (let d = 1; d <= daysInMonth; d++) {
                              total += parseInt(getCellValue(employee.id, d, 'diet')) || 0;
                            }
                            return total;
                          })()}
                        </div>
                      </td>
                      {user?.is_admin && (
                        <td className="px-1 py-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            data-testid={`delete-employee-${employee.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Summary */}
      {summary.length > 0 && (
        <Card className="border border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Resumen del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Empleado</th>
                    <th className="px-3 py-3 text-center font-semibold text-emerald-700">Trabajados</th>
                    <th className="px-3 py-3 text-center font-semibold text-blue-700">Descanso</th>
                    <th className="px-3 py-3 text-center font-semibold text-red-700">Inasistencias</th>
                    <th className="px-3 py-3 text-center font-semibold text-amber-700">Enfermo</th>
                    <th className="px-3 py-3 text-center font-semibold text-slate-700">Otros</th>
                    <th className="px-3 py-3 text-center font-semibold text-purple-700">H. Extras</th>
                    <th className="px-3 py-3 text-center font-semibold text-cyan-700">Dietas</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s, index) => (
                    <tr key={s.employee_id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-medium">{s.employee_name}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          {s.days_worked}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {s.days_rest}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                          {s.days_absent}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                          {s.days_sick}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {s.days_other}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                          {s.total_extra_hours}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full bg-cyan-100 text-cyan-700 font-medium">
                          {s.total_diets}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Empleado</DialogTitle>
            <DialogDescription>
              Añade un nuevo empleado al hub {hub?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Nombre *</Label>
              <Input
                id="employeeName"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="Nombre del empleado"
                data-testid="employee-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeePosition">Puesto (opcional)</Label>
              <Input
                id="employeePosition"
                value={newEmployeePosition}
                onChange={(e) => setNewEmployeePosition(e.target.value)}
                placeholder="Ej: Conductor, Almacenero..."
                data-testid="employee-position-input"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddEmployee}
              disabled={addingEmployee}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="submit-employee-btn"
            >
              {addingEmployee && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Asistencias;
