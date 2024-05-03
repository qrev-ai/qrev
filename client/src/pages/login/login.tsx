import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { v4 as uuid } from 'uuid';
import {
  UPDATE_DEVICE_INFO,
  ADD_ACCOUNT,
  SET_USER_TOKENS,
  SET_USER_WORKSPACE,
} from '../../store/types';
import { setStoreLoading } from '../../store/actions';
import {
  googleExternalSignInWithBrowser,
  getExchangeToken,
  getUserDetails,
} from '../../utils/google-auth';
import { COLOR_THEME } from '../../config/credential';
import { isEmpty } from 'lodash';
import { StoreParams, ExchangeTokenParams, WorkspaceAccountParams } from '../../models/store';
import { LOGIN_TYPE } from '../../config/enums';
import { isMobile } from '../../utils/helper';
import loadable from '@loadable/component';
import Button from '@mui/material/Button';
import { trackError } from '../../utils/analytics';
import '../../styles/login.scss';

const GoogleIcon = loadable(() => import('../../icons/GoogleIcon'));
const MiddleModal = loadable(() => import('./MiddleModal'));

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector((state: StoreParams) => state.user);

  const login_attempt_ref = useRef(false);
  const state_value_ref = useRef('');
  const device_id_ref = useRef('');
  const sjw_token_ref = useRef('');
  const login_type_ref = useRef(LOGIN_TYPE.google);

  const [show_middle_modal, setShowMiddleModal] = useState(false);

  useEffect(() => {
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    if (user.isSignedIn) {
      navigate('/');
    }
  }, [user]);

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const handleFocus = () => {
    if (login_attempt_ref.current && state_value_ref.current && device_id_ref.current) {
      setLoading(true);

      const accountType = login_type_ref.current === LOGIN_TYPE.google ? 'google' : 'ms';

      getExchangeToken(state_value_ref.current, accountType)
        .then((res) => {
          if (res.success && res.result && !isEmpty(res.result)) {
            dispatch({
              type: SET_USER_TOKENS,
              payload: {
                ...res.result,
              },
            });

            localStorage.setItem('refreshToken', res.result.refreshToken);
            localStorage.setItem('accessToken', res.result.accessToken);
            localStorage.setItem('expiryInDate', res.result.expiryInDate);

            onGetUserDetails(res.result, state_value_ref.current);
          }
        })
        .catch((err) => {
          trackError(err, {
            page: 'Login',
            type: 'get_exchange_token',
          });
        })
        .finally(() => {
          login_attempt_ref.current = false;
          state_value_ref.current = '';
          sjw_token_ref.current = '';
          setLoading(false);
        });
    }
  };

  const onGetUserDetails = (tokens: ExchangeTokenParams, stateVal: string) => {
    getUserDetails(tokens.accessToken)
      .then((res) => {
        if (res.success && res.txid && res.user_details && !isEmpty(res.user_details)) {
          const { email, name, first_name, last_name, phone_number } = res.user_details;

          const account = {
            email,
            fullname: name,
            first_name,
            last_name,
            phone_number,
            id: res.txid,
            idToken: tokens.refreshToken,
            accessToken: tokens.accessToken,
            stateValue: stateVal,
            isPrimary: true,
            isEnabled: true,
            logo: (name?.[0] || 'S').toUpperCase(),
            type: 'google',
            color: COLOR_THEME[0],
            isAzure: false,
            expiry: tokens.expiryInDate,
          };

          dispatch({
            type: ADD_ACCOUNT,
            payload: {
              isSignedIn: true,
              email,
              account,
              isAzure: false,
            },
          });

          const showCreateWorkspaceAccount = !res.accounts || !res.accounts.length;
          const workspaceAccounts = (res.accounts || []).map(
            (v: WorkspaceAccountParams, ivx: number) => ({
              ...v,
              isCurrent: ivx === 0,
            }),
          );
          const cnt_account_id = (res.accounts || [])?.[0]?.id || '';

          dispatch({
            type: SET_USER_WORKSPACE,
            payload: {
              accounts: workspaceAccounts,
              showCreateModal: showCreateWorkspaceAccount,
              cnt_account_id,
            },
          });

          navigate('/');
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'Login',
          type: 'get_user_details',
        });
      });
  };

  const handleGoogleLogin = () => {
    let googleModal: Window | null = null;

    const queryHandler = (e: MessageEvent) => {
      if (e.data && e.data.action === 'CLOSE_GOOGLE_MODAL') {
        if (googleModal) {
          googleModal.close();
        }
      }
    };

    const is_mobile_device = isMobile();

    const stateValue = uuid(),
      deviceId = uuid(),
      device_type = is_mobile_device ? 'mob' : 'web';

    const combStateVal = `STA${stateValue}#DID${deviceId}#TYP${device_type}`;

    dispatch({
      type: UPDATE_DEVICE_INFO,
      payload: {
        device_id: deviceId,
        device_type,
      },
    });

    const { authUrl } = googleExternalSignInWithBrowser(combStateVal);

    login_attempt_ref.current = true;
    state_value_ref.current = stateValue;
    device_id_ref.current = deviceId;
    login_type_ref.current = LOGIN_TYPE.google;

    const w = 600;
    const h = 700;
    let x = 0,
      y = 0;

    if (window && window.top) {
      y = window.top.outerHeight / 2 + window.top.screenY - h / 2;
      x = window.top.outerWidth / 2 + window.top.screenX - w / 2;
    }

    googleModal = window.open(
      authUrl,
      'popup',
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`,
    );

    if (window) {
      window.addEventListener('message', queryHandler);
    }
  };

  return (
    <div className="login">
      <Button
        component="label"
        variant="contained"
        color="inherit"
        startIcon={<GoogleIcon />}
        onClick={() => setShowMiddleModal(true)}
        className="app-login-btn"
        sx={{
          textTransform: 'none',
          backgroundColor: '#f2f2f2',
          '& .MuiButton-startIcon': {
            marginRight: 1.5,
          },
        }}
      >
        Sign in with Google
      </Button>

      {show_middle_modal && (
        <MiddleModal
          open={show_middle_modal}
          setOpen={setShowMiddleModal}
          handleGoogleLogin={handleGoogleLogin}
        />
      )}
    </div>
  );
};

export default Login;
