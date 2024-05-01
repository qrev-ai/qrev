import React, { MouseEvent, useState } from 'react';
import loadable from '@loadable/component';
import { useSelector, useDispatch } from 'react-redux';
import { StoreParams, WorkspaceAccountParams } from '../models/store';
import { SET_USER_WORKSPACE } from '../store/types';
import { createWorkspaceAccount } from '../utils/google-auth';
import { setStoreLoading } from '../store/actions';
import { trackError } from '../utils/analytics';

const Modal = loadable(() => import('@mui/material/Modal'));
const CustomButton = loadable(() => import('../components/CustomButton'));

const CreateWorkspaceAccountPopup = (): React.ReactElement => {
  const dispatch = useDispatch();

  const workspace = useSelector(
    (state: StoreParams) => state.user.workspace || { accounts: [], showCreateModal: false },
  );
  const loading = useSelector((state: StoreParams) => state.config.loading);

  const [accountName, setAccountName] = useState('');
  const [accountDomain, setAccountDomain] = useState('');

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const onCreate = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    setLoading(true);
    createWorkspaceAccount(accountName, accountDomain)
      .then((res) => {
        if (res.success && res.account_id) {
          const accounts = [
            {
              id: res.account_id,
              name: accountName,
              domain: accountDomain,
              isCurrent: true,
            },
          ] as WorkspaceAccountParams[];

          dispatch({
            type: SET_USER_WORKSPACE,
            payload: {
              accounts,
              showCreateModal: false,
              cnt_account_id: res.account_id,
            },
          });
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'CreateWorkspaceAccountPopup',
          type: 'create_workspace_account',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Modal open={workspace.showCreateModal} className="workspace-account-popup">
      <div className="workspace-account-container">
        <h2>Create Workspace Account</h2>

        <div className="create-workspace-row">
          <label className="required">Account Name</label>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="type account name..."
          />
        </div>

        <div className="create-workspace-row">
          <label>Account Domain</label>
          <input
            value={accountDomain}
            onChange={(e) => setAccountDomain(e.target.value)}
            placeholder="type account domain..."
          />
        </div>

        <div className="create-workspace-row">
          <label>Confirm?</label>
          <div className="create-workspace-submit">
            <CustomButton
              label="Create"
              type="primary"
              onClick={onCreate}
              disabled={!accountName || loading}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateWorkspaceAccountPopup;
