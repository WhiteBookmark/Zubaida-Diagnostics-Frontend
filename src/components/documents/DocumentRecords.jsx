import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, Tooltip, IconButton, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, Select, MenuItem, CircularProgress } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { buildApiUrl } from '../../config/api';

export default function DocumentRecords({ onAddDocument, initialToastMessage, clearPending, refreshKey }) {
  const searchInputRef = useRef(null); // Added ref for search input
  const [data, setData] = useState([]);
  const [approximateCount, setApproximateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayOnly, setIsTodayOnly] = useState(false);
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

  // Focus search box automatically when page/component opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

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
  }, [searchTerm, pagination.pageSize, isTodayOnly]);

  const fetchData = useCallback(() => {
    const currentCursor = cursorHistory[pagination.pageIndex];
    let endpoint = `/api/documents?search=${encodeURIComponent(searchTerm)}&limit=${pagination.pageSize}`;
    if (isTodayOnly) {
      endpoint += '&today=true';
    }
    if (currentCursor) {
      endpoint += `&cursor=${currentCursor}`;
    }
    const url = buildApiUrl(endpoint);
    
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
  }, [searchTerm, pagination.pageIndex, pagination.pageSize, refreshKey, isTodayOnly]);

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
    const fileName = row.original.fileName;
    if (fileName) {
      const url = `${window.location.origin}/document/${fileName}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      setToast({ open: true, message: 'File name not available', severity: 'warning' });
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
    { accessorKey: 'patient.mrNumber', header: 'MR Number', enableSorting: false },
    { accessorKey: 'patient.name', header: 'Patient Name', enableSorting: false },
    { accessorKey: 'type', header: 'Document Type', enableSorting: false },
    {
      accessorKey: 'fileName',
      header: 'File Path',
      enableSorting: false,
      cell: info => {
        const fileName = info.getValue();
        if (!fileName) return 'N/A';
        
        const url = `${window.location.origin}/document/${fileName}`;
        const isPdf = /\.pdf$/i.test(fileName);
        const isDoc = /\.(doc|docx)$/i.test(fileName);
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Click to open file"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.3)',
                flexShrink: 0,
                textDecoration: 'none',
                position: 'relative'
              }}
            >
              {isImage ? (
                <img
                  src={url}
                  alt="thumb"
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : isPdf ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', lineHeight: 1 }}>PDF</span>
                </Box>
              ) : isDoc ? (
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', lineHeight: 1 }}>DOC</span>
                </Box>
              ) : (
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'inherit' }}>FILE</span>
              )}
            </a>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'inherit',
                textDecoration: 'none',
                wordBreak: 'break-all',
                fontWeight: 500
              }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {url}
            </a>
          </Box>
        );
      }
    },
    {
      accessorKey: 'uploadedAt',
      header: 'Uploaded At',
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.uploadedAt ? new Date(rowA.original.uploadedAt).getTime() : 0;
        const b = rowB.original.uploadedAt ? new Date(rowB.original.uploadedAt).getTime() : 0;
        return a - b;
      },
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
      const response = await fetch(buildApiUrl(`/api/documents/${rowToDelete.original.id}`), { method: 'DELETE' });
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
          <Button
            variant={isTodayOnly ? "contained" : "outlined"}
            onClick={() => setIsTodayOnly(prev => !prev)}
            sx={{
              whiteSpace: 'nowrap',
              fontWeight: 600,
              ...(isTodayOnly ? {
                backgroundColor: 'hsla(221, 83%, 53%, 0.25)',
                borderColor: 'var(--primary)',
              } : {})
            }}
          >
            Today's Documents
          </Button>
          <TextField
            autoFocus
            inputRef={searchInputRef}
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
              {headerGroup.headers.map(header => {
                const canSort = header.column.getCanSort();
                const isSorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    style={{
                      cursor: canSort ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                    title={canSort ? `Sort by ${header.column.columnDef.header}` : undefined}
                  >
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                          {isSorted === 'asc' ? (
                            <ArrowUpwardIcon sx={{ fontSize: '16px', color: 'var(--primary)' }} />
                          ) : isSorted === 'desc' ? (
                            <ArrowDownwardIcon sx={{ fontSize: '16px', color: 'var(--primary)' }} />
                          ) : (
                            <UnfoldMoreIcon sx={{ fontSize: '16px', opacity: 0.4, color: 'var(--text)' }} />
                          )}
                        </Box>
                      )}
                    </Box>
                  </th>
                );
              })}
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
        transitionDuration={0}
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
