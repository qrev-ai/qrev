import React, { MouseEvent, useRef, useState, useEffect } from 'react';
import loadable from '@loadable/component';
import { TeamMemberRoleType, UsersTeamsType } from '../models/enums';
import { SelectParams } from '../models/campaigns';
import { cloneDeep, findIndex } from 'lodash';
import { useSelector, useDispatch } from 'react-redux';
import { StoreParams } from '../models/store';
import { AccountUserParams, AccountTeamParams, TeamMemberParams } from '../models/settings';
import { setStoreLoading } from '../store/actions';
import { addUsersToAccount, createTeam, updateTeam } from '../utils/api-users-teams';
import { FormControlLabel, Switch } from '@mui/material';
import { trackError } from '../utils/analytics';

const Modal = loadable(() => import('@mui/material/Modal'));
const CloseIcon = loadable(() => import('../icons/CloseIcon'));
const CustomButton = loadable(() => import('../components/CustomButton'));
const CustomSelect = loadable(() => import('../components/CustomSelect'));

interface UsersTeamsModalProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  editIndex: number;
  type: UsersTeamsType;
  users: AccountUserParams[];
  setUsers: (val: AccountUserParams[]) => void;
  teams: AccountTeamParams[];
  setTeams: (val: AccountTeamParams[]) => void;
}

