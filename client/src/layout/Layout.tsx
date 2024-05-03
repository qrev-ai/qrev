import React, { MouseEvent, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  SET_THEME,
  CLEAR_STORE,
  CLEAR_USER_REDUCER,
  CLEAR_CONFIG_REDUCER,
  CLEAR_INTEGRATIONS_REDUCER,
  SET_HUBSPOT,
  SET_ZOOM,
  CLEAR_DATA_REDUCER,
  SET_DEV_FEATURE,
} from '../store/types';
import { signoutGoogle } from '../utils/google-auth';
import { isEmpty } from 'lodash';
import { StoreParams, AccountsParams, UserParams, ConfigParams } from '../models/store';
import { useNavigate } from 'react-router-dom';
import { initialIntegrations } from '../store/storeUtils';
import { connectHubspotAuth } from '../pages/apps/integrations/hubspot/hubspot';
import { connectZoomAuth } from '../pages/apps/integrations/zoom/zoom';
import { SHORTCUT_KEYS, registerKey, unRegisterKey } from './handle-keys';
import { setStoreLoading } from '../store/actions';
import loadable from '@loadable/component';
import { trackError } from '../utils/analytics';
import '../styles/layout.scss';
import { callDefaultLinkAPI } from '../utils/api-dashboard';
import { getDevPermission } from '../utils/api-permission';

const Loader = loadable(() => import('../components/Loader'));
const LeftDrawer = loadable(() => import('../components/LeftDrawer'));
const CreateWorkspaceAccountPopup = loadable(() => import('../popups/CreateWorkspaceAccountPopup'));
const WorkspaceAccountsPopup = loadable(() => import('../popups/WorkspaceAccountsPopup'));

let loadingTimer: ReturnType<typeof setTimeout>;

