import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Button, IconButton, TextField, InputAdornment, Select, MenuItem, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Snackbar, Alert } from '@mui/material';
import AddAppointmentRecord from './AddAppointmentRecord';
import QRCode from 'qrcode';
import { buildApiUrl } from '../../config/api';
import TodayToggle from '../common/TodayToggle';
import { PatientAlertBadge } from '../../utils/patientAlerts';

export default function AppointmentRecords({ initialPrintRecord = null, initialToastMessage = null, clearPending = null, refreshKey, onViewFiles }) {
  const searchInputRef = useRef(null); // Added ref for search input
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayOnly, setIsTodayOnly] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Added state for editing appointment records
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Focus search box automatically when page/component opens
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const [isShowAll, setIsShowAll] = useState(() => localStorage.getItem('appointmentRecordsShowAll') === 'true');
  const tableContainerRef = useRef(null);

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

  useEffect(() => {
    localStorage.setItem('appointmentRecordsShowAll', isShowAll);
  }, [isShowAll]);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleSaveEdit = async () => {
    if (!recordToEdit) return;
    const parsedAmount = parseFloat(editAmountPaid);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setToast({ open: true, message: 'Please enter a valid positive amount.', severity: 'error' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(buildApiUrl(`/api/appointments/${recordToEdit.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: parsedAmount,
          isFinalized: true, // Flag prevents future editing
          isEdited: true
        })
      });

      if (response.ok) {
        const updatedRecord = await response.json();
        setData(prev => prev.map(item => item.id === updatedRecord.id ? { ...updatedRecord, isFinalized: true, isEdited: true } : item));
        setToast({ open: true, message: 'Amount paid updated and record finalized successfully!', severity: 'success' });
        setEditDialogOpen(false);
        setRecordToEdit(null);
      } else {
        const err = await response.json();
        setToast({ open: true, message: `Update failed: ${err.error || 'Unknown error'}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      setToast({ open: true, message: 'Server connection error during update.', severity: 'error' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [cursorHistory, setCursorHistory] = useState([null]);
  const [nextCursor, setNextCursor] = useState(null);

  // Reset pagination when search term or page size changes
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
      endpoint = `/api/appointments?search=${encodeURIComponent(searchTerm)}&limit=all`;
      if (isTodayOnly) {
        endpoint += '&today=true';
      }
    } else {
      const currentCursor = cursorHistory[pagination.pageIndex];
      endpoint = `/api/appointments?search=${encodeURIComponent(searchTerm)}&limit=${pagination.pageSize}`;
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
    fetch(buildApiUrl('/api/appointments/count/exact'))
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch count');
        return res.json();
      })
      .then(countResult => {
        if (countResult && typeof countResult.count === 'number') {
          setTotalCount(countResult.count);
        }
      })
      .catch(err => console.error('Error fetching exact appointment count:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, pagination.pageIndex, pagination.pageSize, refreshKey, isTodayOnly, isShowAll]);

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
        "Phone": patient.phone || 'N/A',
        "GUID": appointment.guid || appointment.id || appointment._id || 'N/A'
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
            ${appointment.patient?.phone ? `
            <div class="meta-data" style="margin-top: 4px;">
              Phone: ${appointment.patient.phone}
            </div>` : ''}
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

  const isLinux = typeof window !== 'undefined' && /Linux|X11/i.test(navigator.userAgent);
  const isWindows = typeof window !== 'undefined' && /Win/i.test(navigator.userAgent);

  const clearPendingRef = useRef(clearPending);
  useEffect(() => {
    clearPendingRef.current = clearPending;
  }, [clearPending]);

  useEffect(() => {
    if (initialToastMessage) {
      setToast({ open: true, message: initialToastMessage, severity: 'success' });
    }
    // Only open the browser print dialog if the OS is Windows
    if (initialPrintRecord && isWindows) {
      handlePrintToken(initialPrintRecord);
    }
    if (initialToastMessage || initialPrintRecord) {
      if (typeof clearPendingRef.current === 'function') {
        clearPendingRef.current();
      }
    }
  }, [initialToastMessage, initialPrintRecord, isWindows, handlePrintToken]);

  const handlePrintTokenServer = useCallback(async (appointment) => {
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/print`, { method: 'POST' });
      const result = await res.json();
      if (res.ok && result.success) {
        setToast({ open: true, message: `Token ${appointment.tokenNumber} printed on server!`, severity: 'success' });
      } else {
        setToast({ open: true, message: `Server print failed: ${result.error || 'Unknown error'}`, severity: 'error' });
      }
    } catch (err) {
      console.error('Failed to trigger server print:', err);
      setToast({ open: true, message: 'Server print error: ' + err.message, severity: 'error' });
    }
  }, []);

  const columns = useMemo(() => [
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const isFinalized = row.original.isFinalized || row.original.isEdited;
        return (
          <Box sx={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title={isFinalized ? "Record Finalized (Amount Locked)" : "Edit Amount Paid"}>
              <span>
                <IconButton
                  onClick={() => {
                    setRecordToEdit(row.original);
                    setEditAmountPaid(row.original.amountPaid ?? '');
                    setEditDialogOpen(true);
                  }}
                  color="primary"
                  size="small"
                  disabled={isFinalized}
                >
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Print Token (Server Thermal Printer)">
              <IconButton onClick={() => handlePrintTokenServer(row.original)} color="secondary" size="small">
                <PrintIcon />
              </IconButton>
            </Tooltip>
            {!isLinux && (
              <Tooltip title="Print Token (Browser Print Dialog)">
                <IconButton onClick={() => handlePrintToken(row.original)} color="primary" size="small">
                  <PrintIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      }
    },
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    {
      accessorKey: 'patient.name',
      header: 'Patient Name',
      cell: ({ row }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {row.original.patient?.name || 'N/A'}
          <PatientAlertBadge patient={row.original.patient} />
        </span>
      ),
    },
    {
      accessorKey: 'dateTime',
      header: 'Date/Time',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
    },
    {
      accessorKey: 'tokenNumber',
      header: 'Token',
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.tokenNumber ?? 0;
        const b = rowB.original.tokenNumber ?? 0;
        return a - b;
      }
    },
    { accessorKey: 'amountPaid', header: 'Paid (Rs)' }
  ], [handlePrintToken, handlePrintTokenServer, isLinux]);

  const table = useReactTable({
    columns,
    data,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalCount > 0 ? Math.ceil(totalCount / pagination.pageSize) : (nextCursor ? pagination.pageIndex + 2 : pagination.pageIndex + 1),
  });

  const rows = table.getRowModel().rows;

  const [expandedMrNumbers, setExpandedMrNumbers] = useState(new Set());

  // Reset expanded groups when data changes
  useEffect(() => {
    setExpandedMrNumbers(new Set());
  }, [data]);

  const toggleMrGroup = useCallback((mrNumber) => {
    setExpandedMrNumbers(prev => {
      const next = new Set(prev);
      if (next.has(mrNumber)) {
        next.delete(mrNumber);
      } else {
        next.add(mrNumber);
      }
      return next;
    });
  }, []);

  const groupedData = useMemo(() => {
    const groups = new Map();

    for (const row of rows) {
      const mrNumber = row.original?.patient?.mrNumber || 'UNKNOWN';
      if (!groups.has(mrNumber)) {
        groups.set(mrNumber, { mrNumber, rows: [], firstRow: row });
      }
      groups.get(mrNumber).rows.push(row);
    }

    const result = [];
    for (const [mrNumber, group] of groups) {
      const isExpanded = expandedMrNumbers.has(mrNumber);
      const isSingleRecord = group.rows.length === 1;

      if (isSingleRecord) {
        result.push({ type: 'single', row: group.rows[0], mrNumber });
      } else {
        result.push({
          type: 'group-header',
          mrNumber,
          recordCount: group.rows.length,
          firstRow: group.firstRow,
          isExpanded,
        });
        if (isExpanded) {
          for (const row of group.rows) {
            result.push({ type: 'child', row, mrNumber });
          }
        }
      }
    }
    return result;
  }, [rows, expandedMrNumbers]);

  const hasGroups = useMemo(() => {
    return groupedData.some(item => item.type === 'group-header');
  }, [groupedData]);

  const allGroupMrNumbers = useMemo(() => {
    const set = new Set();
    for (const item of groupedData) {
      if (item.type === 'group-header') {
        set.add(item.mrNumber);
      }
    }
    return set;
  }, [groupedData]);

  const isAllExpanded = allGroupMrNumbers.size > 0 && expandedMrNumbers.size >= allGroupMrNumbers.size;

  const handleToggleAll = useCallback(() => {
    if (isAllExpanded) {
      setExpandedMrNumbers(new Set());
    } else {
      setExpandedMrNumbers(new Set(allGroupMrNumbers));
    }
  }, [isAllExpanded, allGroupMrNumbers]);

  const renderRowItem = (item) => {
    if (!item) return null;

    if (item.type === 'single') {
      const row = item.row;
      return (
        <tr key={row.id} onClick={() => onViewFiles && onViewFiles(row.original?.patient?.mrNumber)} style={{ cursor: 'pointer' }}>
          {row.getVisibleCells().map(cell => (
            <td key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      );
    }

    if (item.type === 'group-header') {
      return (
        <tr
          key={`group-${item.mrNumber}`}
          onClick={() => toggleMrGroup(item.mrNumber)}
          style={{
            cursor: 'pointer',
            backgroundColor: 'hsla(217, 91%, 60%, 0.08)',
          }}
        >
          <td>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMrGroup(item.mrNumber);
                }}
                sx={{ color: 'hsl(217, 91%, 50%)' }}
                aria-label={item.isExpanded ? "Collapse group" : "Expand group"}
              >
                {item.isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
              </IconButton>
            </Box>
          </td>
          <td>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontWeight: 600 }}>{item.mrNumber}</span>
              <Box
                component="span"
                sx={{
                  backgroundColor: 'hsl(217, 91%, 35%)',
                  color: 'hsl(0, 0%, 100%)',
                  borderRadius: '10px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1.2,
                }}
              >
                {item.recordCount} Records
              </Box>
            </Box>
          </td>
          <td>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {item.firstRow.original?.patient?.name || 'N/A'}
              <PatientAlertBadge patient={item.firstRow.original?.patient} />
            </span>
          </td>
          <td style={{ color: 'var(--text)', opacity: 0.6 }}>—</td>
          <td style={{ color: 'var(--text)', opacity: 0.6 }}>—</td>
          <td style={{ color: 'var(--text)', opacity: 0.6 }}>—</td>
        </tr>
      );
    }

    if (item.type === 'child') {
      const row = item.row;
      return (
        <tr
          key={row.id}
          onClick={() => onViewFiles && onViewFiles(row.original?.patient?.mrNumber)}
          style={{
            cursor: 'pointer',
            backgroundColor: 'hsla(217, 91%, 60%, 0.04)',
          }}
        >
          {row.getVisibleCells().map(cell => (
            <td key={cell.id} style={{ borderBottom: '1px solid hsla(217, 91%, 60%, 0.08)' }}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      );
    }

    return null;
  };

  const virtualizer = useVirtualizer({
    count: groupedData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 15,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;

  if (showAddForm) {
    return <AddAppointmentRecord onBack={() => setShowAddForm(false)} onAdd={(newRecord, message, shouldPrintBrowser = true) => {
      setShowAddForm(false);
      if (message) setToast({ open: true, message, severity: 'success' });
      fetchData();
      if (shouldPrintBrowser && isWindows) {
        handlePrintToken(newRecord);
      }
    }} />;
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0px' }}>
        <h2>Appointment Records</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          {isLoading && <CircularProgress size={24} sx={{ color: 'var(--text)' }} />}
          <TodayToggle
            isActive={isTodayOnly}
            onToggle={() => setIsTodayOnly(prev => !prev)}
            label="Today's Appointments"
          />
          {hasGroups && (
            <Tooltip title={isAllExpanded ? "Collapse All Groups" : "Expand All Groups"}>
              <IconButton
                onClick={handleToggleAll}
                size="small"
                sx={{
                  backgroundColor: 'hsla(217, 91%, 60%, 0.1)',
                  color: 'var(--text)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  '&:hover': {
                    backgroundColor: 'hsla(217, 91%, 60%, 0.2)',
                  }
                }}
                aria-label={isAllExpanded ? "Collapse all groups" : "Expand all groups"}
              >
                {isAllExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
              </IconButton>
            </Tooltip>
          )}
          <TextField
            autoFocus
            inputRef={searchInputRef}
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
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px`, padding: 0, border: 'none' }} colSpan={columns.length} />
                </tr>
              )}
              {virtualRows.map(virtualRow => renderRowItem(groupedData[virtualRow.index]))}
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
              {groupedData.map(item => renderRowItem(item))}
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

      {/* One-Time Edit Modal Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !isSavingEdit && setEditDialogOpen(false)}
        PaperProps={{
          className: 'glass',
          style: { padding: '20px', borderRadius: '16px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', minWidth: '350px' }
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-h)', fontWeight: 'bold', px: 1 }}>Edit Appointment Record</DialogTitle>
        <DialogContent sx={{ px: 1, py: 2 }}>
          <DialogContentText sx={{ color: 'var(--text)', mb: 2, fontSize: '14px' }}>
            You are editing the amount paid for MR Number <strong>{recordToEdit?.patient?.mrNumber || recordToEdit?.mrNumber}</strong>.
            <br /><br />
          </DialogContentText>
          <TextField
            autoFocus
            label="Amount Paid (Rs)"
            type="number"
            fullWidth
            variant="outlined"
            value={editAmountPaid}
            onChange={(e) => setEditAmountPaid(e.target.value)}
            disabled={isSavingEdit}
            inputProps={{ min: 0, step: "0.01" }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                background: 'rgba(255, 255, 255, 0.4)',
                borderRadius: '8px',
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 1, pt: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSavingEdit} sx={{ color: 'var(--text)' }}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={isSavingEdit} sx={{ fontWeight: 'bold' }}>
            {isSavingEdit ? 'Finalizing...' : 'Save & Finalize'}
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
