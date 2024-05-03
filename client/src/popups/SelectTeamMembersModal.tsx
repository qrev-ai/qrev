import React, { MouseEvent, useRef, useState, useEffect } from 'react';
import loadable from '@loadable/component';
import { cloneDeep, findIndex } from 'lodash';
import { AccountUserParams } from '../models/settings';
import {
  CollectiveTeamMemberParams,
  RobinTeamMemberParams,
  SelectParams,
} from '../models/campaigns';
import { LinkType } from '../models/enums';
import { FormControlLabel, Switch, Checkbox } from '@mui/material';
import { weightOptions, regionBasedOptions } from './const';

const Modal = loadable(() => import('@mui/material/Modal'));
const CloseIcon = loadable(() => import('../icons/CloseIcon'));
const CustomButton = loadable(() => import('../components/CustomButton'));
const CustomSelect = loadable(() => import('../components/CustomSelect'));
const CustomNumInput = loadable(() => import('../components/CustomNumInput'));

interface SelectTeamMembersModalProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  users: AccountUserParams[];
  type: LinkType;
  members?: RobinTeamMemberParams[];
  setMembers?: (val: RobinTeamMemberParams[]) => void;
  clmembers?: CollectiveTeamMemberParams[];
  setClMembers?: (val: CollectiveTeamMemberParams[]) => void;
}

