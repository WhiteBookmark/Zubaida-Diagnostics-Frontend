import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { mockData } from './mockData';
import AddPatient from './AddPatient';

const columnHelper = createColumnHelper();

export default function Dashboard({ onLogout, onEdit, data = [], setData }) {
  const columns = [
    columnHelper.accessor('mrNumber', { header: 'MR Number' }),
    columnHelper.accessor('name', { header: 'Name' }),
    columnHelper.accessor('fatherName', { header: 'Father Name' }),
    columnHelper.accessor('motherName', { header: 'Mother Name' }),
    columnHelper.accessor('dob', { header: 'Date of Birth' }),
    columnHelper.accessor('age', { header: 'Age' }),
    columnHelper.accessor('address', { header: 'Address' }),
    columnHelper.accessor('scans', {
    header: 'Scans',
    cell: info => Array.isArray(info.getValue()) ? info.getValue().join(', ') : info.getValue()
  }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <>
          <button onClick={() => onEdit(row.original)} style={{ marginRight: '5px' }}>Edit</button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this patient record?')) {
                setData(prevData => prevData.filter(item => item.mrNumber !== row.original.mrNumber));
              }
            }}
          >
            Delete
          </button>
        </>
      ),
    }),
  ];
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
    <div className="dashboard">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2>Dashboard</h2>
        <div>
          <button onClick={() => setShowAddForm(true)} style={{ marginRight: '1rem' }}>Add New Patient Record</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <input
        value={globalFilter ?? ''}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Search all columns..."
      />

      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: ' 🔼', desc: ' 🔽' }[header.column.getIsSorted()] ?? null}
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

      <div style={{ marginTop: '1rem' }}>
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </button>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </button>
      </div>
    </div>
  );
}
