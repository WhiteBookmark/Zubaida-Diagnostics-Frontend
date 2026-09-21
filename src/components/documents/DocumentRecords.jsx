import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Button, Tooltip, IconButton, TextField, InputAdornment, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar, Alert, Select, MenuItem, CircularProgress, Portal } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { buildApiUrl } from '../../config/api';
import TodayToggle from '../common/TodayToggle';

export default function DocumentRecords({ onAddDocument, onEditDocument, initialToastMessage, clearPending, refreshKey, onViewFiles }) {
  const searchInputRef = useRef(null); // Added ref for search input
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayOnly, setIsTodayOnly] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [isShowAll, setIsShowAll] = useState(() => localStorage.getItem('documentRecordsShowAll') === 'true');
  const tableContainerRef = useRef(null);

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
    localStorage.setItem('documentRecordsShowAll', isShowAll);
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
      endpoint = `/api/documents?search=${encodeURIComponent(searchTerm)}&limit=all`;
      if (isTodayOnly) {
        endpoint += '&today=true';
      }
    } else {
      const currentCursor = cursorHistory[pagination.pageIndex];
      endpoint = `/api/documents?search=${encodeURIComponent(searchTerm)}&limit=${pagination.pageSize}`;
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
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
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
        console.error('Error fetching documents:', err);
        setIsLoading(false);
      });

    // Fetch exact count separately
    fetch(buildApiUrl('/api/documents/count/exact'))
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch count');
        return res.json();
      })
      .then(countResult => {
        if (countResult && typeof countResult.count === 'number') {
          setTotalCount(countResult.count);
        }
      })
      .catch(err => console.error('Error fetching exact document count:', err));
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
        <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View Document">
            <IconButton color="primary" onClick={() => handleOpenDocument(row)}>
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Document">
            <IconButton color="primary" onClick={() => onEditDocument && onEditDocument(row.original)}>
              <EditIcon />
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
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(221, 83%, 53%) 100%)',
                    color: '#ffffff',
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', lineHeight: 1 }}>IMG</span>
                </Box>
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
  ], [handleDeleteClick, handleOpenDocument, onEditDocument]);

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
          <td>{item.firstRow.original?.patient?.name || 'N/A'}</td>
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

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px 20px 40px 20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0px' }}>
        <h2>Documents</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          {isLoading && <CircularProgress size={24} sx={{ color: 'var(--text)' }} />}
          <TodayToggle
            isActive={isTodayOnly}
            onToggle={() => setIsTodayOnly(prev => !prev)}
            label="Today's Documents"
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
