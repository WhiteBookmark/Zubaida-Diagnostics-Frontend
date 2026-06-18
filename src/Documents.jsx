import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Box, Button, Tooltip, IconButton, TextField, InputAdornment } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export default function Documents({ onAddDocument }) {
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(() => {
    fetch(`/api/documents?search=${encodeURIComponent(searchTerm)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(setData)
      .catch(err => console.error('Error fetching documents:', err));
  }, [searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
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
        <Box sx={{ display: 'flex', gap: '16px', marginLeft: 'auto', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
               background: 'rgba(255, 255, 255, 0.1)',
               borderRadius: '8px',
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
