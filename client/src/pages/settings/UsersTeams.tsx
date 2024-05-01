import React, { useState, MouseEvent, useEffect, useRef } from 'react';
import loadable from '@loadable/component';
import { UsersTeamsType } from '../../models/enums';
import { AccountUserParams, AccountTeamParams } from '../../models/settings';
import { useDispatch, useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';
import {
  viewAccountUsers,
  removeUserFromAccount,
  viewAllTeams,
  deleteTeam,
} from '../../utils/api-users-teams';
import { setStoreLoading } from '../../store/actions';
import { cloneDeep } from 'lodash';
import { SET_DATA_ACCOUNT_TEAMS, SET_DATA_ACCOUNT_USERS } from '../../store/types';
import moment from 'moment';
import { trackError } from '../../utils/analytics';

const CustomButton = loadable(() => import('../../components/CustomButton'));
const EmptyComponent = loadable(() => import('../../components/EmptyComponent'));
const UsersTeamsModal = loadable(() => import('../../popups/UsersTeamsModal'));
const DeleteIcon = loadable(() => import('../../icons/DeleteIcon'));
const EditIcon = loadable(() => import('../../icons/EditIcon'));

interface UsersTeamsProps {
  type: UsersTeamsType;
}

const UsersTeams = ({ type }: UsersTeamsProps): React.ReactElement => {
  const dispatch = useDispatch();

  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');
  const storeAccountUsers = useSelector((state: StoreParams) => state.data.accountUsers || []);
  const storeAccountTeams = useSelector((state: StoreParams) => state.data.accountTeams || []);

  const fetchRef = useRef(false);

  const [accountUsers, setAccountUsers] = useState<AccountUserParams[]>(
    cloneDeep(storeAccountUsers),
  );
  const [accountTeams, setAccountTeams] = useState<AccountTeamParams[]>(
    cloneDeep(storeAccountTeams),
  );
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);

  useEffect(() => {
    onInitFetch();
  }, [type, accountId]);

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const onInitFetch = () => {
    if (fetchRef.current) return;

    switch (type) {
      case 'user': {
        onFetchUsers();
        break;
      }

      case 'team': {
        onFetchTeams();
        break;
      }

      default: {
        break;
      }
    }
  };

  const onSetAccountUsers = (newUsers: AccountUserParams[]) => {
    setAccountUsers(cloneDeep(newUsers));

    dispatch({
      type: SET_DATA_ACCOUNT_USERS,
      payload: {
        accountUsers: newUsers,
      },
    });
  };

  const onSetAccountTeams = (newTeams: AccountTeamParams[]) => {
    setAccountTeams(cloneDeep(newTeams));

    dispatch({
      type: SET_DATA_ACCOUNT_TEAMS,
      payload: {
        accountTeams: newTeams,
      },
    });
  };

  const onFetchUsers = () => {
    fetchRef.current = true;

    if (!accountUsers.length) {
      setLoading(true);
    }

    viewAccountUsers(accountId)
      .then((res) => {
        if (res.success) {
          onSetAccountUsers(cloneDeep(res.account_users || []));
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'UsersTeams',
          type: 'view_account_users',
        });
      })
      .finally(() => {
        setLoading(false);
        fetchRef.current = false;
      });
  };

  const onFetchTeams = () => {
    fetchRef.current = true;

    if (!accountTeams.length) {
      setLoading(true);
    }

    viewAllTeams(accountId)
      .then((res) => {
        if (res.success) {
          onSetAccountTeams(cloneDeep(res.teams || []));
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'UsersTeams',
          type: 'view_account_teams',
        });
      })
      .finally(() => {
        setLoading(false);
        fetchRef.current = false;
      });
  };

  const onCreate = (e: MouseEvent<HTMLSpanElement | HTMLButtonElement>) => {
    e.preventDefault();
    setEditIndex(-1);
    setShowModal(true);
  };

  const onDeleteUser = (index: number, user_id: string) => {
    if (!user_id) {
      return;
    }

    const payload = { user_id };
    setLoading(true);
    removeUserFromAccount(accountId, payload)
      .then((res) => {
        if (res.success) {
          accountUsers.splice(index, 1);
          onSetAccountUsers([...accountUsers]);
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'UsersTeams',
          type: 'remove_account_user',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const onDeleteTeam = (index: number, team_id: string) => {
    if (!team_id) {
      return;
    }
    setLoading(true);
    deleteTeam(accountId, team_id)
      .then((res) => {
        if (res.success) {
          accountTeams.splice(index, 1);
          onSetAccountTeams([...accountTeams]);
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'UsersTeams',
          type: 'remove_account_team',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="users-teams">
      <div className="users-teams-create-button">
        <CustomButton
          label={type === 'user' ? 'Add Users' : 'Create New'}
          onClick={onCreate}
          type="filled_primary"
          icon="rect_plus"
          iconFill="#DDEB18"
        />
      </div>

      <div className="user-team-row user-team-header">
        {type === 'user' ? (
          <React.Fragment>
            <p className="user-team-name">Name</p>
            <p className="user-team-email">Email</p>
            <p className="user-team-role">Role</p>
            <p className="user-team-team">Invite Status</p>
            <p className="user-team-link">Created On</p>
            <p className="user-team-actions">Actions</p>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <p className="user-team-teamname">Team Name</p>
            <p className="user-team-members">Members</p>
            <p className="user-team-actions">Actions</p>
          </React.Fragment>
        )}
      </div>

      <div className="user-team-body no-scrollbar">
        {type === 'user' && accountUsers.length ? (
          <React.Fragment>
            {accountUsers.map((item: AccountUserParams, index: number) => (
              <div
                className={index % 2 ? 'user-team-row alternative-row' : 'user-team-row'}
                key={`user-${item.user_id}-${index}`}
              >
                <p className="user-team-name">{item.name}</p>
                <p className="user-team-email">{item.email}</p>
                <p className="user-team-role">{item.is_super_admin ? 'admin' : 'member'}</p>
                <p className="user-team-team">
                  {item.invite_status ? (
                    <span className={`span_user_team_tag span_user_team_${item.invite_status}`}>
                      {item.invite_status}
                    </span>
                  ) : (
                    '-'
                  )}
                </p>
                <p className="user-team-link">
                  {item.created_on ? moment(item.created_on).format('DD/MM/YYYY, h:mm a') : '-'}
                </p>
                <div className="user-team-actions">
                  <div
                    className="user-team-action-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      onDeleteUser(index, item.user_id);
                    }}
                  >
                    <DeleteIcon width={12} fill={'#1e1c23'} />
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ) : type === 'team' && accountTeams.length ? (
          <React.Fragment>
            {accountTeams.map((item: AccountTeamParams, index: number) => (
              <div
                className={index % 2 ? 'user-team-row alternative-row' : 'user-team-row'}
                key={`user-${item.team_id}-${index}`}
              >
                <p className="user-team-teamname">{item.name}</p>
                <p className="user-team-members">{`${item.members.length} member${
                  item.members.length === 1 ? '' : 's'
                }`}</p>
                <div className="user-team-actions">
                  <div
                    className="user-team-action-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      onDeleteTeam(index, item.team_id);
                    }}
                  >
                    <DeleteIcon width={12} fill={'#1e1c23'} />
                  </div>

                  <div
                    className="user-team-action-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditIndex(index);
                      setShowModal(true);
                    }}
                  >
                    <EditIcon width="12px" fill={'#1e1c23'} />
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ) : (
          <EmptyComponent
            onCreate={onCreate}
            note={`You have not yet ${type === 'user' ? 'added' : 'created'} any ${type}.`}
            buttonTitle={type === 'user' ? 'Add Users' : 'Create New'}
          />
        )}
      </div>

      <div className="user-team-row user-team-footer" />

      {showModal && (
        <UsersTeamsModal
          type={type}
          open={showModal}
          setOpen={setShowModal}
          editIndex={editIndex}
          users={accountUsers}
          setUsers={onSetAccountUsers}
          teams={accountTeams}
          setTeams={onSetAccountTeams}
        />
      )}
    </div>
  );
};

export default UsersTeams;
