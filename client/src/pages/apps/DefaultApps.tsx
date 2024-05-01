import React, { useState } from 'react';
import { SUBSCRIBED_APPS, getAppBtnActionLabel, getAppButtonType } from './const';
import { SubscribedType } from '../../models/apps';
import { useNavigate } from 'react-router-dom';
import loadable from '@loadable/component';
import '../../styles/apps.scss';

const AppIcon = loadable(() => import('./AppIcon'));
const HubspotConnect = loadable(() => import('./integrations/hubspot/HubspotConnect'));
const ZoomConnect = loadable(() => import('./integrations/zoom/ZoomConnect'));
const AppsIcon = loadable(() => import('../../icons/AppsIcon'));
const CustomButton = loadable(() => import('../../components/CustomButton'));
const CustomSearch = loadable(() => import('../../components/CustomSearch'));

const DefaultApps: React.FC = () => {
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');

  const onSelectSubscribed = (type: SubscribedType) => {
    switch (type) {
      case 'campaigns': {
        navigate('/campaigns');
        break;
      }

      case 'crm': {
        navigate('/crm');
        break;
      }

      default: {
        break;
      }
    }
  };

  return (
    <div className="desktop-apps">
      <div className="desktop-apps--container">
        <h2>
          <span className="apps-icon">
            <AppsIcon width="32px" fill="#303232" />
          </span>
          QRev App Store
        </h2>

        <div className="desktop-app-search">
          <CustomSearch
            value={searchValue}
            setValue={setSearchValue}
            fill={searchValue ? '#303232' : '#c9cbcb'}
          />
        </div>

        <div className="desktop-apps--scrollable no-scrollbar">
          <p className="desktop-label">Applications</p>

          <div className="desktop-grid-view">
            {SUBSCRIBED_APPS.map((item, index) => (
              <div className="desktop-app-btn" key={`app-subscribed-${index}-${item.type}`}>
                <div className="desktop-app-logo-contents">
                  <AppIcon type={item.type} fill="#DDEB18" />
                </div>

                <div className="desktop-app-action-button">
                  <CustomButton
                    label={getAppBtnActionLabel({
                      isLaunch: item.isLaunch,
                      isBuyNow: item.isBuyNow,
                      isCommingSoon: item.isCommingSoon,
                      isUpgrade: item.isUpgrade,
                    })}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectSubscribed(item.type);
                    }}
                    type={getAppButtonType({
                      isLaunch: item.isLaunch,
                      isBuyNow: item.isBuyNow,
                      isCommingSoon: item.isCommingSoon,
                      isUpgrade: item.isUpgrade,
                    })}
                  />
                </div>

                <div className="desktop-app-contents">
                  <p className="desktop-app-title">{item.name}</p>
                  <p className="desktop-app-description">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="desktop-label">Integrations</p>

          <div className="desktop-integrations">
            <HubspotConnect />
            <ZoomConnect />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DefaultApps;
