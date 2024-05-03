import { findIndex, capitalize } from 'lodash';
import { COLOR_THEME } from '../config/credential';
import { CUSTOM_QUESTION_TYPE, ROUTE_TO_TYPES } from '../config/enums';

export const getMappedOperatorLabel = () => {
  switch (val) {
    case 'eq':
      return 'equals to';
    case 'neq':
      return 'not equals';
    case 'gt':
      return 'greater than';
    case 'gte':
      return 'greater than or equals';
    case 'lt':
      return 'lesser than';
    case 'lte':
      return 'lesser than or equals';
    default:
      return val;
  }
};

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export const is_ms_account = (email, options) => {
  if (!email) return false;

  if (
    email.includes('outlook.com') ||
    email.includes('onmicrosoft.com') ||
    email.includes('onsurity.com') ||
    email.includes('avidityrewards')
  ) {
    return true;
  }
  if (options && options.length && options.includes(email)) {
    return true;
  }

  return false;
};

export const isMobile = () => {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a,
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4),
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor);
  return check;
};

export const onConvertGoogleAccount = (account) => ({
  email: account.email,
  fullname: account.displayName,
  id: account.uid,
  idToken: account.idToken,
  accessToken: account.accessToken,
  stateValue: account.stateValue,
  isPrimary: account.isPrimary || false,
  isEnabled: account.isEnabled || false,
  logo: (account.logo || account.email?.[0] || 'S').toUpperCase(),
  type: 'google',
  color: account.color || COLOR_THEME[0],
  isAzure: false,
  expiry: account.expiry || -1,
});

export const onConvertAzureAccount = (account, isPrimary, isEnabled, colorIndex) => ({
  email: account.email,
  fullname: account.name || account.username,
  id: account.id,
  idToken: account.details.idToken,
  accessToken: account.details.accessToken,
  stateValue: account.details.stateValue,
  isPrimary: isPrimary || false,
  isEnabled: isEnabled || false,
  logo: (account.email?.[0] || 'S').toUpperCase(),
  type: 'outlook',
  color: COLOR_THEME[colorIndex],
  isAzure: true,
  expiry: -1,
});

export const getTagValue = (event) => {
  let result = '';

  if (event.invitee_extra_questions && event.invitee_extra_questions.length) {
    const tagIndex = findIndex(event.invitee_extra_questions, (o) => o.type === 'tags' && o.status);

    if (tagIndex > -1) {
      result = event.invitee_extra_questions[tagIndex].value;
    }
  }

  return result;
};

export const getSelectedLabel = (value, options) => {
  const valueIndex = findIndex(options, (o) => o.value === value);
  if (valueIndex > -1) {
    return options[valueIndex].label;
  }
  return value;
};

export const getSelectObjFromText = (txt) => ({ label: getMappedOperatorLabel(txt), value: txt });

const getCSVNameFromUuid = (id, territories) => {
  let result = id;

  const idIndex = findIndex(territories, (o) => o.csv_uuid === id);
  if (idIndex > -1) {
    result = territories[idIndex].csv_name;
  }

  return result;
};

const getOptionalAnswer = (answerlist, qType, qOperator, territories) => {
  if (!answerlist || !answerlist.length) {
    return '';
  }

  let answer =
    qType === CUSTOM_QUESTION_TYPE.location
      ? getCSVNameFromUuid(answerlist[0], territories)
      : qType === CUSTOM_QUESTION_TYPE.date &&
          (qOperator === 'between' || qOperator === 'not between')
        ? `${answerlist[0].start} to ${answerlist[0].end}`
        : qType === CUSTOM_QUESTION_TYPE.date &&
            (qOperator === 'less than' || qOperator === 'more than')
          ? `${answerlist[0].number} ${answerlist[0].time_format} ${answerlist[0].time_direction}`
          : answerlist[0];

  if (answerlist.length >= 2) {
    for (let i = 1; i < answerlist.length; i++) {
      answer += ` or ${
        qType === CUSTOM_QUESTION_TYPE.location
          ? getCSVNameFromUuid(answerlist[i], territories)
          : qType === CUSTOM_QUESTION_TYPE.date &&
              (qOperator === 'between' || qOperator === 'not between')
            ? `${answerlist[i].start} to ${answerlist[i].end}`
            : qType === CUSTOM_QUESTION_TYPE.date &&
                (qOperator === 'less than' || qOperator === 'more than')
              ? `${answerlist[i].number} ${answerlist[i].time_format} ${answerlist[i].time_direction}`
              : answerlist[i]
      }`;
    }
  }

  return answer;
};

export const convertQuestionsToText = (questions, territories) => {
  let result = '';

  questions.forEach((q, index) => {
    if (index === 0) {
      result += `${capitalize(q.question.replace('_', ' '))} ${getMappedOperatorLabel(
        q.operator,
      )} ${getOptionalAnswer(q.answers, q.type || q.question, q.operator, territories)}`;
    } else {
      result += ` and ${capitalize(q.question.replace('_', ' '))} ${getMappedOperatorLabel(
        q.operator,
      )} ${getOptionalAnswer(q.answers, q.type || q.question, q.operator, territories)}`;
    }
  });

  return result;
};

export const getNextSiblingFocus = (id, formsIdList) => {
  const idIndex = formsIdList.indexOf(id);

  if (idIndex > -1) {
    let nextSibling = null;
    let counter = 0;

    let sibIndex = idIndex + 1;

    setTimeout(() => {
      while (!nextSibling && counter < formsIdList.length) {
        sibIndex %= formsIdList.length;

        nextSibling = document.getElementById(formsIdList[sibIndex]);
        if (nextSibling) {
          nextSibling.focus();
          break;
        }

        counter += 1;
        sibIndex += 1;
      }
    }, 200);
  } else {
  }
};

export const getTerritoriesIndexes = (routes) => {
  const results = {};

  if (routes && routes.length) {
    routes.forEach((r, irx) => {
      if (r.routeTo?.type === ROUTE_TO_TYPES.territory_owner && r.conditionalQuestions?.length) {
        r.conditionalQuestions.forEach((c, icx) => {
          c.questions.forEach((q, iqx) => {
            if (
              (q.type === CUSTOM_QUESTION_TYPE.location ||
                q.question === CUSTOM_QUESTION_TYPE.location) &&
              q.answers?.length
            ) {
              q.answers.forEach((tId, iax) => {
                results[tId] = {
                  routeIndex: irx,
                  condionalIndex: icx,
                  questionIndex: iqx,
                  answerIndex: iax,
                };
              });
            }
          });
        });
      }
    });
  }

  return results;
};

export const getSplitArray = (text) => {
  if (!text) return [];

  const textPtrs = text.split('\n');

  return textPtrs.map((v) => (v ? v.trim() : ''));
};
