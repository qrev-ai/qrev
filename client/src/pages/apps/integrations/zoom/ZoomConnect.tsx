import React, { MouseEvent, useEffect, useRef } from 'react';
import {
  zoom_client_id,
  zoom_redirect_uri,
  zoom_app_autorize_url,
  getZoomConnectStatus,
} from './zoom';
import { v4 as uuid } from 'uuid';
import { useSelector, useDispatch } from 'react-redux';
import { SET_ZOOM } from '../../../../store/types';
import { StoreParams } from '../../../../models/store';
import { initialIntegrations } from '../../../../store/storeUtils';
import loadable from '@loadable/component';
import { trackError } from '../../../../utils/analytics';
import zoomLogo from '../../../../assets/images/zoom.png';

const CustomButton = loadable(() => import('../../../../components/CustomButton'));
const CardCheckedIcon = loadable(() => import('../../../../icons/CardCheckedIcon'));

const ZoomConnect = (): React.ReactElement => {
  const dispatch = useDispatch();
  const fetchRef = useRef(false);

  const zoom =
    useSelector((state: StoreParams) => state.integrations.zoom) || initialIntegrations.zoom;
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');

  useEffect(() => {
    onCheckStatus();
  }, [accountId]);

  const onCheckStatus = () => {
    if (fetchRef.current) return;
    fetchRef.current = true;

    getZoomConnectStatus(accountId)
      .then((res) => {
        if (res?.success) {
          dispatch({
            type: SET_ZOOM,
            payload: {
              logged_in: res?.is_connected || false,
              state: zoom.state,
              is_called: false,
            },
          });
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'ZoomConnect.tsx',
          type: 'check_zoom_connect_status',
        });
      })
      .finally(() => {
        fetchRef.current = false;
      });
  };

  const onConnectZoom = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (zoom.logged_in) return;

    let zoomWindow: Window | null = null;

    const queryHandler = (e: MessageEvent) => {
      if (e.data && e.data.action === 'CLOSE_ZOOM_SUCCESS_PAGE') {
        if (zoomWindow) {
          zoomWindow.close();
        }
      }
    };

    const state = uuid();
    const zoom_install_url = `${zoom_app_autorize_url}?client_id=${zoom_client_id}&redirect_uri=${zoom_redirect_uri}&response_type=code&open_in_browser=true&access_type=offline&state=${state}`;

    dispatch({
      type: SET_ZOOM,
      payload: {
        logged_in: false,
        state,
        is_called: true,
      },
    });

    zoomWindow = window.open(zoom_install_url);
    window.addEventListener('message', queryHandler);
  };

  return (
    <div className="integration-each-button">
      <img src={zoomLogo} alt="zoom_logo" />
      <p>Zoom</p>

      {zoom.logged_in ? (
        <CardCheckedIcon fill="white" />
      ) : (
        <div className="card-connect-button">
          <CustomButton label="Connect" type="primary" onClick={onConnectZoom} />
        </div>
      )}

      <div className="integration-each-button--description">
        <p>
          Tools for customer relationship management, social media marketing, content management,
          lead generation, web analytics, search engine optimization, live chat, and customer
          support.z
        </p>
      </div>
    </div>
  );
};

export default ZoomConnect;
