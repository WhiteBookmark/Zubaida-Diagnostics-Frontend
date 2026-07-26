import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, IconButton, TextField, InputAdornment, Select, MenuItem, Tooltip, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PrintIcon from '@mui/icons-material/Print';
import { Snackbar, Alert } from '@mui/material';
import AddAppointmentRecord from './AddAppointmentRecord';
import logo from '../../assets/Logo.png';
import QRCode from 'qrcode';

export default function AppointmentRecords({ initialPrintRecord = null, initialToastMessage = null, clearPending = null, refreshKey }) {
  const [data, setData] = useState([]);
  const [approximateCount, setApproximateCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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

  const [cursorHistory, setCursorHistory] = useState([null]);
  const [nextCursor, setNextCursor] = useState(null);

  // Reset pagination when search term or page size changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setCursorHistory([null]);
  }, [searchTerm, pagination.pageSize]);

  const fetchData = useCallback(() => {
    const currentCursor = cursorHistory[pagination.pageIndex];
    let url = `/api/appointments?search=${encodeURIComponent(searchTerm)}&limit=${pagination.pageSize}`;
    if (currentCursor) {
      url += `&cursor=${currentCursor}`;
    }

    setIsLoading(true);
    fetch(url)
      .then(res => res.json())
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
        console.error(err);
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

  const handlePrintToken = useCallback(async (appointment) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return; // In case of popup blockers

    let qrDataUrl = '';
    try {
      const patient = appointment.patient || {};
      const mrNumber = String(patient.mrNumber ?? appointment.mrNumber ?? 'N/A').trim() || 'N/A';
      const qrDataObj = {
        "MR Number": mrNumber,
        "Name": patient.name || 'N/A',
        "Father's Name": patient.fatherName || 'N/A',
        "Age": patient.age !== undefined && patient.age !== null ? String(patient.age) : 'N/A',
        "Phone": patient.phone || 'N/A'
      };
      qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrDataObj), { width: 100, margin: 1 });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }

    try {
      // Optimized HTML template for thermal receipt token printing.
      // Resetting @page margins, avoiding flexbox on body, and using page-break-inside: avoid
      // prevents multi-page splitting and reverse page ordering issues in Linux CUPS/zj-80 drivers.
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Print Token</title>
    <style>
        @page {
            margin: 0 !important;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            overflow: visible !important;
        }
        body {
            font-family: 'Calibri', system-ui, 'Segoe UI', Roboto, sans-serif;
            padding: 4mm 4mm 8mm 4mm !important;
            display: block !important; /* Avoids Flexbox page-break bugs in Linux print engines */
        }
        .receipt-canvas {
            width: 100%;
            max-width: 72mm;
            margin: 0 auto;
            text-align: center;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            /* Rotate 180deg to compensate for the bc-95AC thermal printer feeding
               paper in reverse order — first printed line exits at the top of the
               visible receipt. Rotating the content here makes it print correctly. */
            transform: rotate(180deg);
            transform-origin: center center;
        }
        .header-title { font-family: Georgia, serif; font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
        .sub-header { font-size: 11px; color: #444; margin-bottom: 12px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .token-container { margin: 5px 0 15px 0; padding: 10px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; page-break-inside: avoid !important; }
        .token-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
        .token-value { font-family: Georgia, serif; font-size: 48px; font-weight: 900; line-height: 1.1; margin: 4px 0; font-variant-numeric: lining-nums; }
        .meta-data { font-size: 11px; margin-top: 10px; }
        .info-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 15px; }
        .footer-notice { font-size: 10px; margin-top: 8px; font-weight: 600; }
        .qr-container { margin: 15px 0; page-break-inside: avoid !important; }
    </style>
</head>
<body>
    <div class="receipt-canvas" id="ticket">
        <div class="header-title">The Clinic and Zubaida Diagnostic</div>
        <div class="info-row" style="margin-top: 8px;">
            <span style="margin-left: 15px;">1783 Block 14 Federal B. Area</span>
            <span style="margin-right: 15px;">03353706680</span>
        </div>
        <div class="token-container">
            <div class="token-value">${appointment.tokenNumber || 'N/A'}</div>
            <div class="meta-data" style="margin-top: 5px;">${appointment.patient?.name || 'N/A'}</div>
        </div>
        ${qrDataUrl ? `
        <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" width="80" height="80" />
        </div>` : ''}
        <div style="display: inline-block; text-align: left; page-break-inside: avoid !important;">
            <div class="meta-data" style="margin-top: 4px;">
              MR: ${appointment.patient?.mrNumber || 'N/A'}
            </div>
            <div class="meta-data" style="margin-top: 4px;">
              Amount Paid: Rs. ${appointment.amountPaid || '0'}
            </div>
            <div class="meta-data" style="margin-top: 4px;">
              Date & Time: ${appointment.dateTime ? new Date(appointment.dateTime).toLocaleString() : ''}
            </div>
        </div>
    </div>
    <script>
        window.onload = function() { window.print(); window.close(); }
    </script>
</body>
</html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to print token:', err);
      printWindow.close();
    }
  }, []);

  useEffect(() => {
    if (initialToastMessage) {
      setToast({ open: true, message: initialToastMessage, severity: 'success' });
    }
    if (initialPrintRecord) {
      handlePrintToken(initialPrintRecord);
    }
    if (initialToastMessage || initialPrintRecord) {
      if (clearPending) clearPending();
    }
  }, [initialToastMessage, initialPrintRecord, clearPending, handlePrintToken]);

  const columns = useMemo(() => [
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Tooltip title="Print Token">
          <IconButton onClick={() => handlePrintToken(row.original)} color="primary" size="small">
            <PrintIcon />
          </IconButton>
        </Tooltip>
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
    manualPagination: true,
    pageCount: nextCursor ? pagination.pageIndex + 2 : pagination.pageIndex + 1,
  });

  if (showAddForm) {
    return <AddAppointmentRecord onBack={() => setShowAddForm(false)} onAdd={(newRecord, message) => {
      setShowAddForm(false);
      if (message) setToast({ open: true, message, severity: 'success' });
      fetchData();
      handlePrintToken(newRecord);
    }} />;
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <h2>Appointment Records</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          {isLoading && <CircularProgress size={24} sx={{ color: 'var(--text)' }} />}
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
