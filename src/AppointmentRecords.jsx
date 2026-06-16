import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button } from '@mui/material';
import AddAppointmentRecord from './AddAppointmentRecord';
import logo from './assets/Glassmorphism Logo ZD.png';

export default function AppointmentRecords({ onLogout }) {
  const [data, setData] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);

  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const columns = useMemo(() => [
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    { accessorKey: 'patient.name', header: 'Patient Name' },
    {
      accessorKey: 'dateTime',
      header: 'Date/Time',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
    },
    { accessorKey: 'reason', header: 'Reason' },
    { accessorKey: 'tokenNumber', header: 'Token' },
    { accessorKey: 'amountPaid', header: 'Paid (Rs)' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'notes', header: 'Notes' },
  ], []);

  const table = useReactTable({
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (showAddForm) {
    return <AddAppointmentRecord onBack={() => setShowAddForm(false)} onAdd={(newRecord) => {
      setShowAddForm(false);
      fetch('/api/appointments').then(res => res.json()).then(setData);
    }} />;
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <h2>Appointment Records</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
          <Button variant="contained" onClick={() => setShowAddForm(true)}>Add New Appointment</Button>
          <Button variant="outlined" onClick={onLogout}>Logout</Button>
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
    </div>
  );
}
