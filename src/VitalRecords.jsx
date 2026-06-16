import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddVitalRecord from './AddVitalRecord';
import logo from './assets/Glassmorphism Logo ZD.png';

export default function VitalRecords({ onLogout }) {
  const [data, setData] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    fetch('/api/vitals')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const columns = useMemo(() => [
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    { accessorKey: 'patient.name', header: 'Patient Name' },
    { accessorKey: 'weight', header: 'Weight (kg)' },
    { accessorKey: 'height', header: 'Height (cm)' },
    { accessorKey: 'notes', header: 'Notes' },
    {
      accessorKey: 'recordedAt',
      header: 'Recorded At',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Tooltip title="Delete">
          <IconButton color="error" onClick={() => handleDelete(row)}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  const table = useReactTable({
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

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
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
            <Button variant="contained" onClick={() => setShowAddForm(true)}>Add New Vital Record</Button>
            <Button variant="outlined" onClick={onLogout}>Logout</Button>
        </Box>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} style={{ borderBottom: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
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
                <td key={cell.id} style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
