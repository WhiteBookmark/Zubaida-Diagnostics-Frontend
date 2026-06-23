import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, IconButton, TextField, InputAdornment, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PrintIcon from '@mui/icons-material/Print';
import { Snackbar, Alert } from '@mui/material';
import AddAppointmentRecord from './AddAppointmentRecord';
import logo from '../../assets/Logo.png';

export default function AppointmentRecords() {
  const [data, setData] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [pagination, setPagination] = useState(() => {
    const savedSize = localStorage.getItem('appointmentRecordsPageSize');
    return {
      pageIndex: 0,
      pageSize: savedSize ? Number(savedSize) : 5,
    };
  });

  useEffect(() => {
    localStorage.setItem('appointmentRecordsPageSize', pagination.pageSize);
  }, [pagination.pageSize]);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/appointments?search=${encodeURIComponent(searchTerm)}`)
        .then(res => res.json())
        .then(setData)
        .catch(console.error);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handlePrintToken = useCallback((appointment) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return; // In case of popup blockers
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Print Token</title>
    <style>
        @page {
            size: 80mm auto;
            margin: 0mm;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; padding: 10mm; display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; }
        .receipt-canvas { width: 72mm; text-align: center; }
        .header-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .sub-header { font-size: 11px; color: #444; margin-bottom: 12px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .token-container { margin: 15px 0; padding: 10px 0; border-top: 2px dashed #000; border-bottom: 2px dashed #000; }
        .token-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
        .token-value { font-size: 48px; font-weight: 900; line-height: 1.1; margin: 4px 0; }
        .meta-data { font-size: 11px; margin-top: 10px; }
        .footer-notice { font-size: 10px; margin-top: 8px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="receipt-canvas" id="ticket">
        <div class="header-title">Diagnostic Center</div>
        <div class="sub-header">Patient Queue Management</div>
        <div class="token-container">
            <div class="token-label">YOUR TOKEN NUMBER</div>
            <div class="token-value">${appointment.tokenNumber || 'N/A'}</div>
        </div>
        <div class="meta-data">
          MR Number: ${appointment.patient?.mrNumber || 'N/A'}<br>
          Patient: ${appointment.patient?.name || 'N/A'}<br>
          ${appointment.dateTime ? new Date(appointment.dateTime).toLocaleString() : ''}
        </div>
        <div class="footer-notice">Please wait in the lounge area.</div>
    </div>
    <script>
        window.onload = function() { window.print(); window.close(); }
    </script>
</body>
</html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }, []);

  const columns = useMemo(() => [
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <IconButton onClick={() => handlePrintToken(row.original)} color="primary" size="small">
          <PrintIcon />
        </IconButton>
      )
    },
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    { accessorKey: 'patient.name', header: 'Patient Name' },
    {
      accessorKey: 'dateTime',
      header: 'Date/Time',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
    },
    { accessorKey: 'tokenNumber', header: 'Token' },
    { accessorKey: 'amountPaid', header: 'Paid (Rs)' }
  ], [handlePrintToken]);

  const table = useReactTable({
    columns,
    data,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (showAddForm) {
    return <AddAppointmentRecord onBack={() => setShowAddForm(false)} onAdd={(newRecord, message) => {
      setShowAddForm(false);
      if (message) setToast({ open: true, message, severity: 'success' });
      fetch('/api/appointments').then(res => res.json()).then(setData);
      handlePrintToken(newRecord);
    }} />;
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <h2>Appointment Records</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search appointments..."
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
          <Button variant="contained" onClick={() => setShowAddForm(true)}>Add New Appointment</Button>
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
              {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount() || 1}
            </strong>
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
                Show {pageSize}
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
