import React, { useEffect, useState } from 'react';
import { a11yProps } from '../../components/CustomTabPanel';
import loadable from '@loadable/component';
import '../../styles/settings.scss';
import { useSearchParams } from 'react-router-dom';
import { tabQuery } from './const';

const SettingIcon = loadable(() => import('../../icons/SettingIcon'));
const Tabs = loadable(() => import('@mui/material/Tabs'));
const Tab = loadable(() => import('@mui/material/Tab'));
const Box = loadable(() => import('@mui/material/Box'));
const CustomTabPanel = loadable(() => import('../../components/CustomTabPanel'));
const MyProfile = loadable(() => import('./MyProfile'));
const Account = loadable(() => import('./Account'));
const MyConfiguration = loadable(() => import('./MyConfiguration'));
const UsersTeams = loadable(() => import('./UsersTeams'));
const SettingsCampaign = loadable(() => import('./Campaign'));

const Settings = (): React.ReactElement => {
  const [tabParentValue, setTabParentValue] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tabName = searchParams.get('tab');
    const tabId = !tabName ? 0 : Object.values(tabQuery).indexOf(tabName);
    setTabParentValue(tabId);
  }, []);

  const handleTapParentChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabParentValue(newValue);
    setSearchParams({ tab: tabQuery[newValue] });
    setTabValue(0);
  };

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <div className="settings">
      <h2>
        <span className="settings-icon">
          <SettingIcon width="32px" fill="#303232" color="#303232" />
        </span>
        Settings
      </h2>

      <div className="settings-parent-tabs-box">
        <Tabs
          value={tabParentValue}
          onChange={handleTapParentChange}
          aria-label="settings parent tabs"
          className="app-tabs app-parent-tabs"
          classes={{
            indicator: 'app-tabs-indicator-disable',
          }}
        >
          <Tab label="My Settings" {...a11yProps(0)} />
          <Tab label="Users & Teams" {...a11yProps(2)} />
        </Tabs>
      </div>

      <div className="settings-parent-tabs-container">
        <CustomTabPanel value={tabParentValue} index={0}>
          <div className="settings-tab-box">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleChange}
                aria-label="basic tabs example"
                className="app-tabs"
                classes={{
                  indicator: 'app-tabs-indicator-disable',
                }}
              >
                <Tab label="My Profile" {...a11yProps(0)} />
                <Tab label="Account" {...a11yProps(1)} />
                <Tab label="My Configuration" {...a11yProps(2)} />
              </Tabs>
            </Box>

            <div className="settings-tabpanel">
              <CustomTabPanel value={tabValue} index={0}>
                <MyProfile />
              </CustomTabPanel>

              <CustomTabPanel value={tabValue} index={1}>
                <Account />
              </CustomTabPanel>

              <CustomTabPanel value={tabValue} index={2}>
                <MyConfiguration />
              </CustomTabPanel>
            </div>
          </div>
        </CustomTabPanel>

        <CustomTabPanel value={tabParentValue} index={1}>
          <div className="settings-tab-box">
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleChange}
                aria-label="basic tabs example"
                className="app-tabs"
                classes={{
                  indicator: 'app-tabs-indicator-disable',
                }}
              >
                <Tab label="Users" {...a11yProps(0)} />
                <Tab label="Teams" {...a11yProps(1)} />
                <Tab label="Campaign" {...a11yProps(2)} />
              </Tabs>
            </Box>

            <div className="settings-tabpanel">
              <CustomTabPanel value={tabValue} index={0}>
                <UsersTeams type="user" />
              </CustomTabPanel>

              <CustomTabPanel value={tabValue} index={1}>
                <UsersTeams type="team" />
              </CustomTabPanel>

              <CustomTabPanel value={tabValue} index={2}>
                <SettingsCampaign />
              </CustomTabPanel>
            </div>
          </div>
        </CustomTabPanel>
      </div>
    </div>
  );
};

export default Settings;
