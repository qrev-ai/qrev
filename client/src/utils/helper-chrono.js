import moment from 'moment-timezone';

export const getRefinedChronoInput = (inputValue) => {
  if (!inputValue) return '';

  let result = inputValue.toLowerCase().trim();

  // replace "now" with current time
  if (result && result.includes('now')) {
    result = result.replace('now', moment(new Date().getTime()).format('h:mm a'));
  }

  return result;
};

const getMomentTimeFromChronoTime = (parsedChronoResult, detectedTimeZone) => {
  const timeKnown = parsedChronoResult.knownValues;
  const timeImplied = parsedChronoResult.impliedValues;

  let timeHour = timeKnown.hour ? timeKnown.hour : timeImplied.hour;
  let timeMinute = timeKnown.minute ? timeKnown.minute : timeImplied.minute;
  if (timeMinute === undefined) {
    // by default if minutes are 0 in the chrono implied or known values,
    // it assigns it as undefined. Hence we have to reassign it to 0.
    timeMinute = 0;
  }

  if (timeHour === undefined) {
    timeHour = 0;
  }

  const timeDay = timeKnown.day ? timeKnown.day : timeImplied.day;
  const timeMonth = timeKnown.month ? timeKnown.month : timeImplied.month;
  const timeYear = timeKnown.year ? timeKnown.year : timeImplied.year;

  const timeStr = `${timeYear}-${timeMonth}-${timeDay} ${timeHour}:${timeMinute}`;
  const timeInOtherTz = moment.tz(timeStr, 'YYYY-MM-DD kk:mm', detectedTimeZone);

  return timeInOtherTz;
};

const getStartAndEndTimeTranslated = (chronoResult, detectedTimeZone) => {
  const startTime = chronoResult.start;
  const endTime = chronoResult.end;

  const startTimeInOtherTz = getMomentTimeFromChronoTime(startTime, detectedTimeZone);

  let endTimeInOtherTz = null;

  if (chronoResult.hasOwnProperty('end') && chronoResult.end != null) {
    endTimeInOtherTz = getMomentTimeFromChronoTime(endTime, detectedTimeZone);
  } else {
    endTimeInOtherTz = startTimeInOtherTz;
  }
  const localizedTime = startTimeInOtherTz
    .clone()
    .tz(moment.tz.guess())
    .format('ddd, DD MMM, hh:mm a z');
  return {
    startTime: startTimeInOtherTz.valueOf(),
    endTime: endTimeInOtherTz.valueOf(),
    localizedTime,
  };
};

export const getStartAndEndTime = (chronoResult) => {
  const detectedTimeZone = moment.tz.guess();
  return getStartAndEndTimeTranslated(chronoResult, detectedTimeZone);
};