const UsersTeamsModal = ({
  open,
  setOpen,
  editIndex,
  type,
  users,
  setUsers,
  teams,
  setTeams,
}: UsersTeamsModalProps): React.ReactElement => {
  const dispatch = useDispatch();

  const modalBodyRef = useRef<HTMLDivElement>(null);

  const config = useSelector((state: StoreParams) => state.config);
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');

  const [newUsers, setNewUsers] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMemberParams[]>([]);
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    if (open && type === 'team' && editIndex > -1 && teams.length > editIndex) {
      setTeamName(teams[editIndex].name);
      setTeamMembers(cloneDeep(teams[editIndex].members));
    }
  }, [editIndex, teams, type, open]);

  useEffect(() => {
    if (type === 'user' && !newUsers.length) {
      setDisabled(true);
    } else if (type === 'team' && (!teamName || !teamMembers.length)) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [newUsers, teamName, teamMembers, type]);

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const onClose = () => {
    setOpen(false);
  };

  const onAddUsers = () => {
    setLoading(true);

    const payload = {
      user_emails: newUsers,
    };
    addUsersToAccount(accountId, payload)
      .then((res) => {
        if (res.success && res.added_users?.length) {
          const cntUsers = cloneDeep(users || []);
          res.added_users.forEach((v: AccountUserParams) => {
            cntUsers.push(v);
          });
          setUsers([...cntUsers]);
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'UsersTeamsModal',
          type: 'add_user_to_account',
        });
      })
      .finally(() => {
        setLoading(false);
        onClose();
      });
  };

  const onSubmitTeam = () => {
    const payload = {
      name: teamName,
      members: teamMembers.map((v) => ({
        user_id: v.user_id,
        email: v.email,
        role: v.role,
        observer: v.observer,
      })),
    };

    setLoading(true);
    if (editIndex > -1) {
      updateTeam(accountId, teams[editIndex].team_id, payload)
        .then((res) => {
          if (res.success) {
            teams[editIndex] = {
              ...teams[editIndex],
              name: teamName,
              members: teamMembers.map((v) => ({
                user_id: v.user_id,
                name: v.name,
                email: v.email,
                role: v.role,
                observer: v.observer,
              })),
            };
            setTeams([...teams]);
          }
        })
        .catch((err) => {
          trackError(err, {
            page: 'UsersTeamsModal',
            type: 'update_team',
          });
        })
        .finally(() => {
          setLoading(false);
          onClose();
        });
    } else {
      createTeam(accountId, payload)
        .then((res) => {
          if (res.success && res.team_id) {
            teams.push({
              team_id: res.team_id,
              name: teamName,
              members: teamMembers.map((v) => ({
                user_id: v.user_id,
                name: v.name,
                email: v.email,
                role: v.role,
                observer: v.observer,
              })),
            });
            setTeams([...teams]);
          }
        })
        .catch((err) => {
          trackError(err, {
            page: 'UsersTeamsModal',
            type: 'create_team',
          });
        })
        .finally(() => {
          setLoading(false);
          onClose();
        });
    }
  };

  const onConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    switch (type) {
      case 'user': {
        onAddUsers();
        break;
      }

      case 'team': {
        onSubmitTeam();
        break;
      }

      default: {
        break;
      }
    }
  };

  const onRemoveUser = (iex: number) => {
    const cntUsers = cloneDeep(newUsers || []);
    if (cntUsers.length > iex) {
      cntUsers.splice(iex, 1);
      setNewUsers([...cntUsers]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="ownership-modal">
      <div className="ownership-modal-container">
        <div className="ownership-modal-close" onClick={onClose}>
          <CloseIcon width="24px" fill="#7F7F83" />
        </div>

        <h2>
          {type === 'user'
            ? 'Add Users'
            : editIndex > -1
              ? 'Update Current Team'
              : 'Create New Team'}
        </h2>

        <div ref={modalBodyRef} className="ownership-modal-body no-scrollbar">
          {type === 'user' && (
            <div className="queue-item-row queue-exception-row">
              <label>users</label>

              <div className="queue-route-setting queue-exceptions-setting">
                <div className="queue-route-selector">
                  <CustomSelect
                    options={[]}
                    selected={{}}
                    setSelected={(val: SelectParams) => {
                      const cntUsers = cloneDeep(newUsers || []);
                      if (!cntUsers.length || !cntUsers.includes(val.value)) {
                        cntUsers.push(val.value);
                      }
                      setNewUsers([...cntUsers]);
                    }}
                    placeholder="type emails to add users."
                  />
                </div>

                {newUsers?.length ? (
                  <div className="route-exclude-emails-selected">
                    {newUsers.map((item, index) => (
                      <div key={index} className="route-exclude-email-chip">
                        <p>{item}</p>
                        <div
                          className="route-exclude-close"
                          onClick={(e) => {
                            e.preventDefault();
                            onRemoveUser(index);
                          }}
                        >
                          <CloseIcon />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {type === 'team' && (
            <React.Fragment>
              <div className="queue-item-row" style={{ marginBottom: '16px' }}>
                <label>name</label>

                <input
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  placeholder="type team name..."
                  autoFocus={true}
                />
              </div>

              <div className="queue-item-row queue-exception-row">
                <label>members</label>

                <div className="queue-route-setting queue-exceptions-setting">
                  <div className="queue-route-selector">
                    <CustomSelect
                      options={users.map((v) => ({
                        ...v,
                        label: v.email,
                      }))}
                      selected={{}}
                      setSelected={(val: AccountUserParams) => {
                        const valIndex = findIndex(teamMembers, (o) => o.email === val.email);
                        if (valIndex < 0) {
                          teamMembers.push({
                            user_id: val.user_id,
                            name: val.name,
                            email: val.email,
                            role: 'member',
                            observer: 'no',
                          });
                          setTeamMembers([...teamMembers]);
                        }
                      }}
                      placeholder="type emails to add users."
                      showArrow
                    />
                  </div>

                  {teamMembers.length ? (
                    <div className="team-members-view">
                      <div className="team-member-view-row team-member-view-row-header">
                        <p className="member-name">Name</p>
                        <p className="member-email">Email</p>
                        <p className="member-role">Role</p>
                        <p className="member-observer">Observer</p>
                        <div className="member-action" />
                      </div>

                      {teamMembers.map((it: TeamMemberParams, itx: number) => (
                        <div className="team-member-view-row" key={`team-${it.user_id}-${itx}`}>
                          <p className="member-name">{it.name}</p>

                          <p className="member-email">{it.email}</p>

                          <div className="member-role">
                            <div>
                              <input
                                type="radio"
                                id={`option-admin-${itx}`}
                                value="admin"
                                checked={it.role === 'admin'}
                                onChange={(e) => {
                                  teamMembers[itx].role = e.target.value as TeamMemberRoleType;
                                  setTeamMembers([...teamMembers]);
                                }}
                              />
                              <label htmlFor={`option-admin-${itx}`}>Admin</label>
                            </div>
                            <div>
                              <input
                                type="radio"
                                id={`option-member-${itx}`}
                                value="member"
                                checked={it.role === 'member'}
                                onChange={(e) => {
                                  teamMembers[itx].role = e.target.value as TeamMemberRoleType;
                                  setTeamMembers([...teamMembers]);
                                }}
                              />
                              <label htmlFor={`option-member-${itx}`}>Member</label>
                            </div>
                          </div>

                          <div className="member-observer">
                            <div className="app-custom-switch">
                              <FormControlLabel
                                value="status"
                                control={<Switch checked={it.observer === 'yes' ? true : false} />}
                                onChange={() => {
                                  teamMembers[itx].observer = it.observer === 'yes' ? 'no' : 'yes';
                                  setTeamMembers([...teamMembers]);
                                }}
                                label={''}
                                className={it.observer === 'yes' ? 'custom-switch-active' : ''}
                              />
                            </div>
                          </div>

                          <div
                            className="member-action"
                            onClick={(e) => {
                              e.preventDefault();
                              teamMembers.splice(itx, 1);
                              setTeamMembers([...teamMembers]);
                            }}
                          >
                            <CloseIcon width="14px" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </React.Fragment>
          )}
        </div>

        <div className="ownership-modal-footer">
          <div className="ownership-create-btn">
            <CustomButton label="Cancel" type="primary" onClick={onClose} />
          </div>

          <div className="ownership-create-btn">
            <CustomButton
              label={editIndex > -1 ? 'Update' : 'Create'}
              type="success"
              onClick={onConfirm}
              disabled={config.loading || disabled}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UsersTeamsModal;
