import { useState, useEffect, useCallback, useMemo } from 'react';
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { Box, Button, Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddVitalRecord from './AddVitalRecord';
import logo from './assets/Glassmorphism Logo ZD.png';

export default function VitalRecords({ onLogout }) {
  const [data, setData] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch('/api/vitals')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const columns = useMemo(() => [
    { accessorKey: 'patient.mrNumber', header: 'MR Number', size: 120 },
    { accessorKey: 'patient.name', header: 'Patient Name', size: 150 },
    { accessorKey: 'weight', header: 'Weight (kg)', size: 100 },
    { accessorKey: 'height', header: 'Height (cm)', size: 100 },
    { accessorKey: 'notes', header: 'Notes', size: 200 },
    {
      accessorKey: 'recordedAt',
      header: 'Recorded At',
      size: 160,
      Cell: ({ cell }) => cell.getValue() ? new Date(cell.getValue()).toLocaleString() : 'N/A'
    },
  ], []);

  const handleDelete = useCallback(async (row) => {
    if (window.confirm('Are you sure you want to delete this vital record?')) {
      try {
        const response = await fetch(`/api/vitals/${row.original.id}`, { method: 'DELETE' });
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
  }, []);

  const table = useMaterialReactTable({
    columns,
    data,
    renderRowActions: ({ row }) => (
      <Tooltip title="Delete">
        <IconButton color="error" onClick={() => handleDelete(row)}>
          <DeleteIcon />
        </IconButton>
      </Tooltip>
    ),
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: 'flex', gap: '16px', padding: '8px' }}>
        <Button variant="contained" onClick={() => setShowAddForm(true)}>Add New Vital Record</Button>
        <Button variant="outlined" onClick={onLogout}>Logout</Button>
      </Box>
    ),
    enableRowActions: true,
    positionActionsColumn: 'last',
  });

  if (showAddForm) {
    return <AddVitalRecord onBack={() => setShowAddForm(false)} onAdd={(newRecord) => {
        setShowAddForm(false);
        fetch('/api/vitals').then(res => res.json()).then(setData);
    }} />;
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <img src={logo} alt="Zubaida Diagnostics Logo" style={{ height: '50px' }} />
        <h2>Vital Records</h2>
      </div>
      <MaterialReactTable table={table} />
    </div>
  );
}
