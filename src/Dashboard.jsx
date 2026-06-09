import { useState, useEffect } from 'react';
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
    columnHelper.accessor('phone', { header: 'Phone' }),
    columnHelper.accessor('email', { header: 'Email' }),
    columnHelper.accessor('bloodGroup', { header: 'Blood Group' }),
    columnHelper.accessor('weight', { header: 'Weight (kg)' }),
    columnHelper.accessor('height', { header: 'Height (cm)' }),
    columnHelper.accessor('smoker', { header: 'Smoker', cell: info => info.getValue() ? 'Yes' : 'No' }),
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
            Delete
          </button>
        </>
      ),
    }),
  ];
  const [showAddForm, setShowAddForm] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(localStorage.getItem('pageSize') || 10),
  });

  useEffect(() => {
    localStorage.setItem('pageSize', pagination.pageSize);
  }, [pagination.pageSize]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
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

      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </button>
        <select
          value={table.getState().pagination.pageSize}
          onChange={e => {
            table.setPageSize(Number(e.target.value))
          }}
        >
          {[10, 25, 50, 100].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
        <span>Total Records: {table.getFilteredRowModel().rows.length}</span>
      </div>
    </div>
  );
}
