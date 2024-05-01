import React, { useState, MouseEvent, useEffect, useRef } from 'react';
import { timezoneOptions } from '../../utils/timezone';
import loadable from '@loadable/component';
import { SelectParams } from '../../models/campaigns';
import {
  betweenHoursOptions,
  durationOptions,
  daysIntoFutureOptions,
  conferenceOptions,
  bufferUnitOptions,
} from './const';
import { ConfigurationParams } from '../../models/settings';
import { getSelectedLabel } from '../../utils/helper';
import { cloneDeep, isEmpty } from 'lodash';
import { ConferenceType } from '../../models/enums';
import { setMyConfiguration, getMyConfiguration } from '../../utils/api-my-configuration';
import { useSelector, useDispatch } from 'react-redux';
import { StoreParams } from '../../models/store';
import { SET_DATA_MY_CONFIGURATION } from '../../store/types';
import { setStoreLoading } from '../../store/actions';
import { initConf } from '../../store/storeUtils';
import { trackError } from '../../utils/analytics';
import * as chrono from 'chrono-node';
import { getRefinedChronoInput, getStartAndEndTime } from '../../utils/helper-chrono';
import momenttz from 'moment-timezone';

const CustomSelect = loadable(() => import('../../components/CustomSelect'));
const CustomButton = loadable(() => import('../../components/CustomButton'));

export const minStamp = 60 * 1000;
const refDate = new Date();

