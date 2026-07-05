import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, Tooltip, IconButton, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, Select, MenuItem, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export default function DocumentRecords({ onAddDocument, initialToastMessage, clearPending, refreshKey }) {
  const [data, setData] = useState([]);
  const [approximateCount, setApproximateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [pagination, setPagination] = useState(() => {
    const savedSize = localStorage.getItem('documentRecordsPageSize');
    return {
      pageIndex: 0,
      pageSize: savedSize ? Number(savedSize) : 25,
    };
  });
  
  const [cursorHistory, setCursorHistory] = useState([null]);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    localStorage.setItem('documentRecordsPageSize', pagination.pageSize);
  }, [pagination.pageSize]);

  useEffect(() => {
    if (initialToastMessage) {
      setToast({ open: true, message: initialToastMessage, severity: 'success' });
      if (clearPending) clearPending();
    }
  }, [initialToastMessage, clearPending]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setCursorHistory([null]);
  }, [searchTerm, pagination.pageSize]);

  const fetchData = useCallback(() => {
    const currentCursor = cursorHistory[pagination.pageIndex];
    let url = `/api/documents?search=${encodeURIComponent(searchTerm)}&limit=${pagination.pageSize}`;
    if (currentCursor) {
      url += `&cursor=${currentCursor}`;
    }
    
    setIsLoading(true);
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(result => {
        setIsLoading(false);
        if (result && Array.isArray(result.data)) {
          setData(result.data);
          setNextCursor(result.nextCursor || null);
          if (result.metadata?.approximateCount !== undefined) setApproximateCount(result.metadata.approximateCount);
          if (result.nextCursor) {
             setCursorHistory(prev => {
                const newHistory = [...prev];
                newHistory[pagination.pageIndex + 1] = result.nextCursor;
                return newHistory;
             });
          }
        } else if (Array.isArray(result)) {
          setData(result);
          setNextCursor(null);
        }
      })
      .catch(err => {
        console.error('Error fetching documents:', err);
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pagination.pageIndex, pagination.pageSize, refreshKey]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchData]);


  const handleDeleteClick = useCallback((row) => {
    setRowToDelete(row);
    setDeleteDialogOpen(true);
  }, []);

  const handleOpenDocument = useCallback((row) => {
    const path = row.original.filePath;
    if (path) {
      let normalizedPath = path.replace(/\\/g, '/');
      if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1);
      }
      const url = normalizedPath.startsWith('http') ? normalizedPath : `${window.location.origin}/${normalizedPath}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setToast({ open: true, message: 'File path not available', severity: 'warning' });
    }
  }, []);

  const columns = useMemo(() => [
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="View Document">
            <IconButton color="primary" onClick={() => handleOpenDocument(row)}>
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDeleteClick(row)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    { accessorKey: 'patient.name', header: 'Patient Name' },
    { accessorKey: 'type', header: 'Document Type' },
    {
      accessorKey: 'filePath',
      header: 'File Path',
      cell: info => {
        const path = info.getValue();
        if (!path) return 'N/A';
        let normalizedPath = path.replace(/\\/g, '/');
        if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }
        return `${window.location.origin}/${normalizedPath}`;
      }
    },
    {
      accessorKey: 'uploadedAt',
      header: 'Uploaded At',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
    },
  ], [handleDeleteClick, handleOpenDocument]);

  const table = useReactTable({
    columns,
    data,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: nextCursor ? pagination.pageIndex + 2 : pagination.pageIndex + 1,
  });

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRowToDelete(null);
  };

  const confirmDelete = useCallback(async () => {
    if (!rowToDelete) return;
    
    try {
      const response = await fetch(`/api/uploads/documents/${rowToDelete.original.id}`, { method: 'DELETE' });
      if (response.ok) {
        setData(prev => prev.filter(item => item.id !== rowToDelete.original.id));
        setToast({ open: true, message: 'Document deleted successfully', severity: 'success' });
        fetchData();
      } else {
        setToast({ open: true, message: 'Failed to delete document', severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setToast({ open: true, message: 'Error deleting document', severity: 'error' });
    } finally {
      handleCloseDeleteDialog();
    }
  }, [rowToDelete, setData, fetchData]);

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
          {isLoading && <CircularProgress size={24} sx={{ color: 'var(--text)' }} />}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{ color: 'var(--text)' }}>
            Page{' '}
            <strong>
              {table.getState().pagination.pageIndex + 1}
            </strong>
            {' '}(Roughly {approximateCount.toLocaleString()} Records)
          </span>
          <Select
            value={table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
            }}
            size="small"
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text)',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--primary)' },
              '.MuiSvgIcon-root ': { fill: 'var(--text)' }
            }}
          >
            {[5, 10, 25, 50, 75, 100].map(pageSize => (
              <MenuItem key={pageSize} value={pageSize}>
                Show {pageSize} Records
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--text)', '&:disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' } }}
          >
            Previous
          </Button>
          <Button
            variant="outlined"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--text)', '&:disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' } }}
          >
            Next
          </Button>
        </Box>
      </Box>

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
