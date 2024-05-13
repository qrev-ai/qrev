'use strict';

import { useEffect, useRef, useState } from 'react';
import { alpha, styled } from '@mui/material/styles';
import { DataGrid, GridColDef, GridValidRowModel, gridClasses } from '@mui/x-data-grid';
import CSVReader from 'react-csv-reader';

const ODD_OPACITY = 0.2;

const StripedDataGrid = styled(DataGrid)(({ theme }) => ({
  [`& .${gridClasses.row}.even`]: {
    backgroundColor: theme.palette.grey[200],
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, ODD_OPACITY),
      '@media (hover: none)': {
        backgroundColor: 'transparent',
      },
    },
    '&.Mui-selected': {
      backgroundColor: alpha(
        theme.palette.primary.main,
        ODD_OPACITY + theme.palette.action.selectedOpacity,
      ),
      '&:hover': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          ODD_OPACITY + theme.palette.action.selectedOpacity + theme.palette.action.hoverOpacity,
        ),
        // Reset on touch devices, it doesn't add specificity
        '@media (hover: none)': {
          backgroundColor: alpha(
            theme.palette.primary.main,
            ODD_OPACITY + theme.palette.action.selectedOpacity,
          ),
        },
      },
    },
  },
}));

function getRowData() {
  const rowData = [];
  for (let i = 0; i < 10; i++) {
    rowData.push({
      id: i,
      name: `Name - ${i}`,
      email: `example-${i}.com`,
      title: `Title - ${i}`,
      company: `Company - ${i}`,
      linkedinUrl: `linkedin.com/${i}`,
      lastContacted: `04-04-2024 - ${i}`,
      decisionMaking: `Low`,
    });
  }
  return rowData;
}

const initialColumns = [
  {
    field: 'name',
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['Name - 1', 'Name - 2', 'Name - 3'],
    },
  },
  { field: 'email' },
  { field: 'title' },
  { field: 'company' },
  {
    headerName: 'LinkedIn URL',
    field: 'linkedinUrl',
    suppressNavigable: true,
    minWidth: 200,
  },
  {
    headerName: 'Last Contacted',
    field: 'lastContacted',
    suppressNavigable: true,
    minWidth: 200,
  },
  {
    headerName: 'Decision Making',
    field: 'decisionMaking',
    suppressNavigable: true,
    minWidth: 200,
  },
];

const PeopleTable = ({ peoples }: { peoples: any }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const csvRef = useRef<any>(null);
  const [rowData, setRowData] = useState<any[]>(getRowData());
  const [columnDefs, setColumnDefs] = useState<GridColDef[]>(initialColumns);
  // const defaultColDef = useMemo<ColDef>(() => {
  //   return {
  //     flex: 1,
  //     editable: true,
  //     cellDataType: false,
  //     sortable: true,
  //     filter: true,
  //     resizable: true,
  //   };
  // }, []);

  useEffect(() => {
    if (peoples?.[0]) {
      const headers = Object.keys(peoples?.[0]);
      const columnDefs = headers?.map((i: string) => ({ headerName: i, field: i.toLowerCase() }));
      setColumnDefs(columnDefs);
      setRowData(peoples);
    }
  }, [peoples]);

  // const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
  //   console.log('onCellValueChanged: ' + event.colDef.field + ' = ' + event.newValue);
  // }, []);

  // const onRowValueChanged = useCallback((event: RowValueChangedEvent) => {
  //   const data = event.data;
  //   console.log(data);
  // }, []);

  const handleFileLoaded = (data: any) => {
    if (data?.length <= 1) return;

    const header = data?.[0];
    const columnDefs = header?.map((i: string) => ({ headerName: i, field: i.toLowerCase() }));
    setColumnDefs(columnDefs);

    data.shift();
    const rowData = data.map((item: any) =>
      item?.reduce((acc: any, element: any, index: number) => {
        const key = header?.[index]?.toLowerCase();
        acc[key] = element;
        return acc;
      }, {}),
    );
    setRowData(rowData);
  };

  return (
    <div className="flex flex-col h-[calc(100%-160px)] bg-white p-8">
      <div className="flex items-center justify-end mb-4">
        <CSVReader ref={csvRef} cssClass="hidden" onFileLoaded={(data) => handleFileLoaded(data)} />
        <button
          className="border border-[#2F4858] py-1 px-2 rounded text-sm"
          onClick={() => csvRef?.current?.click()}
        >
          Import from CSV
        </button>
      </div>
      {/* <div style={gridStyle} className={'ag-theme-alpine'}>
        <AgGridReact
          ref={gridRef}
          animateRows
          deltaSort
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          editType={'fullRow'}
          onCellValueChanged={onCellValueChanged}
          onRowValueChanged={onRowValueChanged}
        /> */}

      <div style={{ height: '100%', width: '100%' }}>
        <StripedDataGrid
          ref={gridRef}
          rows={rowData}
          columns={columnDefs}
          checkboxSelection
          disableRowSelectionOnClick
          pagination
          getRowId={getRowId}
          getRowClassName={(params) =>
            params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
          }
        />
      </div>
    </div>
  );
};

const getRowId = (rowData: GridValidRowModel) => rowData.name;

export default PeopleTable;
