import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, TextField, InputAdornment, Select, MenuItem, CircularProgress, Portal } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { buildApiUrl } from '../../config/api';

export default function PatientRecords({ onEdit, onAddPatient, onAddAppointment, onViewFiles, initialToastMessage, clearPending, refreshKey }) {
  const searchInputRef = useRef(null); // Added ref for search input

  // Focus search box automatically when page/component opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayOnly, setIsTodayOnly] = useState(false);
  const [sorting, setSorting] = useState([]);

  const [cursorHistory, setCursorHistory] = useState([null]);
  const [nextCursor, setNextCursor] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const [isShowAll, setIsShowAll] = useState(() => localStorage.getItem('patientRecordsShowAll') === 'true');
  const tableContainerRef = useRef(null);

  const [pagination, setPagination] = useState(() => {
    const savedSize = localStorage.getItem('patientRecordsPageSize');
    return {
      pageIndex: 0,
      pageSize: savedSize ? Number(savedSize) : 25,
    };
  });

  useEffect(() => {
    localStorage.setItem('patientRecordsPageSize', pagination.pageSize);
  }, [pagination.pageSize]);

  useEffect(() => {
    localStorage.setItem('patientRecordsShowAll', isShowAll);
  }, [isShowAll]);

  const clearPendingRef = useRef(clearPending);
  useEffect(() => {
    clearPendingRef.current = clearPending;
  }, [clearPending]);

  useEffect(() => {
    if (initialToastMessage) {
      setToast({ open: true, message: initialToastMessage, severity: 'success' });
      if (typeof clearPendingRef.current === 'function') {
        clearPendingRef.current();
      }
    }
  }, [initialToastMessage]);

  useEffect(() => {
    setIsShowAll(false);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setCursorHistory([null]);
  }, [searchTerm, isTodayOnly]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setCursorHistory([null]);
  }, [pagination.pageSize]);

  const fetchData = useCallback(() => {
    let endpoint;
    if (isShowAll) {
      endpoint = `/api/patients?search=${encodeURIComponent(searchTerm)}&limit=all`;
      if (isTodayOnly) {
        endpoint += '&today=true';
      }
    } else {
      const currentCursor = cursorHistory[pagination.pageIndex];
      endpoint = `/api/patients?search=${encodeURIComponent(searchTerm)}&limit=${pagination.pageSize}`;
      if (isTodayOnly) {
        endpoint += '&today=true';
      }
      if (currentCursor) {
        endpoint += `&cursor=${currentCursor}`;
      }
    }
    const url = buildApiUrl(endpoint);

    setIsLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(result => {
        setIsLoading(false);
        if (result && Array.isArray(result.data)) {
          setData(result.data);
          if (!isShowAll) {
            setNextCursor(result.nextCursor || null);
            if (result.nextCursor) {
              setCursorHistory(prev => {
                const newHistory = [...prev];
                newHistory[pagination.pageIndex + 1] = result.nextCursor;
                return newHistory;
              });
            }
          } else {
            setNextCursor(null);
          }
        } else if (Array.isArray(result)) {
          setData(result);
          setNextCursor(null);
        }
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });

    // Fetch exact count separately
    fetch(buildApiUrl('/api/patients/count/exact'))
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch count');
        return res.json();
      })
      .then(countResult => {
        if (countResult && typeof countResult.count === 'number') {
          setTotalCount(countResult.count);
        }
      })
      .catch(err => console.error('Error fetching exact patient count:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pagination.pageIndex, pagination.pageSize, refreshKey, isTodayOnly, isShowAll]);

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

  const columns = useMemo(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: '1px' }} onClick={(e) => e.stopPropagation()}>
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
      {
        accessorKey: 'age',
        header: 'Age',
        cell: info => {
          const row = info.row.original;
          const years = row.age ?? null;
          const months = row.ageMonths ?? null;

          if (years === null && months === null) return 'N/A';

          let ageDisplay = [];
          if (years !== null && years > 0) {
            ageDisplay.push(`${years} year${years !== 1 ? 's' : ''}`);
          }
          if (months !== null && months > 0) {
            ageDisplay.push(`${months} month${months !== 1 ? 's' : ''}`);
          }

          if (ageDisplay.length === 0) {
            if (years === 0 && (months === 0 || months === null)) return '0 years';
            if (months === 0) return '0 months';
            return 'N/A';
          }

          return ageDisplay.join(' ');
        }
      },
      { accessorKey: 'phone', header: 'Phone' },
      { accessorKey: 'fixedAllergies', header: 'Fixed Allergies' },
      { accessorKey: 'coMorbidFactor', header: 'Co Morbid Factor' },
      { accessorKey: 'fatherName', header: "Father's Name" },
      { accessorKey: 'motherName', header: "Mother's Name" },
      { accessorKey: 'husbandName', header: "Husband's Name" },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'N/A'
      },
      { accessorKey: 'email', header: 'Email' },
    ],
    [onEdit, onAddAppointment, handleDeleteClick]
  );

  const table = useReactTable({
    columns,
    data,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalCount > 0 ? Math.ceil(totalCount / pagination.pageSize) : (nextCursor ? pagination.pageIndex + 2 : pagination.pageIndex + 1),
  });

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setRowToDelete(null);
  };

  const confirmDelete = useCallback(async () => {
    if (!rowToDelete) return;

    try {
      const response = await fetch(buildApiUrl(`/api/patients/${rowToDelete.original.id}`), {
        method: 'DELETE',
      });
      if (response.ok) {
        setData(prev => prev.filter(item => item.id !== rowToDelete.original.id));
        setToast({ open: true, message: 'Record deleted successfully', severity: 'success' });
        fetchData();
      } else {
        setToast({ open: true, message: 'Failed to delete record', severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      setToast({ open: true, message: 'Error deleting record', severity: 'error' });
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

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 15,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '0 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0px', alignItems: 'center' }}>
        <h2>Patient Records</h2>
        <Box sx={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
            Today's Patients
          </Button>
          <TextField
            autoFocus
            inputRef={searchInputRef}
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

      {/* Record count summary at top */}
      <div style={{ color: 'var(--text)', fontSize: '14px', marginBottom: '12px', textAlign: 'left' }}>
        {isShowAll ? (
          <span>Showing All <strong>{data.length.toLocaleString()}</strong> Records</span>
        ) : (
          <span>
            Page <strong>{table.getState().pagination.pageIndex + 1}</strong> of{' '}
            <strong>{Math.max(1, Math.ceil(totalCount / table.getState().pagination.pageSize))}</strong>
            {' '}({totalCount.toLocaleString()} Records)
          </span>
        )}
      </div>

      {isShowAll ? (
        <div
          ref={tableContainerRef}
          style={{ maxHeight: '70vh', overflow: 'auto', position: 'relative' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg, #f8fafc)' }}>
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
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px`, padding: 0, border: 'none' }} colSpan={columns.length} />
                </tr>
              )}
              {virtualRows.map(virtualRow => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onViewFiles && onViewFiles(row.original.mrNumber)}
                    style={{ cursor: 'pointer' }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px`, padding: 0, border: 'none' }} colSpan={columns.length} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
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
                <tr
                  key={row.id}
                  onClick={() => onViewFiles && onViewFiles(row.original.mrNumber)}
                  style={{ cursor: 'pointer' }}
                >
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
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isShowAll ? (
            <span style={{ color: 'var(--text)' }}>
              Showing All <strong>{data.length.toLocaleString()}</strong> Records
            </span>
          ) : (
            <span style={{ color: 'var(--text)' }}>
              Page{' '}
              <strong>
                {table.getState().pagination.pageIndex + 1}
              </strong>
              {' '}of{' '}
              <strong>
                {Math.max(1, Math.ceil(totalCount / table.getState().pagination.pageSize))}
              </strong>
              {' '}({totalCount.toLocaleString()} Records)
            </span>
          )}
          <Select
            value={isShowAll ? 'all' : table.getState().pagination.pageSize}
            onChange={e => {
              const val = e.target.value;
              if (val === 'all') {
                setIsShowAll(true);
              } else {
                setIsShowAll(false);
                table.setPageSize(Number(val));
              }
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
            <MenuItem value="all">Show All Records</MenuItem>
          </Select>
        </Box>
        {!isShowAll && (
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
        )}
      </Box>

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

      {/* Scroll to top/bottom floating buttons */}
      <Portal>
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px hsla(0, 0%, 0%, 0.15)',
            zIndex: 9999,
          }}
        >
          <IconButton
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'instant' });
              if (tableContainerRef?.current) {
                tableContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
              }
            }}
            sx={{
              borderRadius: 0,
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderBottom: 'none',
              color: 'var(--text)',
              width: 44,
              height: 44,
              '&:hover': { background: 'hsla(0, 0%, 100%, 0.5)' },
            }}
            aria-label="Scroll to top"
          >
            <ArrowUpwardIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              window.scrollTo({
                top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
                behavior: 'instant'
              });
              if (tableContainerRef?.current) {
                tableContainerRef.current.scrollTo({
                  top: tableContainerRef.current.scrollHeight,
                  behavior: 'instant'
                });
              }
            }}
            sx={{
              borderRadius: 0,
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text)',
              width: 44,
              height: 44,
              '&:hover': { background: 'hsla(0, 0%, 100%, 0.5)' },
            }}
            aria-label="Scroll to bottom"
          >
            <ArrowDownwardIcon />
          </IconButton>
        </Box>
      </Portal>
    </div>
  );
}
