import React, { MouseEvent, useEffect, useRef } from 'react';
import {
  hubspot_client_id,
  hubspot_redirect_uri,
  hubspot_app_autorize_url,
  hubspot_scopes,
  getHubspotConnectStatus,
} from './hubspot';
import { v4 as uuid } from 'uuid';
import { useSelector, useDispatch } from 'react-redux';
import { SET_HUBSPOT } from '../../../../store/types';
import { StoreParams } from '../../../../models/store';
import { initialIntegrations } from '../../../../store/storeUtils';
import loadable from '@loadable/component';
import { trackError } from '../../../../utils/analytics';

const CustomButton = loadable(() => import('../../../../components/CustomButton'));
const CardCheckedIcon = loadable(() => import('../../../../icons/CardCheckedIcon'));

const HubspotConnect = (): React.ReactElement => {
  const dispatch = useDispatch();
  const fetchRef = useRef(false);

  const hubspot =
    useSelector((state: StoreParams) => state.integrations.hubspot) || initialIntegrations.hubspot;
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');

  useEffect(() => {
    onCheckStatus();
  }, [accountId]);

  const onCheckStatus = () => {
    if (fetchRef.current) return;
    fetchRef.current = true;

    getHubspotConnectStatus(accountId)
      .then((res) => {
        if (res?.success) {
          dispatch({
            type: SET_HUBSPOT,
            payload: {
              logged_in: res?.is_connected || false,
              state: hubspot.state,
              is_called: false,
            },
          });
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'HubspotConnect.tsx',
          type: 'check_hubspot_connect_status',
        });
      })
      .finally(() => {
        fetchRef.current = false;
      });
  };

  const onConnectHubspot = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (hubspot.logged_in) return;

    let scope_string = '';
    hubspot_scopes.forEach((item, index) => {
      if (index === 0) {
        scope_string += item;
      } else {
        scope_string += `%20${item}`;
      }
    });

    const state = uuid();
    const hubspot_install_url = `${hubspot_app_autorize_url}?client_id=${hubspot_client_id}&redirect_uri=${hubspot_redirect_uri}&scope=${scope_string}&state=${state}`;

    dispatch({
      type: SET_HUBSPOT,
      payload: {
        logged_in: false,
        state,
        is_called: true,
      },
    });

    window.open(hubspot_install_url);
  };

  return (
    <div className="integration-each-button">
      <img
        src="https://trackapp-web.s3.us-east-2.amazonaws.com/crm/hubspot-logo.svg"
        alt="hubspot_logo"
        style={{
          width: '50px',
          height: '50px',
          marginLeft: '-10px',
          marginRight: '-6px',
        }}
      />
      <p>HubSpot</p>

      {hubspot.logged_in ? (
        <CardCheckedIcon fill="white" />
      ) : (
        <div className="card-connect-button">
          <CustomButton label="Connect" type="primary" onClick={onConnectHubspot} />
        </div>
      )}

      <div className="integration-each-button--description">
        <p>To pull contacts from Hubspot</p>
      </div>
    </div>
  );
};

export default HubspotConnect;
