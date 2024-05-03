import { useEffect, useState } from 'react';

import { Tab, Tabs } from '@mui/material';
import CustomTabPanel, { a11yProps } from '../../components/CustomTabPanel';
import { BsDatabaseFillGear } from 'react-icons/bs';
import PeopleTable from './PeopleTable';
import CompaniesTable from './CompaniesTable';
import { getAllPeoples } from '../../utils/api-crm';
import { useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';

const CRMPage = () => {
  const [tabParentValue, setTabParentValue] = useState(0);
  const [peoples, setPeoples] = useState<any>(null);
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');

  useEffect(() => {
    // fetchConversations();
    fetchAllPeoples();
  }, []);

  // const fetchConversations = async () => {
  //   const campaign = window.localStorage.getItem('qrev-campaign');
  //   if (campaign) {
  //     setPeoples(JSON.parse(campaign));
  //   }
  // };

  const fetchAllPeoples = async () => {
    const res = await getAllPeoples(accountId);
    if (res) {
      setPeoples(res.result);
    }
  };

  const handleTapParentChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabParentValue(newValue);
  };

  return (
    <div className="w-full h-full">
      <div className="flex items-center gap-3 p-8">
        <span className="border w-12 h-12 flex items-center justify-center rounded-md border-[#303232]">
          <BsDatabaseFillGear size={32} color="#303232" />
        </span>
        <span className="text-xl font-bold">CRM</span>
      </div>
      <div>
        <Tabs
          value={tabParentValue}
          onChange={handleTapParentChange}
          aria-label="crm parent tabs"
          className="app-tabs app-parent-tabs"
          classes={{
            indicator: 'app-tabs-indicator-disable',
          }}
        >
          <Tab label="People" sx={{ width: 150 }} {...a11yProps(0)} />
          <Tab label="Companies" sx={{ width: 150 }} {...a11yProps(1)} />
        </Tabs>
      </div>
      <CustomTabPanel value={tabParentValue} index={0}>
        <PeopleTable peoples={peoples} />
      </CustomTabPanel>
      <CustomTabPanel value={tabParentValue} index={1}>
        <CompaniesTable />
      </CustomTabPanel>
    </div>
  );
};

export default CRMPage;
