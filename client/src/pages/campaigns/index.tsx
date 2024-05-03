import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { cloneDeep } from 'lodash';
import { StoreParams } from '../../models/store';
import { setStoreLoading } from '../../store/actions';
import { getVisitorCampaignsViews } from '../../utils/api-campaign';
import { ViewCampaignsResponseParams, CampaignTableRowParams } from '../../models/campaigns';
import loadable from '@loadable/component';
import { trackError } from '../../utils/analytics';
import '../../styles/insights.scss';
import SearchIcon from '../../icons/SearchIcon';

const CampaignsIcon = loadable(() => import('../../icons/CampaignsIcon'));
const CampaignsTable = loadable(() => import('./CampaignsTable'));

const Campaigns = (): React.ReactElement => {
  const dispatch = useDispatch();
  const initCallRef = useRef(false);

  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');
  const [data, setTableData] = useState<CampaignTableRowParams[]>([]);

  useEffect(() => {
    if (initCallRef.current) return;

    fetchTableData();
  }, []);

  useEffect(() => {
    if (accountId && initCallRef.current) {
      fetchTableData();
    }
  }, [accountId]);

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const fetchTableData = () => {
    setLoading(true);
    getVisitorCampaignsViews(accountId)
      .then((res: ViewCampaignsResponseParams) => {
        if (res.success) {
          setTableData(cloneDeep(res.result));
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'Campaigns',
          type: 'view_Campaigns',
        });
      })
      .finally(() => {
        setLoading(false);
        initCallRef.current = true;
      });
  };

  return (
    <div className="insights">
      <div className="insights--container">
        <div className="flex items-center gap-3 ml-8">
          <span className="border w-12 h-12 flex items-center justify-center rounded-md border-[#303232]">
            <CampaignsIcon width="32px" fill="#303232" />
          </span>
          <span className="text-xl font-bold">Campaigns</span>
        </div>
        <div className="insights--body">
          <div className="insights-body-head">
            <p className="text-xl font-semibold text-[#787d7d]">{data.length} campaigns</p>
            <div className="w-[200px] h-[38px] flex items-center rounded border border-[#787d7d] p-1 gap-2">
              <SearchIcon width="28px" />
              <input className="w-full h-full outline-none" />
            </div>
          </div>
          <div className="insights-body-table">
            <CampaignsTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
