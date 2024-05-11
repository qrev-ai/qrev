'use strict';

import { useEffect, useMemo, useRef, useState } from 'react';
import { alpha, styled } from '@mui/material/styles';
import { DataGrid, GridRowsProp, GridColDef, gridClasses } from '@mui/x-data-grid';
import { CampaignProspectsResponse } from '../../models/campaigns';
import React from 'react';

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

const ChipComponent = ({ value }: { value: string }) => (
  <span className="rounded-full px-2 py-1 bg-[#e8e0e8] text-xs">{value}</span>
);
const RenderComponent = ({ value }: { value: string }) => <span>{value}</span>;

interface ProspectsTableProps {
  data?: CampaignProspectsResponse;
}

const ProspectsTable = ({ data }: ProspectsTableProps): React.ReactElement => {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const [rowData, setRowData] = useState<GridRowsProp[]>([]);
  const [columnDefs, setColumnDefs] = useState<GridColDef[]>([]);

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
    const csvData = rowData.map((row) => {
      return columnDefs.map((colDef: GridColDef<any>) => {
        const value = row[colDef.field as unknown as number];
        return value ? value.toString() : '';
      });
    });

    const csvContent = [columnDefs.map((colDef) => colDef.headerName), ...csvData]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'Campaign Details Prospects.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100%-160px)] bg-white">
      <div className="flex items-center justify-end mb-4">
        <button className="border border-[#2F4858] py-1 px-2 rounded text-sm" onClick={exportCSV}>
          Export CSV
        </button>
      </div>
      <div style={gridStyle} className={'ag-theme-alpine'}>
        <StripedDataGrid
          ref={gridRef}
          rows={rowData}
          editMode={'row'}
          columns={columnDefs} // Ensure columnDefs is always defined and of type 'GridColDef<any>[]'
          checkboxSelection
          disableRowSelectionOnClick
          pagination
          getRowClassName={(params) =>
            params.indexRelativeToCurrentPage % 2 === 0 ? 'even' : 'odd'
          }
        />
      </div>
    </div>
  );
};

export default ProspectsTable;
