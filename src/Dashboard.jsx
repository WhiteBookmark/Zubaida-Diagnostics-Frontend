import { useState, useCallback, useMemo } from 'react';
import {
  MaterialReactTable,
  useMaterialReactTable,
} from 'material-react-table';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPatient from './AddPatient';
import logo from './assets/Glassmorphism Logo ZD.png';

export default function Dashboard({ onLogout, onEdit, data = [], setData, searchTerm, setSearchTerm }) {
  const [showAddForm, setShowAddForm] = useState(false);

  const columns = useMemo(
    () => [
      { accessorKey: 'mrNumber', header: 'MR Number', size: 120 },
      { accessorKey: 'name', header: 'Name', size: 150 },
      { accessorKey: 'fatherName', header: "Father's Name", size: 150 },
      { accessorKey: 'motherName', header: "Mother's Name", size: 150 },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        size: 130,
        Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A'
      },
      { accessorKey: 'age', header: 'Age', size: 80 },
      { accessorKey: 'address', header: 'Address', size: 180 },
      { accessorKey: 'phone', header: 'Phone', size: 130 },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        size: 160,
        Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleString() : 'N/A'
      },
      {
        accessorKey: 'scans',
        header: 'Scans',
        size: 160,
        Cell: ({ cell }) => Array.isArray(cell.getValue()) ? cell.getValue().join(', ') : (cell.getValue() ?? '')
      },
    ],
    []
  );

  // Memoize callbacks so MRT does not see new references on every parent render
  const handleShowAdd = useCallback(() => setShowAddForm(true), []);
  const handleHideAdd = useCallback(() => setShowAddForm(false), []);

  const handleAdd = useCallback((newRecord) => {
    setData(prev => [...prev, newRecord]);
    setShowAddForm(false);
  }, [setData]);

  const handleDelete = useCallback(async (row) => {
    if (window.confirm('Are you sure you want to delete this patient record?')) {
      try {
        const response = await fetch(`/api/patients/${row.original.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setData(prev => prev.filter(item => item.id !== row.original.id));
        } else {
          alert('Failed to delete record');
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record');
      }
    }
  }, [setData]);

  const renderRowActions = useCallback(({ row }) => (
    <Box sx={{ display: 'flex', gap: '1px' }}>
      <Tooltip title="Edit">
        <IconButton onClick={() => onEdit(row.original)}>
          <EditIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton
          color="error"
          onClick={() => handleDelete(row)}
        >
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    </Box>
  ), [onEdit, handleDelete]);

  const renderTopToolbarCustomActions = useCallback(() => (
    <Box sx={{ display: 'flex', gap: '16px', padding: '8px' }}>
      <Button variant="contained" onClick={handleShowAdd}>
        Add New Patient Record
      </Button>
      <Button variant="outlined" onClick={onLogout}>Logout</Button>
    </Box>
  ), [handleShowAdd, onLogout]);

  const table = useMaterialReactTable({
    columns,
    data,
    // Global filter is handled client-side by MRT — no network call per keystroke
    enableGlobalFilter: true,
    state: {
      globalFilter: searchTerm,
    },
    onGlobalFilterChange: setSearchTerm,
    // Keep sorting/filtering/pagination entirely in the browser
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
    // Disable features that are heavy and unused
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enableHiding: false,
    renderRowActions,
    renderTopToolbarCustomActions,
    positionActionsColumn: 'last',
    enableRowActions: true,
    // Pagination keeps DOM node count low
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    // Memoize row virtual rendering — reduces DOM thrashing on sort
    enableRowVirtualization: data.length > 50,
    muiTableContainerProps: {
      sx: { maxHeight: '70vh' },
    },
  });

  if (showAddForm) {
    return (
      <AddPatient
        onBack={handleHideAdd}
        onAdd={handleAdd}
      />
    );
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="Zubaida Diagnostics Logo" style={{ height: '50px' }} />
          <h2>Dashboard</h2>
        </div>
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}
