import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { StoreParams } from '../models/store';
import loadable from '@loadable/component';
import { getWorkspaceAccounts } from '../utils/google-auth';
import { setStoreLoading, setShowSwitchAccounts } from '../store/actions';
import { WorkspaceAccountParams } from '../models/store';
import { cloneDeep } from 'lodash';
import { SET_USER_WORKSPACE } from '../store/types';
import { trackError } from '../utils/analytics';

const Modal = loadable(() => import('@mui/material/Modal'));
const CloseIcon = loadable(() => import('../icons/CloseIcon'));

const WorkspaceAccountsPopup = (): React.ReactElement => {
  const initFetchRef = useRef(false);
  const dispatch = useDispatch();

  const config = useSelector((state: StoreParams) => state.config);
  const workspaceAccounts = useSelector(
    (state: StoreParams) => state.user.workspace?.accounts || [],
  );
  const cntAccountId = useSelector(
    (state: StoreParams) => state.user.workspace?.cnt_account_id || '',
  );

  const [accounts, setAccounts] = useState<WorkspaceAccountParams[]>(cloneDeep(workspaceAccounts));

  useEffect(() => {
    onInitFetch();
  }, []);

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const onClose = () => {
    dispatch(setShowSwitchAccounts(false));
  };

  const onInitFetch = () => {
    if (initFetchRef.current) return;

    initFetchRef.current = true;

    if (!accounts.length) {
      setLoading(true);
    }

    getWorkspaceAccounts()
      .then((res) => {
        if (res.success) {
          const newAccounts = (res.accounts || []).map((v: WorkspaceAccountParams) => ({
            ...v,
            isCurrent: v.id === cntAccountId,
          }));
          setAccounts(cloneDeep(newAccounts));
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'WorkspaceAccountsPopup',
          type: 'get_workspace_accounts',
        });
        onClose();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newId = event.target.value;
    const newAccounts = accounts.map((v: WorkspaceAccountParams) => ({
      ...v,
      isCurrent: v.id === newId,
    }));
    setAccounts([...newAccounts]);

    dispatch({
      type: SET_USER_WORKSPACE,
      payload: {
        accounts: newAccounts,
        showCreateModal: false,
        cnt_account_id: newId,
      },
    });
  };

  return (
    <Modal open={config.showSwitchAccounts} onClose={onClose} className="workspace-account-popup">
      <div className="workspace-account-container">
        <div className="workspace-close" onClick={onClose}>
          <CloseIcon width="24px" fill="#7F7F83" />
        </div>

        <h2>Workspace Accounts</h2>

        <div className="create-workspace-row workspace-row-header">
          <label>Name</label>
          <p>Domain</p>
        </div>

        {accounts.length ? (
          <React.Fragment>
            {accounts.map((item: WorkspaceAccountParams, index: number) => (
              <div className="create-workspace-row" key={`account-${item.id}-${index}`}>
                <label className="radio-label">
                  <input
                    type="radio"
                    value={item.id}
                    checked={cntAccountId === item.id}
                    onChange={handleOptionChange}
                  />
                  {item.name}
                </label>
                <p>{item.domain}</p>
              </div>
            ))}
          </React.Fragment>
        ) : null}
      </div>
    </Modal>
  );
};

export default WorkspaceAccountsPopup;