const MyConfiguration = (): React.ReactElement => {
  const dispatch = useDispatch();

  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');
  const storeConf = useSelector((state: StoreParams) => state.data.configuration || initConf);
  const config = useSelector((state: StoreParams) => state.config);

  const fetchRef = useRef(false);

  const [confdata, setConfData] = useState<ConfigurationParams>(cloneDeep(storeConf));
  const [hoursSelected, setHoursSelected] = useState<SelectParams>({
    label: '',
    value: '',
  });
  const [bufferValue, setBufferValue] = useState<number | ''>(0);
  const [bufferUnitSelected, setBufferUnitSelected] = useState<SelectParams>({
    label: '',
    value: '',
  });
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    onFetchData();
  }, [accountId]);

  useEffect(() => {
    if (
      !hoursSelected.value ||
      !bufferUnitSelected.value ||
      !confdata.timezone ||
      !confdata.duration ||
      !confdata.conference_type ||
      !confdata.visible_for_days ||
      config.loading
    ) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [confdata, hoursSelected, bufferUnitSelected, config]);

  const onSetConfData = (newConf: ConfigurationParams, isPrefill?: boolean) => {
    const updateConf = isEmpty(newConf) ? cloneDeep(initConf) : cloneDeep(newConf);

    if (updateConf.buffer_time) {
      let buffer_time = updateConf.buffer_time / minStamp;
      let bufferIsUnit = 'minutes';

      if (buffer_time >= 1440) {
        buffer_time = buffer_time / 1440;
        bufferIsUnit = 'days';
      } else if (buffer_time >= 60) {
        buffer_time = buffer_time / 60;
        bufferIsUnit = 'hours';
      }

      setBufferValue(buffer_time);
      setBufferUnitSelected({
        label: bufferIsUnit,
        value: bufferIsUnit,
      });
    }

    if (isPrefill && updateConf.working_start_window_hour && updateConf.working_end_window_hour) {
      const hours_text =
        momenttz(updateConf.working_start_window_hour, 'HH:mm').format('h:mm a') +
        ' to ' +
        momenttz(updateConf.working_end_window_hour, 'HH:mm').format('h:mm a');

      setHoursSelected({
        label: hours_text,
        value: hours_text,
      });
    }

    setConfData({ ...updateConf });

    dispatch({
      type: SET_DATA_MY_CONFIGURATION,
      payload: {
        configuration: cloneDeep(updateConf),
      },
    });
  };

  const onFetchData = () => {
    if (fetchRef.current) return;

    fetchRef.current = true;

    getMyConfiguration(accountId)
      .then((res) => {
        if (res.success) {
          onSetConfData(res.config || {}, true);
        }
      })
      .catch((err) => {
        trackError(err, {
          page: 'MyConfiguration',
          type: 'get_my_configuration',
        });
      })
      .finally(() => {
        fetchRef.current = false;
      });
  };

  const setLoading = (loading: boolean) => {
    dispatch(setStoreLoading(loading));
  };

  const onSubmit = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const payload = cloneDeep(confdata);

    let buffer_time = (bufferValue || 0) * minStamp;
    if (bufferUnitSelected.value === 'hours') {
      buffer_time = buffer_time * 60;
    } else if (bufferUnitSelected.value === 'days') {
      buffer_time = buffer_time * 1440;
    }

    payload.buffer_time = buffer_time;

    const results = chrono.parse(getRefinedChronoInput(hoursSelected.value), refDate, {
      forwardDate: true,
    });

    if (results?.length) {
      const { startTime, endTime } = getStartAndEndTime(results[0]);
      payload.working_start_window_hour = momenttz(startTime).format('HH:mm');
      payload.working_end_window_hour = momenttz(endTime).format('HH:mm');

      setLoading(true);
      setMyConfiguration(accountId, payload)
        .then((res) => {
          if (res.success) {
            onSetConfData(payload);
          }
        })
        .catch((err) => {
          trackError(err, {
            page: 'MyConfiguration',
            type: 'set_my_configuration',
          });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      trackError('chrono-parse error', {
        page: 'MyConfiguration',
        type: 'form_submit',
      });
    }
  };

  return (
    <div className="my-configuration">
      <div className="my-conf-cards">
        <div className="my-conf-head-details">
          <p>Configuration Details</p>
        </div>

        <div className="my-conf-body no-scrollbar">
          <div className="my-conf-item-row">
            <label>timezone</label>

            <div className="my-conf-row-input">
              <CustomSelect
                options={timezoneOptions}
                selected={{
                  label: getSelectedLabel(confdata.timezone, timezoneOptions),
                  value: confdata.timezone,
                }}
                setSelected={(val: SelectParams) => {
                  confdata.timezone = val.value;
                  setConfData({ ...confdata });
                }}
                placeholder="select timezone..."
                showArrow={true}
              />
            </div>
          </div>

          <div className="my-conf-item-row">
            <label>available hours</label>

            <div className="my-conf-row-input">
              <CustomSelect
                options={betweenHoursOptions}
                selected={hoursSelected}
                setSelected={setHoursSelected}
                placeholder="select available hours..."
                showArrow={true}
              />
            </div>
          </div>

          <div className="my-conf-item-row">
            <label>duration</label>

            <div className="my-conf-row-input">
              <CustomSelect
                options={durationOptions}
                selected={{
                  label: getSelectedLabel(confdata.duration, durationOptions),
                  value: confdata.duration,
                }}
                setSelected={(val: SelectParams) => {
                  confdata.duration = Number(val.value);
                  setConfData({ ...confdata });
                }}
                placeholder="select duration..."
                showArrow={true}
              />
            </div>
          </div>

          <div className="my-conf-item-row">
            <label>buffer time</label>

            <div className="my-conf-buffer-time-content">
              <input
                value={bufferValue}
                onChange={(e) => {
                  setBufferValue(Number(e.target.value));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && bufferValue !== '' && bufferValue < 10) {
                    setBufferValue('');
                  }
                }}
                className="buffer-value"
                type="number"
                min={0}
              />

              <div className="buffer-selector">
                <CustomSelect
                  options={bufferUnitOptions}
                  selected={bufferUnitSelected}
                  setSelected={setBufferUnitSelected}
                  placeholder="select buffer time unit..."
                  showArrow={true}
                />
              </div>
            </div>
          </div>

          <div className="my-conf-item-row">
            <label>conference type</label>

            <div className="my-conf-row-input">
              <CustomSelect
                options={conferenceOptions}
                selected={{
                  label: getSelectedLabel(confdata.conference_type, conferenceOptions),
                  value: confdata.conference_type,
                }}
                setSelected={(val: SelectParams) => {
                  confdata.conference_type = val.value as ConferenceType;
                  setConfData({ ...confdata });
                }}
                placeholder="select conference type..."
                showArrow={true}
              />
            </div>
          </div>

          <div className="my-conf-item-row">
            <label>days into future</label>

            <div className="my-conf-row-input">
              <CustomSelect
                options={daysIntoFutureOptions}
                selected={{
                  label: getSelectedLabel(confdata.visible_for_days, daysIntoFutureOptions),
                  value: confdata.visible_for_days,
                }}
                setSelected={(val: SelectParams) => {
                  confdata.visible_for_days = val.value;
                  setConfData({ ...confdata });
                }}
                placeholder="select days into future..."
                showArrow={true}
              />
            </div>
          </div>

          <div className="my-conf-item-row" style={{ margin: '25px 0 20px' }}>
            <label>confirm?</label>
            <div className="my-conf-action">
              <CustomButton label="Submit" disabled={disabled} onClick={onSubmit} type="primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyConfiguration;
