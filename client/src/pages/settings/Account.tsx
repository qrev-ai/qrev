import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { WorkspaceAccountParams, StoreParams } from '../../models/store';
import { cloneDeep } from 'lodash';

const Account = (): React.ReactElement => {
  const workspaceAccounts = useSelector(
    (state: StoreParams) => state.user.workspace?.accounts || [],
  );

  const [account, setAccount] = useState<WorkspaceAccountParams>(
    cloneDeep(workspaceAccounts?.[0] || {}),
  );

  useEffect(() => {
    if (workspaceAccounts.length) {
      const cntAccount =
        (workspaceAccounts.filter((v) => v.isCurrent) || [])?.[0] || workspaceAccounts[0];
      setAccount(cloneDeep(cntAccount));
    }
  }, [workspaceAccounts]);

  return (
    <div className="my-profile settings-account">
      <div className="personal-details">
        <p className="personal-details--header">Current Account</p>

        <div className="personal-details--row">
          <label>Account Name</label>
          <div>
            <p className="personal-editable">{account.name}</p>
          </div>
        </div>

        <div className="personal-details--row">
          <label>Account Domain</label>
          <div>
            <p className="personal-editable">{account.domain}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;
