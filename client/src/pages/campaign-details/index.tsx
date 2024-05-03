import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { cloneDeep } from 'lodash';
import { Link } from 'react-router-dom';
import loadable from '@loadable/component';

import { StoreParams } from '../../models/store';
import { setStoreLoading } from '../../store/actions';
import { getCampaignsMeetings, getCampaignsOverview } from '../../utils/api-campaign';
import {
  CampaignDetailsResponseParams,
  CampaignDetailsParams,
  CampaignOverviewResponse,
} from '../../models/campaigns';
import CustomTabPanel, { a11yProps } from '../../components/CustomTabPanel';
import { trackError } from '../../utils/analytics';
import '../../styles/insights.scss';
import Overview from './Overview';

const CampaignsIcon = loadable(() => import('../../icons/CampaignsIcon'));
// const MeetingsTable = loadable(() => import('./Meetings'));
const Tabs = loadable(() => import('@mui/material/Tabs'));
const Tab = loadable(() => import('@mui/material/Tab'));

const CampaignDetails = (): React.ReactElement => {
  const dispatch = useDispatch();
  const initCallRef = useRef(false);
  const [tabParentValue, setTabParentValue] = useState(0);
  const queryParams = new URLSearchParams(location.search);
  const sequenceId = queryParams.get('id');
  const sequenceName = queryParams.get('name');

  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');
  const [data, setTableData] = useState<CampaignDetailsParams[]>([]);
  const [overviewData, setOverview] = useState<CampaignOverviewResponse>();

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
    getCampaignsMeetings(accountId, sequenceId)
      .then((res: CampaignDetailsResponseParams) => {
        if (res.success) {
          setTableData(cloneDeep(res.result));
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'Campaigns Details',
          type: 'view_Campaigns_Details',
        });
      })
      .finally(() => {
        setLoading(false);
        initCallRef.current = true;
      });

    getCampaignsOverview(accountId, sequenceId)
      .then((res: any) => {
        if (res.success) {
          setOverview(cloneDeep(res.result));
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'Campaigns Details',
          type: 'view_Campaigns_Details',
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
    <div className="h-full w-full overflow-hidden">
      <div className="h-full w-full relative py-6">
        <div className="flex items-center gap-3 ml-8">
          <span className="border w-12 h-12 flex items-center justify-center rounded-md border-[#303232]">
            <CampaignsIcon width="32px" fill="#303232" />
          </span>
          <span className="text-xl font-bold">Campaigns</span>
        </div>
        <div className="m-9 mb-4 text-xs gap-2 flex items-center">
          <Link to="/campaigns" className="text-sm font-bold hover:underline hover:text-[#264DAF]">
            Campaigns
          </Link>
          {`>`}
          <span className="text-sm font-bold">{sequenceName}</span>
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
            <Tab label="Overview" sx={{ width: 150 }} {...a11yProps(0)} />
            {/* <Tab label="Prospects" sx={{ width: 150 }} {...a11yProps(1)} /> */}
            {/* <Tab label="Meetings" sx={{ width: 150 }} {...a11yProps(2)} /> */}
          </Tabs>
        </div>
        <div className="w-full h-[calc(100%-72px)] bg-white py-12 px-8">
          <CustomTabPanel value={tabParentValue} index={0}>
            <Overview data={overviewData} />
          </CustomTabPanel>
          {/* <CustomTabPanel value={tabParentValue} index={1}>
            Prospects
          </CustomTabPanel>
          <CustomTabPanel value={tabParentValue} index={2}>
            <MeetingsTable data={data} />
          </CustomTabPanel> */}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetails;
