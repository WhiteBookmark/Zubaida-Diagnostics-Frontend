import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Button,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Print as PrintIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  UnfoldMore as UnfoldMoreIcon,
} from '@mui/icons-material';
import { buildApiUrl } from '../../config/api';
import TodayToggle from '../common/TodayToggle';

export default function DiagnosticOrderRecords({
  onAddOrder,
  onEditOrder,
  initialToastMessage = null,
  clearPending = null,
  refreshKey,
}) {
  const searchInputRef = useRef(null);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTodayOnly, setIsTodayOnly] = useState(false);
  const [toast, setToast] = useState({
    open: Boolean(initialToastMessage),
    message: initialToastMessage || '',
    severity: 'success',
  });

  // Printing state per row
  const [printingId, setPrintingId] = useState(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination and cursor state
  const [isShowAll, setIsShowAll] = useState(() => localStorage.getItem('diagnosticOrdersShowAll') === 'true');
  const tableContainerRef = useRef(null);

  const [pagination, setPagination] = useState(() => {
    const savedSize = localStorage.getItem('diagnosticOrdersPageSize');
    return {
      pageIndex: 0,
      pageSize: savedSize ? Number(savedSize) : 25,
    };
  });

  const [cursorHistory, setCursorHistory] = useState([null]);
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialToastMessage) {
      setToast({ open: true, message: initialToastMessage, severity: 'success' });
      if (clearPending) clearPending();
    }
  }, [initialToastMessage, clearPending]);

  useEffect(() => {
    localStorage.setItem('diagnosticOrdersPageSize', String(pagination.pageSize));
  }, [pagination.pageSize]);

  useEffect(() => {
    localStorage.setItem('diagnosticOrdersShowAll', String(isShowAll));
  }, [isShowAll]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    setCursorHistory([null]);
  }, [searchTerm, isTodayOnly]);

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Fetch count
  const fetchTotalCount = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/api/diagnostic-orders/count/exact'));
      if (res.ok) {
        const json = await res.json();
        setTotalCount(json.count || 0);
      }
    } catch (e) {
      console.error('Error fetching total diagnostic orders count:', e);
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (isTodayOnly) {
        params.append('today', 'true');
      }
      if (isShowAll) {
        params.append('limit', 'all');
      } else {
        params.append('limit', String(pagination.pageSize));
        const currentCursor = cursorHistory[pagination.pageIndex];
        if (currentCursor) {
          params.append('cursor', currentCursor);
        }
      }

      const res = await fetch(buildApiUrl(`/api/diagnostic-orders?${params.toString()}`));
      if (res.ok) {
        const result = await res.json();
        setData(result.data || []);
        setNextCursor(result.nextCursor || null);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error('Error loading diagnostic orders:', err);
      setToast({ open: true, message: 'Failed To Load Diagnostic Orders.', severity: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, isTodayOnly, isShowAll, pagination.pageSize, pagination.pageIndex, cursorHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  useEffect(() => {
    fetchTotalCount();
  }, [fetchTotalCount, refreshKey]);

  // Print order handler
  const handlePrint = async (order) => {
    setPrintingId(order.id);
    try {
      const response = await fetch(buildApiUrl(`/api/diagnostic-orders/${order.id}/print`), {
        method: 'POST',
      });
      if (response.ok) {
        setToast({
          open: true,
          message: `Receipt For MR #${order.patient?.mrNumber || 'N/A'} Sent To Thermal Printer Successfully!`,
          severity: 'success',
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Server Printer Unavailable');
      }
    } catch (error) {
      console.error('Print failed:', error);
      setToast({
        open: true,
        message: error.message || 'Thermal Print Failed. Please Check Printer Connection.',
        severity: 'error',
      });
    } finally {
      setPrintingId(null);
    }
  };

  // Delete order handlers
  const handleOpenDelete = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(buildApiUrl(`/api/diagnostic-orders/${orderToDelete.id}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        setData((prev) => prev.filter((o) => o.id !== orderToDelete.id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        setToast({ open: true, message: 'Diagnostic Order Deleted Successfully.', severity: 'success' });
        handleCloseDelete();
      } else {
        const dataErr = await res.json().catch(() => ({}));
        throw new Error(dataErr.error || 'Failed To Delete Order');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ open: true, message: err.message || 'Delete Action Failed.', severity: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Define Columns
  const columns = useMemo(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        size: 130,
        cell: ({ row }) => {
          const item = row.original;
          const isPrinting = printingId === item.id;

          return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Tooltip title="Print Thermal Receipt" arrow>
                <span
                  onClick={() => handlePrint(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'hsla(217, 91%, 60%, 0.12)',
                    cursor: isPrinting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isPrinting) e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.12)';
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Print Thermal Receipt"
                >
                  {isPrinting ? (
                    <CircularProgress size={16} sx={{ color: 'hsl(217, 91%, 60%)' }} />
                  ) : (
                    <PrintIcon style={{ fontSize: '18px', color: 'hsl(217, 91%, 55%)' }} />
                  )}
                </span>
              </Tooltip>

              <Tooltip title="Edit Diagnostic Order" arrow>
                <span
                  onClick={() => onEditOrder && onEditOrder(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'hsla(142, 71%, 45%, 0.12)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'hsla(142, 71%, 45%, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'hsla(142, 71%, 45%, 0.12)';
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Edit Diagnostic Order"
                >
                  <EditIcon style={{ fontSize: '18px', color: 'hsl(142, 71%, 40%)' }} />
                </span>
              </Tooltip>

              <Tooltip title="Delete Diagnostic Order" arrow>
                <span
                  onClick={() => handleOpenDelete(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'hsla(0, 75%, 55%, 0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'hsla(0, 75%, 55%, 0.28)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'hsla(0, 75%, 55%, 0.15)';
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Delete Diagnostic Order"
                >
                  <DeleteIcon style={{ fontSize: '18px', color: 'hsl(0, 75%, 50%)' }} />
                </span>
              </Tooltip>
            </div>
          );
        },
      },
      {
        id: 'mrNumber',
        header: 'MR Number',
        accessorFn: (row) => row.patient?.mrNumber || '',
        size: 110,
        cell: ({ row }) => (
          <span style={{ fontWeight: 700, color: 'hsl(217, 91%, 50%)' }}>
            {row.original.patient?.mrNumber ?? 'N/A'}
          </span>
        ),
      },
      {
        id: 'patientName',
        header: 'Patient',
        accessorFn: (row) => row.patient?.name || '',
        size: 180,
        cell: ({ row }) => (
          <span style={{ fontWeight: 600, color: 'hsl(222, 47%, 11%)' }}>
            {row.original.patient?.name || 'N/A'}
          </span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        size: 120,
        cell: ({ getValue }) => {
          const cat = getValue();
          const badgeStyles = {
            'X-Ray': { bg: 'hsl(217, 85%, 45%)', text: 'hsl(0, 0%, 100%)' },
            Ultrasound: { bg: 'hsl(142, 70%, 35%)', text: 'hsl(0, 0%, 100%)' },
            PFT: { bg: 'hsl(280, 65%, 42%)', text: 'hsl(0, 0%, 100%)' },
            ECG: { bg: 'hsl(25, 90%, 42%)', text: 'hsl(0, 0%, 100%)' },
          };
          const style = badgeStyles[cat] || { bg: 'hsl(215, 25%, 40%)', text: 'hsl(0, 0%, 100%)' };
          return (
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                background: style.bg,
                color: style.text,
              }}
            >
              {cat}
            </span>
          );
        },
      },
      {
        id: 'type',
        header: 'Test',
        accessorKey: 'type',
        size: 200,
        cell: ({ getValue }) => <span style={{ fontWeight: 500 }}>{getValue()}</span>,
      },
      {
        id: 'charges',
        header: 'Charges',
        accessorKey: 'charges',
        size: 130,
        cell: ({ getValue }) => (
          <span style={{ fontWeight: 700, color: 'hsl(217, 91%, 50%)', fontVariantNumeric: 'tabular-nums' }}>
            Rs. {Number(getValue() || 0).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'side',
        header: 'Side',
        accessorKey: 'side',
        size: 90,
        cell: ({ getValue }) => (
          <span style={{ color: getValue() === 'N/A' ? 'hsl(215, 16%, 60%)' : 'hsl(222, 47%, 11%)' }}>
            {getValue() || 'N/A'}
          </span>
        ),
      },
      {
        id: 'view',
        header: 'View',
        accessorKey: 'view',
        size: 110,
        cell: ({ getValue }) => (
          <span style={{ color: getValue() === 'N/A' ? 'hsl(215, 16%, 60%)' : 'hsl(222, 47%, 11%)' }}>
            {getValue() || 'N/A'}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Date',
        accessorKey: 'createdAt',
        size: 180,
        cell: ({ getValue }) => {
          const val = getValue();
          if (!val) return 'N/A';
          return (
            <span style={{ fontSize: '13px', color: 'hsl(215, 19%, 35%)' }}>
              {new Date(val).toLocaleString()}
            </span>
          );
        },
      },
    ],
    [printingId, onEditOrder]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  return (
    <div style={{ margin: '0 20px 40px 20px', width: 'calc(100% - 40px)', boxSizing: 'border-box', minWidth: 0 }}>
      {/* Unified Single Card */}
      <div
        className="glass"
        style={{
          overflow: 'hidden',
          padding: 0,
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        {/* Section 1: Top Banner & Header */}
        <div
          style={{
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          <div>
            <h2 style={{ fontFamily: 'var(--heading), Georgia, serif', color: 'hsl(222, 47%, 11%)' }}>
              Diagnostic Orders
            </h2>
            <div style={{ fontSize: '14px', color: 'hsl(215, 16%, 47%)', marginTop: '4px' }}>
              {isShowAll ? (
                <span>Showing All <strong>{data.length.toLocaleString()}</strong> Records</span>
              ) : (
                <span>
                  Page <strong>{pagination.pageIndex + 1}</strong> of{' '}
                  <strong>{Math.max(1, Math.ceil(totalCount / pagination.pageSize))}</strong>
                  {' '}({totalCount.toLocaleString()} Records)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <TodayToggle
              isActive={isTodayOnly}
              onToggle={() => setIsTodayOnly(!isTodayOnly)}
              label="Today's Orders Only"
            />

            <Button
              variant="contained"
              onClick={onAddOrder}
              startIcon={<AddIcon />}
              sx={{
                borderRadius: '8px',
                background: 'hsl(217, 91%, 60%)',
                color: '#ffffff',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 14px hsla(217, 91%, 60%, 0.35)',
                '&:hover': {
                  background: 'hsl(217, 91%, 50%)',
                },
              }}
            >
              Add New Diagnostic Order
            </Button>
          </div>
        </div>

        {/* Section 2: Controls & Search */}
        <div
          style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            background: 'hsla(0, 0%, 100%, 0.15)',
            borderBottom: '1px solid var(--glass-border)',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '14px',
                transform: 'translateY(-50%)',
                color: 'hsl(215, 16%, 47%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon style={{ fontSize: '20px' }} />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 40px 11px 44px',
                borderRadius: '10px',
                border: '1px solid hsla(215, 25%, 80%, 0.6)',
                background: 'hsla(0, 0%, 100%, 0.85)',
                fontSize: '14px',
                color: 'hsl(222, 47%, 11%)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '12px',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'hsl(215, 16%, 47%)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Clear search"
              >
                <ClearIcon style={{ fontSize: '18px' }} />
              </button>
            )}
          </div>

          {/* Pagination controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'hsl(215, 19%, 35%)' }}>
              {isShowAll ? (
                <span>Showing All <strong>{data.length.toLocaleString()}</strong> Records</span>
              ) : (
                <span>
                  Page <strong>{pagination.pageIndex + 1}</strong> of{' '}
                  <strong>{Math.max(1, Math.ceil(totalCount / pagination.pageSize))}</strong>
                  {' '}({totalCount.toLocaleString()} Records)
                </span>
              )}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'hsl(215, 19%, 35%)' }}>
                Rows Per Page:
              </span>
              <Select
                size="small"
                value={isShowAll ? 'all' : pagination.pageSize}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setIsShowAll(true);
                  } else {
                    setIsShowAll(false);
                    setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), pageIndex: 0 }));
                  }
                }}
                sx={{
                  height: '36px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  background: 'hsla(0, 0%, 100%, 0.8)',
                }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value="all">Show All</MenuItem>
              </Select>
            </div>

            {!isShowAll && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={pagination.pageIndex === 0 || isLoading}
                  onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!nextCursor || isLoading}
                  onClick={() => {
                    setCursorHistory((prev) => {
                      const next = [...prev];
                      next[pagination.pageIndex + 1] = nextCursor;
                      return next;
                    });
                    setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
                  }}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Records Table */}
        <div ref={tableContainerRef} style={{ overflowX: 'auto', maxHeight: '650px', width: '100%', minWidth: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--bg, #f8fafc)' }}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} style={{ borderBottom: '2px solid var(--glass-border)' }}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        padding: '14px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'var(--text-h, #0f172a)',
                        fontFamily: 'var(--heading), Georgia, serif',
                        cursor: header.column.getCanSort() ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ArrowUpwardIcon style={{ fontSize: '14px' }} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ArrowDownwardIcon style={{ fontSize: '14px' }} />
                            ) : (
                              <UnfoldMoreIcon style={{ fontSize: '14px', opacity: 0.4 }} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <CircularProgress size={32} sx={{ color: 'hsl(217, 91%, 60%)' }} />
                      <span style={{ fontSize: '15px', color: 'hsl(215, 16%, 47%)' }}>
                        Loading Diagnostic Orders...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: '60px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'hsl(215, 19%, 35%)' }}>
                        No Diagnostic Orders Found
                      </span>
                      <span style={{ fontSize: '13px', color: 'hsl(215, 16%, 47%)' }}>
                        {searchTerm ? 'Try Adjusting Your Search Query.' : 'Click "Add New Diagnostic Order" To Create A Record.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={row.id}
                      style={{
                        background: isEven ? 'transparent' : 'hsla(215, 30%, 97%, 0.4)',
                        borderBottom: '1px solid hsla(215, 25%, 85%, 0.5)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'hsla(217, 91%, 60%, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isEven ? 'transparent' : 'hsla(215, 30%, 97%, 0.4)';
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{
                            padding: '12px 18px',
                            fontSize: '14px',
                            color: 'hsl(222, 47%, 11%)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'hsla(215, 30%, 94%, 0.6)',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: 'hsl(215, 19%, 35%)',
          }}
        >
          <span>
            {isShowAll ? (
              <span>Showing All <strong>{data.length.toLocaleString()}</strong> Records</span>
            ) : (
              <span>
                Page <strong>{pagination.pageIndex + 1}</strong> of{' '}
                <strong>{Math.max(1, Math.ceil(totalCount / pagination.pageSize))}</strong>
                {' '}({totalCount.toLocaleString()} Records)
              </span>
            )}
          </span>
          {isTodayOnly && (
            <span>
              Filter Active: <strong>Today&apos;s Records Only</strong>
            </span>
          )}
        </div>
      </div>

      {/* Custom Semantic Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        PaperProps={{
          className: 'glass',
          style: {
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            transition: 'none',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'var(--heading), Georgia, serif',
            color: 'hsl(0, 75%, 45%)',
            fontWeight: 700,
          }}
        >
          Delete Diagnostic Order
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'hsl(222, 47%, 11%)', fontSize: '15px' }}>
            Are You Sure You Want To Delete The Diagnostic Order For{' '}
            <strong>
              {orderToDelete?.patient?.name || 'Unknown Patient'} (MR #{orderToDelete?.patient?.mrNumber || 'N/A'})
            </strong>
            ? This Action Cannot Be Undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: '12px 16px', gap: '8px' }}>
          <Button
            onClick={handleCloseDelete}
            disabled={isDeleting}
            sx={{
              color: 'hsl(215, 19%, 35%)',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={isDeleting}
            sx={{
              background: 'hsl(0, 75%, 50%)',
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              padding: '6px 18px',
              '&:hover': { background: 'hsl(0, 75%, 40%)' },
            }}
          >
            {isDeleting ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : 'Delete Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        transitionDuration={0}
        TransitionProps={{ timeout: 0 }}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%', borderRadius: '8px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
