import React from 'react';
import { List, ListItemButton } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { StoreParams } from '../models/store';
import loadable from '@loadable/component';
import { setShowSwitchAccounts } from '../store/actions';
import agentLogo from '../assets/images/agent-logo2.png';
import { useDevContext } from '../hooks/contexts/DevContext';
import CampaignsIcon from '../icons/CampaignsIcon';
import { BsDatabaseFillGear } from 'react-icons/bs';

const LogoIcon = loadable(() => import('../icons/LogoIcon'));
const SignOutIcon = loadable(() => import('../icons/SignOutIcon'));
const AppsIcon = loadable(() => import('../icons/AppsIcon'));
const SettingIcon = loadable(() => import('../icons/SettingIcon'));
const AccountsIcon = loadable(() => import('../icons/AccountsIcon'));

interface LeftDrawerProps {
  onLogout: () => void;
}

const LeftDrawer = ({ onLogout }: LeftDrawerProps): React.ReactElement => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const dispatch = useDispatch();

  const config = useSelector((state: StoreParams) => state.config);
  const activeRouting = useSelector((state: StoreParams) => state.data.activeRouting || '');
  const { isDev } = useDevContext();

  return (
    <div className="app-left-drawer">
      <div className="app-left-drawer-container">
        <div className="app-left-drawer-logo">
          <LogoIcon />
        </div>

        <List className="app-left-drawer-list">
          {isDev && (
            <ListItemButton
              key={0}
              selected={currentPath === '/'}
              onClick={() => {
                navigate('/');
              }}
              className="app-left-drawer-listitem"
            >
              <div>
                <img src={agentLogo} alt="AI agent logo" />
              </div>
            </ListItemButton>
          )}

          {isDev && (
            <ListItemButton
              key={4}
              selected={currentPath.includes('/campaigns')}
              onClick={() => {
                navigate('/campaigns');
              }}
              className="app-left-drawer-listitem"
            >
              <div>
                <CampaignsIcon
                  width="24px"
                  fill={
                    config.theme === 'dark'
                      ? '#D4D4D6'
                      : currentPath === '/campaigns'
                        ? '#ddeb18'
                        : '#ffffff'
                  }
                />
              </div>
            </ListItemButton>
          )}

          {isDev && (
            <ListItemButton
              key={5}
              selected={currentPath.includes('/crm')}
              onClick={() => {
                navigate('/crm');
              }}
              className="app-left-drawer-listitem"
            >
              <div>
                <BsDatabaseFillGear
                  size={24}
                  color={
                    config.theme === 'dark'
                      ? '#D4D4D6'
                      : currentPath === '/crm'
                        ? '#ddeb18'
                        : '#ffffff'
                  }
                />
              </div>
            </ListItemButton>
          )}

          <ListItemButton
            key={7}
            selected={currentPath === '/apps'}
            onClick={() => {
              navigate('/apps');
            }}
            className="app-left-drawer-listitem"
          >
            <div>
              <AppsIcon
                width="24px"
                fill={
                  config.theme === 'dark'
                    ? '#D4D4D6'
                    : currentPath === '/apps'
                      ? '#ddeb18'
                      : '#ffffff'
                }
              />
            </div>
          </ListItemButton>
        </List>

        <List className="app-left-drawer-list" style={{ marginTop: 'auto' }}>
          <ListItemButton
            key={8}
            selected={config.showSwitchAccounts}
            onClick={(e) => {
              e.preventDefault();
              if (
                ((currentPath === '/openlink/create' ||
                  currentPath === '/robinlink/create' ||
                  currentPath === '/collectivelink/create') &&
                  location.search) ||
                (currentPath === '/scheduler' && activeRouting)
              ) {
                return;
              } else {
                dispatch(setShowSwitchAccounts(true));
              }
            }}
            className="app-left-drawer-listitem"
          >
            <div>
              <AccountsIcon
                width="24px"
                fill={
                  config.theme === 'dark'
                    ? '#D4D4D6'
                    : config.showSwitchAccounts
                      ? '#ddeb18'
                      : '#ffffff'
                }
              />
            </div>
          </ListItemButton>

          <ListItemButton
            key={9}
            selected={currentPath === '/settings'}
            onClick={() => {
              navigate('/settings');
            }}
            className="app-left-drawer-listitem"
          >
            <div>
              <SettingIcon
                width="24px"
                fill={
                  config.theme === 'dark'
                    ? '#D4D4D6'
                    : currentPath === '/settings'
                      ? '#ddeb18'
                      : '#ffffff'
                }
                color={
                  config.theme === 'dark'
                    ? '#D4D4D6'
                    : currentPath === '/settings'
                      ? '#ddeb18'
                      : '#ffffff'
                }
              />
            </div>
          </ListItemButton>
        </List>

        <div className="app-left-drawer-logout" onClick={onLogout}>
          <SignOutIcon width="24px" fill={config.theme === 'dark' ? '#D4D4D6' : '#ffffff'} />
        </div>
      </div>
    </div>
  );
};

export default LeftDrawer;
