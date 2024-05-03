'use strict';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from '@ag-grid-community/react';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  CellValueChangedEvent,
  ColDef,
  ModuleRegistry,
  RowValueChangedEvent,
} from '@ag-grid-community/core';
import CSVReader from 'react-csv-reader';

ModuleRegistry.registerModules([ClientSideRowModelModule]);

function getRowData() {
  const rowData = [];
  for (let i = 0; i < 10; i++) {
    rowData.push({
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
  const gridRef = useRef<AgGridReact>(null);
  const csvRef = useRef<any>(null);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const [rowData, setRowData] = useState<any[]>(getRowData());
  const [columnDefs, setColumnDefs] = useState<ColDef[]>(initialColumns);
  const defaultColDef = useMemo<ColDef>(() => {
    return {
      flex: 1,
      editable: true,
      cellDataType: false,
      sortable: true,
      filter: true,
      resizable: true,
    };
  }, []);

  useEffect(() => {
    if (peoples) {
      const headers = Object.keys(peoples?.[0]);
      const columnDefs = headers?.map((i: string) => ({ headerName: i, field: i.toLowerCase() }));
      setColumnDefs(columnDefs);
      setRowData(peoples);
    }
  }, [peoples]);

  const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
    console.log('onCellValueChanged: ' + event.colDef.field + ' = ' + event.newValue);
  }, []);

  const onRowValueChanged = useCallback((event: RowValueChangedEvent) => {
    const data = event.data;
    console.log(data);
  }, []);

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
      <div style={gridStyle} className={'ag-theme-alpine'}>
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
        />
      </div>
    </div>
  );
};

export default PeopleTable;
