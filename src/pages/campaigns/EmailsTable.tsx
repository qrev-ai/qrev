'use strict';

import { useEffect, useMemo, useRef, useState } from 'react';
import { alpha, styled } from '@mui/material/styles';
import moment from 'moment';
import { CampaignEmailsType } from '../../models/campaigns';
import { DataGrid, GridColDef, GridValidRowModel, gridClasses } from '@mui/x-data-grid';
import React from 'react';
import { emailsMockData } from './dummy';

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

interface EmailsTableProps {
  data?: CampaignEmailsType;
}

const DetailCellRenderer = (props: any) => {
  const id = props?.data?._id;
  const data: any = emailsMockData?.result?.data?.find((item) => item._id === id);

  if (!data) return <div className="flex items-center justify-center">No details</div>;

  return (
    <div className="p-8">
      <p className="font-bold text-base mb-4">{data?.message?.subject}</p>
      <p dangerouslySetInnerHTML={{ __html: data.message?.body }} />
    </div>
  );
};

const EmailsTable = ({ data }: EmailsTableProps): React.ReactElement => {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const [rowData, setRowData] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<GridColDef[]>([]);

  useEffect(() => {
    if (data?.headers) {
      const keys = Object.keys(data.headers)?.filter((item) => item !== 'message');
      const values = Object.values(data.headers)?.filter((item) => item.type !== 'draft');
      const columnDefs = values
        ?.sort((a, b) => (a.order > b.order ? 1 : -1))
        ?.map((item, index) => ({
          field: keys[index],
          headerName: item.label,
          hide: item.hidden,
          cellRenderer:
            index === 1
              ? 'agGroupCellRenderer'
              : (params: { data: any }) =>
                  item.type === 'chip' ? (
                    <ChipComponent value={params?.data?.[keys[index]]} />
                  ) : (
                    <RenderComponent value={params?.data?.[keys[index]]} />
                  ),
        }));
      setColumnDefs(columnDefs);
    }

    if (data?.data) {
      const rowData = data.data?.map((item) => {
        const { message, ...rest } = item;
        return {
          ...rest,
          created_on: moment(new Date(item.created_on)).format('DD/MM/YYYY, h:mm a'),
          scheduled_time: moment(new Date(item.scheduled_time)).format('DD/MM/YYYY, h:mm a'),
        };
      });
      setRowData(rowData);
    }
  }, [data]);

  const exportCSV = () => {
    const csvData =
      rowData?.map((row) => {
        return columnDefs?.map((colDef: GridColDef<any>) => {
          const value = row[colDef.field as unknown as number];
          return value ? value.toString() : '';
        });
      }) ?? [];

    const csvContent = [columnDefs?.map((colDef) => colDef.headerName), ...csvData]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'Campaign Details Emails.csv');
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
          columns={columnDefs}
          editMode={'row'}
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

const getRowId = (rowData: GridValidRowModel) => rowData.id;

export default EmailsTable;