interface LayoutProps {
  children: React.ReactNode;
}
const Layout = ({ children }: LayoutProps): React.ReactElement => {
  const dispatch = useDispatch();

  const navigate = useNavigate();

  const hsCheckRef = useRef(false);
  const zmCheckRef = useRef(false);

  const user: UserParams = useSelector((state: StoreParams) => state.user);
  const config: ConfigParams = useSelector((state: StoreParams) => state.config);
  const primaryEmail = useSelector((state: StoreParams) => state.user.primaryEmail);
  const accounts: AccountsParams = useSelector((state: StoreParams) => state.user.accounts || {});
  const hubspot =
    useSelector((state: StoreParams) => state.integrations.hubspot) || initialIntegrations.hubspot;
  const zoom =
    useSelector((state: StoreParams) => state.integrations.zoom) || initialIntegrations.zoom;
  const salesforce =
    useSelector((state: StoreParams) => state.integrations.salesforce) ||
    initialIntegrations.salesforce;
  const zoho =
    useSelector((state: StoreParams) => state.integrations.zoho) || initialIntegrations.zoho;
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');
  const workspace = useSelector(
    (state: StoreParams) => state.user.workspace || { accounts: [], showCreateModal: false },
  );

  useEffect(() => {
    onRegisterKeys();

    return () => {
      onUnRegisterKeys();
    };
  }, []);

  useEffect(() => {
    document.addEventListener('clearDataEvent', () => {
      onLogout();
    });
  }, []);

  useEffect(() => {
    if (config.loading) {
      loadingTimer = setTimeout(() => {
        setLoading(false);
        clearTimeout(loadingTimer);
      }, 5000);
    } else {
      clearTimeout(loadingTimer);
    }
  }, [config.loading]);

  useEffect(() => {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        void handleFocus();
      }
    });
  }, [hubspot, salesforce, zoho]);

  useEffect(() => {
    const confTheme = config.theme || 'light';
    import(`../styles/theme/style.${confTheme}.scss`)
      .then(() => {
        document.documentElement.setAttribute('data-theme', confTheme);
        onUpdateBodyTheme();
      })
      .catch((err) => {
        trackError(err, {
          page: 'Layout',
          type: 'update_body_theme',
        });
      });
  }, [config.theme]);

  useEffect(() => {
    if (accountId) callDefaultOpenLink();
  }, [accountId]);

  useEffect(() => {
    getPermission();
  }, []);

  const getPermission = async () => {
    try {
      const res = await getDevPermission();
      dispatch({
        type: SET_DEV_FEATURE,
        payload: res?.allowDevFeatures,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const onRegisterKeys = () => {
    SHORTCUT_KEYS.forEach(({ key, route }) => {
      registerKey(key, route, navigate);
    });
  };

  const onUnRegisterKeys = () => {
    SHORTCUT_KEYS.forEach(({ key }) => {
      unRegisterKey(key);
    });
  };

  const handleFocus = () => {
    if (hubspot.is_called && accountId && !hsCheckRef.current) {
      onConnectHubspot();
    }
    if (zoom.is_called && accountId && !zmCheckRef.current) {
      onConnectZoom();
    }
  };

  const onUpdateBodyTheme = () => {
    document.body.classList.forEach((className) => {
      if (className.startsWith('theme-')) {
        return document.body.classList.remove(className);
      }
    });

    const newClassName = `theme-${config.theme}`;
    document.body.classList.add(newClassName);
  };

  const onSwitchTheme = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const newTheme = config.theme === 'dark' ? 'light' : 'dark';

    dispatch({
      type: SET_THEME,
      payload: {
        theme: newTheme,
      },
    });
  };

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const onClearStore = () => {
    dispatch({ type: CLEAR_CONFIG_REDUCER });
    dispatch({ type: CLEAR_USER_REDUCER });
    dispatch({ type: CLEAR_INTEGRATIONS_REDUCER });
    dispatch({ type: CLEAR_DATA_REDUCER });
    dispatch({ type: CLEAR_STORE });
    localStorage.clear();
  };

  const onLogout = () => {
    if (user.isAzure) {
      onClearStore();
    } else if (
      primaryEmail &&
      accounts &&
      accounts[primaryEmail] &&
      !isEmpty(accounts[primaryEmail])
    ) {
      setLoading(true);
      signoutGoogle(accounts[primaryEmail].idToken)
        .catch((err) => {
          trackError(err, {
            page: 'Layout',
            type: 'on_logout',
          });
        })
        .finally(() => {
          setLoading(false);
          onClearStore();
        });
    }
  };

  const onConnectHubspot = () => {
    connectHubspotAuth(accountId, hubspot.state)
      .then((res) => {
        if (res?.success) {
          dispatch({
            type: SET_HUBSPOT,
            payload: {
              logged_in: true,
              state: hubspot.state,
              is_called: false,
            },
          });
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'Layout.tsx',
          type: 'connect_hubspot_auth',
        });
      })
      .finally(() => {
        hsCheckRef.current = true;
      });
  };

  const onConnectZoom = () => {
    connectZoomAuth(accountId, zoom.state)
      .then((res) => {
        if (res?.success) {
          dispatch({
            type: SET_ZOOM,
            payload: {
              logged_in: true,
              state: zoom.state,
              is_called: false,
            },
          });
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'Layout.tsx',
          type: 'connect_zoom_auth',
        });
      })
      .finally(() => {
        zmCheckRef.current = true;
      });
  };

  const callDefaultOpenLink = () => {
    const time_zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const payload = {
      user_timezone: time_zone,
    };
    callDefaultLinkAPI(accountId, payload)
      .then((res) => {
        if (res.success && res.link_id) {
          console.log('created default link====>', res);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="app-layout">
      {user.isSignedIn && <LeftDrawer onLogout={onLogout} />}

      <div className="app-layout-theme-switch clickable hide" onClick={onSwitchTheme}>
        switch theme
      </div>

      {config.loading && <Loader type="spinningBubbles" theme={config.theme} />}

      <div className="app-layout-children">{children}</div>

      {workspace.showCreateModal && <CreateWorkspaceAccountPopup />}

      {config.showSwitchAccounts && <WorkspaceAccountsPopup />}
    </div>
  );
};

export default Layout;
