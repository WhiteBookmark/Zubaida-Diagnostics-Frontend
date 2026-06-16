import { useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPatient from './AddPatient';
import logo from './assets/Glassmorphism Logo ZD.png';

export default function Dashboard({ onLogout, onEdit, data = [], setData, searchTerm, setSearchTerm }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      { accessorKey: 'mrNumber', header: 'MR Number' },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'fatherName', header: "Father's Name" },
      { accessorKey: 'motherName', header: "Mother's Name" },
      {
        accessorKey: 'dateOfBirth',
        header: 'Date of Birth',
        cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : 'N/A'
      },
      { accessorKey: 'age', header: 'Age' },
      { accessorKey: 'address', header: 'Address' },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'createdAt',
        header: 'Created At',
        cell: info => info.getValue() ? new Date(info.getValue()).toLocaleString() : 'N/A'
      },
      {
        accessorKey: 'scans',
        header: 'Scans',
        cell: info => Array.isArray(info.getValue()) ? info.getValue().join(', ') : (info.getValue() ?? '')
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
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
        ),
      },
    ],
    [onEdit]
  );

  const table = useReactTable({
    columns,
    data,
    state: {
      globalFilter: searchTerm,
      sorting,
    },
    onGlobalFilterChange: setSearchTerm,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

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

  if (showAddForm) {
    return (
      <AddPatient
        onBack={handleHideAdd}
        onAdd={handleAdd}
      />
    );
  }

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '0 20px' }}>
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <Box sx={{ display: 'flex', gap: '16px' }}>
          <Button variant="contained" onClick={handleShowAdd}>
            Add New Patient Record
          </Button>
          <Button variant="outlined" onClick={onLogout}>Logout</Button>
        </Box>
      </div>
      <div style={{ overflowX: 'auto' }}>
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
    </div>
  );
}
