import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, Tooltip, IconButton, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export default function Documents({ onAddDocument }) {
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(() => {
    fetch(`/api/documents?search=${encodeURIComponent(searchTerm)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setData)
      .catch(err => console.error('Error fetching documents:', err));
  }, [searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchData]);

  const populateRandomData = async () => {
      try {
          const response = await fetch('/api/documents/populate', { method: 'POST' });
          if (response.ok) {
              fetchData();
          } else {
              alert('Failed to populate random data');
          }
      } catch (error) {
          console.error('Error populating data:', error);
          alert('Error populating data');
      }
  };

  const columns = useMemo(() => [
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    { accessorKey: 'patient.name', header: 'Patient Name' },
    { accessorKey: 'type', header: 'Document Type' },
    { accessorKey: 'filePath', header: 'File Path' },
    {
      accessorKey: 'uploadedAt',
      header: 'Uploaded At',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Tooltip title="Delete">
          <IconButton color="error" onClick={() => handleDeleteClick(row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  const table = useReactTable({
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
      const response = await fetch(`/api/documents/${rowToDelete.original.id}`, { method: 'DELETE' });
      if (response.ok) {
        setData(prev => prev.filter(item => item.id !== rowToDelete.original.id));
        setToast({ open: true, message: 'Document deleted successfully', severity: 'success' });
      } else {
        setToast({ open: true, message: 'Failed to delete document', severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setToast({ open: true, message: 'Error deleting document', severity: 'error' });
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
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <h2>Documents</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search documents..."
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
          <Button variant="contained" onClick={onAddDocument}>Add New Document</Button>
        </Box>
      </div>
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

      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          className: 'glass',
          style: { padding: '16px', borderRadius: '16px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-h)', fontWeight: 'bold' }}>Delete Document</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'var(--text)' }}>
            Are you sure you want to delete this document? This action cannot be undone.
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
