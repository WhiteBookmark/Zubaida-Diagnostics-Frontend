import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, Tooltip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

export default function Documents({ onLogout, onAddDocument }) {
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);

  const fetchData = useCallback(() => {
    fetch('/api/documents')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setData)
      .catch(err => console.error('Error fetching documents:', err));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const populateRandomData = async () => {
      try {
          const response = await fetch('/api/documents/populate', { method: 'POST' });
          if (response.ok) {
              fetchData();
          } else {
              alert('Failed to populate random data');
          }
      } catch (error) {
          console.error('Error populating data:', error);
          alert('Error populating data');
      }
  };

  const columns = useMemo(() => [
    { accessorKey: 'patient.mrNumber', header: 'MR Number' },
    { accessorKey: 'patient.name', header: 'Patient Name' },
    { accessorKey: 'type', header: 'Document Type' },
    { accessorKey: 'filePath', header: 'File Path' },
    { accessorKey: 'notes', header: 'Notes' },
    {
      accessorKey: 'uploadedAt',
      header: 'Uploaded At',
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
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await fetch(`/api/documents/${row.original.id}`, { method: 'DELETE' });
        if (response.ok) {
          setData(prev => prev.filter(item => item.id !== row.original.id));
        } else {
          alert('Failed to delete document');
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Error deleting document');
      }
    }
  }, []);

  return (
    <div className="dashboard glass" style={{ padding: '20px', margin: '20px' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
        <h2>Documents</h2>
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto' }}>
            <Button variant="contained" onClick={onAddDocument}>Add New Document</Button>
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