const SelectTeamMembersModal = ({
  open,
  setOpen,
  users,
  type,
  members,
  setMembers,
  clmembers,
  setClMembers,
}: SelectTeamMembersModalProps): React.ReactElement => {
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const [teamMembers, setTeamMembers] = useState<RobinTeamMemberParams[]>([]);
  const [clteamMembers, setClTeamMembers] = useState<CollectiveTeamMemberParams[]>(
    cloneDeep(clmembers || []),
  );
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    if (
      (type === 'robinlink' && !teamMembers.length) ||
      (type === 'collectivelink' && !clteamMembers.length)
    ) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [teamMembers, clteamMembers, type]);

  useEffect(() => {
    if (members && members?.length > 0) {
      setTeamMembers(
        cloneDeep(
          members.map((member) => {
            return {
              ...member,
              member_max_bookings_per_day:
                !member.member_max_bookings_per_day || member.member_max_bookings_per_day === 'N/A'
                  ? '0'
                  : member.member_max_bookings_per_day,
            };
          }),
        ),
      );
      return;
    }
    setTeamMembers([]);
  }, [members]);

  const onClose = () => {
    setTeamMembers([]);
    setClTeamMembers([]);
    setOpen(false);
  };

  const onConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (type === 'robinlink' && setMembers) {
      const checkerMaxBookingsDayForTeamMembers = teamMembers.map((item) => {
        return {
          ...item,
          member_max_bookings_per_day:
            item?.member_max_bookings_per_day === '0' ? 'N/A' : item?.member_max_bookings_per_day,
        };
      });
      setMembers(cloneDeep(checkerMaxBookingsDayForTeamMembers));
    } else if (type === 'collectivelink' && setClMembers) {
      setClMembers(cloneDeep(clteamMembers));
    }
    onClose();
  };

  const isMainAssignSelected = () => {
    return (clteamMembers.filter((v) => v.main_assignee) || []).length ? true : false;
  };

  return (
    <Modal open={open} onClose={onClose} className="ownership-modal">
      <div className="ownership-modal-container">
        <div className="ownership-modal-close" onClick={onClose}>
          <CloseIcon width="24px" fill="#7F7F83" />
        </div>

        <h2>Select Team Members</h2>

        <div ref={modalBodyRef} className="ownership-modal-body no-scrollbar">
          <div className="queue-item-row queue-exception-row">
            <label>members</label>

            <div className="queue-route-setting queue-exceptions-setting">
              <div className="queue-route-selector">
                <CustomSelect
                  options={users.map((v) => ({
                    ...v,
                    label: v.email,
                    value: v.email,
                  }))}
                  selected={{}}
                  setSelected={(val: any) => {
                    let valIndex = 0;
                    const email = val.email || val.value;
                    if (type === 'robinlink') {
                      valIndex = findIndex(teamMembers, (o) => o.member_email === email);
                      if (valIndex < 0) {
                        teamMembers.push({
                          member_email: email,
                          timezone: { label: '', value: '' },
                          member_weight: 1,
                          member_max_bookings_per_day: '0',
                        });
                        setTeamMembers([...teamMembers]);
                      }
                    } else if (type === 'collectivelink') {
                      valIndex = findIndex(clteamMembers, (o) => o.email === email);
                      if (valIndex < 0) {
                        clteamMembers.push({
                          email: email,
                          main_assignee: false,
                          optional: false,
                        });
                        setClTeamMembers([...clteamMembers]);
                      }
                    }
                  }}
                  placeholder="type emails to add users."
                  showArrow
                />
              </div>
            </div>
          </div>
          <div className="team-members-view">
            {type === 'robinlink' ? (
              <div className="team-member-view-row team-member-view-row-header">
                <p className="member-email">Email</p>
                <p className="member-timezone">Region</p>
                <p className="member-weight">Weight</p>
                <p className="member-bookings-day">Max Bookings / Day</p>
                <div className="member-action" />
              </div>
            ) : type === 'collectivelink' ? (
              <div className="team-member-view-row team-member-view-row-header">
                <p className="member-email">Email</p>
                <p className="member-main-assign">Main Assignee</p>
                <p className="member-observer">Optional</p>
                <div className="member-action" />
              </div>
            ) : null}

            {type === 'robinlink' && teamMembers?.length ? (
              <React.Fragment>
                {teamMembers.map((it: RobinTeamMemberParams, itx: number) => (
                  <div className="team-member-view-row" key={`team-${it.member_email}-${itx}`}>
                    <p className="member-email">{it.member_email}</p>

                    <div className="member-timezone">
                      <CustomSelect
                        options={regionBasedOptions}
                        selected={it.timezone}
                        setSelected={(val: SelectParams) => {
                          teamMembers[itx].timezone = cloneDeep(val);
                          setTeamMembers([...teamMembers]);
                        }}
                        placeholder="timezone ..."
                      />
                    </div>

                    <div className="member-weight">
                      <CustomSelect
                        options={weightOptions}
                        selected={{
                          label: it.member_weight,
                          value: it.member_weight,
                        }}
                        setSelected={(val: SelectParams) => {
                          teamMembers[itx].member_weight = Number(val.value);
                          setTeamMembers([...teamMembers]);
                        }}
                        placeholder="weight ..."
                      />
                    </div>

                    <div className="member-bookings-day">
                      <CustomNumInput
                        value={it.member_max_bookings_per_day || '0'}
                        onChange={(val: string) => {
                          if (Number(val) < 0 || Number(val) > 10) {
                            return;
                          }
                          teamMembers[itx].member_max_bookings_per_day = val;
                          setTeamMembers([...teamMembers]);
                        }}
                        className="text-sm rounded-lg outline-none block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                        placeholder="max bookings / day ..."
                      />
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
              </React.Fragment>
            ) : null}

            {type === 'collectivelink' && clteamMembers?.length ? (
              <React.Fragment>
                {clteamMembers.map((ic: CollectiveTeamMemberParams, icx: number) => (
                  <div className="team-member-view-row" key={`cl-team-${ic.email}-${icx}`}>
                    <p className="member-email">{ic.email}</p>

                    <div className="member-main-assign">
                      <div className="app-custom-switch">
                        <FormControlLabel
                          value="status"
                          control={<Switch checked={ic.main_assignee} />}
                          onChange={() => {
                            clteamMembers[icx].main_assignee = !ic.main_assignee;
                            setClTeamMembers([...clteamMembers]);
                          }}
                          label={''}
                          className={ic.main_assignee ? 'custom-switch-active' : ''}
                          disabled={isMainAssignSelected() && !ic.main_assignee}
                          style={{
                            opacity: isMainAssignSelected() && !ic.main_assignee ? 0.9 : 1,
                          }}
                        />
                      </div>
                    </div>

                    <div className="member-observer">
                      <div className="app-custom-checkbox">
                        <FormControlLabel
                          value="status"
                          control={<Checkbox checked={ic.optional} />}
                          onChange={() => {
                            clteamMembers[icx].optional = !ic.optional;
                            setClTeamMembers([...clteamMembers]);
                          }}
                          label={''}
                          className={ic.optional ? 'custom-switch-active' : ''}
                          disabled={ic.main_assignee}
                          style={{
                            opacity: ic.main_assignee ? 0.9 : 1,
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className="member-action"
                      onClick={(e) => {
                        e.preventDefault();
                        clteamMembers.splice(icx, 1);
                        setClTeamMembers([...clteamMembers]);
                      }}
                      style={{
                        visibility: ic.main_assignee ? 'hidden' : 'visible',
                      }}
                    >
                      <CloseIcon width="14px" />
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ) : null}
          </div>
        </div>

        <div className="ownership-modal-footer">
          <div className="ownership-create-btn">
            <CustomButton label="Cancel" type="primary" onClick={onClose} />
          </div>

          <div className="ownership-create-btn">
            <CustomButton
              label={'Confirm'}
              type="success"
              onClick={onConfirm}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SelectTeamMembersModal;
