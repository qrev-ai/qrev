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
      name: `Qrev - ${i}`,
      website: `example-${i}.com`,
      location: `USA - ${i}`,
      size: `1 - 10 - ${i}`,
      revenues: `10 - 100 - ${i}`,
      funding: `$10k - ${i}`,
    });
  }
  return rowData;
}

const initialColumns = [
  {
    field: 'name',
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: {
      values: ['Qrev - 1', 'Qrev - 2', 'Qrev - 3'],
    },
  },
  { field: 'website' },
  { field: 'location' },
  { field: 'size' },
  { field: 'revenues' },
  { field: 'funding' },
];

const CompaniesTable = ({ campaign }: { campaign?: any }) => {
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
    if (campaign) {
      const headers = Object.keys(campaign?.values?.[0]);
      const columnDefs = headers?.map((i: string) => ({ headerName: i, field: i.toLowerCase() }));
      setColumnDefs(columnDefs);
      setRowData(campaign?.values);
    }
  }, [campaign]);

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

export default CompaniesTable;
