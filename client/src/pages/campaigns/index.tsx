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
import CustomTabPanel, { a11yProps } from '../../components/CustomTabPanel';

const CampaignsIcon = loadable(() => import('../../icons/CampaignsIcon'));
const CampaignsTable = loadable(() => import('./CampaignsTable'));
const Tabs = loadable(() => import('@mui/material/Tabs'));
const Tab = loadable(() => import('@mui/material/Tab'));

const Campaigns = (): React.ReactElement => {
  const [tabParentValue, setTabParentValue] = useState(0);
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

  const handleTapParentChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabParentValue(newValue);
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
        <div className="mt-6">
          <Tabs
            value={tabParentValue}
            onChange={handleTapParentChange}
            aria-label="scheduler parent tabs"
            className="app-tabs app-parent-tabs"
            classes={{
              indicator: 'app-tabs-indicator-disable',
            }}
          >
            <Tab label="Sequences" sx={{ width: 150 }} {...a11yProps(0)} />
            <Tab label="Emails" sx={{ width: 150 }} {...a11yProps(1)} />
          </Tabs>
        </div>
        <div className="w-full h-[calc(100%-72px)] bg-white p-8">
          <CustomTabPanel value={tabParentValue} index={0}>
            <CampaignsTable data={data} />
          </CustomTabPanel>
          <CustomTabPanel value={tabParentValue} index={1}>
            Coming Soon
          </CustomTabPanel>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
