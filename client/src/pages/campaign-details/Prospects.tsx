'use strict';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CampaignProspectsResponse } from '../../models/campaigns';

import { AgGridReact } from '@ag-grid-community/react';
import '@ag-grid-community/styles/ag-grid.css';
import '@ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef } from '@ag-grid-community/core';

import { ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ExcelExportModule } from '@ag-grid-enterprise/excel-export';
ModuleRegistry.registerModules([ClientSideRowModelModule, ExcelExportModule]);

const ChipComponent = ({ value }: { value: string }) => (
  <span className="rounded-full px-2 py-1 bg-[#e8e0e8] text-xs">{value}</span>
);
const RenderComponent = ({ value }: { value: string }) => <span>{value}</span>;

interface ProspectsTableProps {
  data?: CampaignProspectsResponse;
}

const ProspectsTable = ({ data }: ProspectsTableProps): React.ReactElement => {
  const gridRef = useRef<AgGridReact>(null);
  const csvRef = useRef<any>(null);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const [rowData, setRowData] = useState<any[]>();
  const [columnDefs, setColumnDefs] = useState<ColDef[]>();
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
    if (data?.headers) {
      const keys = Object.keys(data.headers);
      const values = Object.values(data.headers);
      const columnDefs = values
        ?.sort((a, b) => (a.order > b.order ? 1 : -1))
        ?.map((item, index) => ({
          field: keys[index],
          headerName: item.label,
          hide: item.hidden,
          cellRenderer: (params: { data: any }) =>
            item.type === 'chip' ? (
              <ChipComponent value={params?.data?.[keys[index]]} />
            ) : (
              <RenderComponent value={params?.data?.[keys[index]]} />
            ),
        }));
      setColumnDefs(columnDefs);
    }

    if (data?.data) {
      setRowData(data.data);
    }
  }, [data]);

  const exportCSV = () => {
    gridRef?.current?.api?.exportDataAsExcel({ fileName: 'Campaign Details Prospects' });
  };

  return (
    <div className="flex flex-col h-[calc(100%-160px)] bg-white">
      <div className="flex items-center justify-end mb-4">
        <button className="border border-[#2F4858] py-1 px-2 rounded text-sm" onClick={exportCSV}>
          Export CSV
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
        />
      </div>
    </div>
  );
};

export default ProspectsTable;
