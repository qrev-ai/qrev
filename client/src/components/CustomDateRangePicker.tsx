import React, { useState, MouseEvent } from 'react';
import useOnclickOutside from 'react-cool-onclickoutside';
import moment from 'moment';
import loadable from '@loadable/component';
import { TimeRangeParams } from '../models/dashboard';
import momenttz from 'moment-timezone';
import { Calendar, DayRange } from '@hassanmojab/react-modern-calendar-datepicker';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';
import '../styles/date-range-picker.scss';

const DateIcon = loadable(() => import('../icons/DateIcon'));
const CustomButton = loadable(() => import('./CustomButton'));

export const getDaysInMonth = (m: number, y: number): number => {
  return m === 2 ? (y & 3 || (!(y % 25) && y & 15) ? 28 : 29) : 30 + ((m + (m >> 3)) & 1);
};

export const getTextFromSelectedRange = (val: DayRange): string => {
  if (!val.from || !val.to) return '';

  return (
    moment(`${val.from.year}-${val.from.month}-${val.from.day}`, 'YYYY-M-D').format('DD/MM') +
    ' - ' +
    moment(`${val.to.year}-${val.to.month}-${val.to.day}`, 'YYYY-M-D').format('DD/MM, YYYY')
  );
};

const todayDate = new Date(),
  thisyear = todayDate.getFullYear(),
  thismonth = todayDate.getMonth() + 1,
  thisdate = todayDate.getDate();

const defaultFrom = {
  year: thisyear,
  month: thismonth,
  day: thisdate,
};
const defaultTo = {
  year: thisyear,
  month: thismonth,
  day: getDaysInMonth(thismonth, thisyear),
};

const defaultValue = {
  from: defaultFrom,
  to: defaultTo,
};

interface CustomDateRangePickerProps {
  setTimeRange: (val: TimeRangeParams) => void;
}

const CustomDateRangePicker = ({
  setTimeRange,
}: CustomDateRangePickerProps): React.ReactElement => {
  const pickerRef = useOnclickOutside(() => onCloseDropdown());

  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDayRange, setSelectedDayRange] = useState<DayRange>(defaultValue);
  const [rangeSelected, setRangeSelected] = useState(false);

  const onToggleShowDropdown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowDropdown(!showDropdown);
  };

  const onCloseDropdown = () => {
    setShowDropdown(false);
  };

  const onConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setRangeSelected(true);
    onCloseDropdown();

    const fromDateString = `${selectedDayRange.from?.year}-${selectedDayRange.from?.month}-${selectedDayRange.from?.day}`,
      toDateString = `${selectedDayRange.to?.year}-${selectedDayRange.to?.month}-${selectedDayRange.to?.day}`;

    if (fromDateString && toDateString) {
      const timeRangeStart = momenttz(fromDateString, 'YYYY-MM-DD').startOf('day').valueOf(),
        timeRangeEnd = momenttz(toDateString, 'YYYY-MM-DD').endOf('day').valueOf();

      setTimeRange({
        type: 'other',
        value: {
          start: timeRangeStart,
          end: timeRangeEnd,
        },
      });
    }
  };

  const onCancel = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setRangeSelected(false);
    onCloseDropdown();

    setSelectedDayRange(defaultValue);
    setTimeRange({
      type: 'all_time',
      value: { start: 0, end: 0 },
    });
  };

  return (
    <div ref={pickerRef} className="app-custom-date-picker">
      <div className="app-picker-clicker" onClick={onToggleShowDropdown}>
        <input
          placeholder="Select Date Range"
          defaultValue={rangeSelected ? getTextFromSelectedRange(selectedDayRange) : ''}
        />

        <div className="picker-icon clickable">
          <DateIcon />
        </div>
      </div>

      {showDropdown && (
        <div className="app-custom-date-picker-dropdown">
          <div className="picker-calendar-area">
            <Calendar
              value={selectedDayRange}
              onChange={setSelectedDayRange}
              colorPrimary="#009D9A"
              colorPrimaryLight="#D9FBFB"
              shouldHighlightWeekends
              calendarClassName="custom-picker-calendar"
            />
          </div>

          <div className="picker-confirm">
            <div className="picker-confirm-button">
              <CustomButton type="error" onClick={onCancel} label="Cancel" />
            </div>

            <div className="picker-confirm-button">
              <CustomButton type="primary" onClick={onConfirm} label="Confirm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateRangePicker;
