import { useState, useEffect, useMemo } from 'react';
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
  const columns = useMemo(
    () => [
      { accessorKey: 'mrNumber', header: 'MR Number' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'fatherName', header: 'Father\'s Name' },
      { accessorKey: 'motherName', header: 'Mother\'s Name' },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleDateString() : 'N/A'
      },
      { accessorKey: 'age', header: 'Age' },
      { accessorKey: 'address', header: 'Address' },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleString() : 'N/A'
      },
      {
        accessorKey: 'scans',
        header: 'Scans',
        Cell: ({ cell }) => Array.isArray(cell.getValue()) ? cell.getValue().join(', ') : cell.getValue()
      },
    ],
    []
  );

  const [showAddForm, setShowAddForm] = useState(false);

  const table = useMaterialReactTable({
    columns,
    data,
    enableGlobalFilter: true,
    state: {
      globalFilter: searchTerm,
    },
    onGlobalFilterChange: setSearchTerm,
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: '1px' }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => onEdit(row.original)}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            color="error"
            onClick={async () => {
              if (window.confirm('Are you sure you want to delete this patient record?')) {
                try {
                  const response = await fetch(`/api/patients/${row.original.id}`, {
                    method: 'DELETE',
                  });
                  if (response.ok) {
                    setData(prevData => prevData.filter(item => item.id !== row.original.id));
                  } else {
                    alert('Failed to delete record');
                  }
                } catch (error) {
                  console.error('Error deleting record:', error);
                  alert('Error deleting record');
                }
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: '16px', padding: '8px' }}>
        <Button variant="contained" onClick={() => setShowAddForm(true)}>
          Add New Patient Record
        </Button>
        <Button variant="outlined" onClick={onLogout}>Logout</Button>
      </Box>
    ),
    positionActionsColumn: 'last',
    enableRowActions: true,
  });

  if (showAddForm) {
    return (
      <AddPatient
        onBack={() => setShowAddForm(false)}
        onAdd={(newRecord) => {
          setData([...data, newRecord]);
          setShowAddForm(false);
        }}
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
