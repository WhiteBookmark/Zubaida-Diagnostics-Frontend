import { useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, TextField, InputAdornment } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import AddPatient from './AddPatient';
import logo from '../../assets/Logo.png';

export default function PatientRecords({ onEdit, onAddPatient, onAddAppointment, data = [], setData, searchTerm, setSearchTerm }) {
  const [sorting, setSorting] = useState([]);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const columns = useMemo(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: '1px' }}>
            <Tooltip title="Add Appointment">
              <IconButton color="primary" onClick={() => onAddAppointment(row.original)}>
                <EventIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton onClick={() => onEdit(row.original)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                color="error"
                onClick={() => handleDeleteClick(row)}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      { accessorKey: 'mrNumber', header: 'MR Number' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'fatherName', header: "Father's Name" },
      { accessorKey: 'motherName', header: "Mother's Name" },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'N/A'
      },
      { accessorKey: 'age', header: 'Age' },
      { accessorKey: 'phone', header: 'Phone' },
      { accessorKey: 'email', header: 'Email' },
    ],
    [onEdit, onAddAppointment]
  );

  const table = useReactTable({
    columns,
    data,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  const handleDeleteClick = useCallback((row) => {
    setRowToDelete(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRowToDelete(null);
  };

  const confirmDelete = useCallback(async () => {
    if (!rowToDelete) return;
    
    try {
      const response = await fetch(`/api/patients/${rowToDelete.original.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setData(prev => prev.filter(item => item.id !== rowToDelete.original.id));
        setToast({ open: true, message: 'Record deleted successfully', severity: 'success' });
      } else {
        setToast({ open: true, message: 'Failed to delete record', severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      setToast({ open: true, message: 'Error deleting record', severity: 'error' });
    } finally {
      handleCloseDeleteDialog();
    }
  }, [rowToDelete, setData]);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast(prev => ({ ...prev, open: false }));
  };

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '0 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <h2>Patient Records</h2>
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
               background: 'rgba(255, 255, 255, 0.1)',
               borderRadius: '8px',
               boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1), 0 2px 5px rgba(0, 0, 0, 0.05)',
               input: { color: 'var(--text)' },
               '& .MuiOutlinedInput-root': {
                 '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                 '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                 '&.Mui-focused fieldset': { borderColor: 'var(--primary)' }
               }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--text)' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    edge="end"
                  >
                    <ClearIcon sx={{ color: 'var(--text)' }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <Button variant="contained" onClick={onAddPatient}>
            Add New Patient Record
          </Button>
        </Box>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          className: 'glass',
          style: { padding: '16px', borderRadius: '16px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-h)', fontWeight: 'bold' }}>Delete Patient Record</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--text)' }}>
            Are you sure you want to delete this patient record? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} sx={{ color: 'var(--text-h)' }}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={toast.open} 
        autoHideDuration={6000} 
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
