import { CUSTOM_QUESTION_TYPE } from '../config/enums';
import { SelectParams } from '../models/campaigns';

export const CST_QTYPE_OPTIONS = [
  { label: 'Short Text', value: CUSTOM_QUESTION_TYPE.single },
  { label: 'Email', value: CUSTOM_QUESTION_TYPE.email },
  { label: 'Phone Number', value: CUSTOM_QUESTION_TYPE.phone_number },
  { label: 'Dropdown', value: CUSTOM_QUESTION_TYPE.dropdown },
  { label: 'Multi Checkbox', value: CUSTOM_QUESTION_TYPE.checkbox },
  { label: 'Checkbox', value: CUSTOM_QUESTION_TYPE.booleancheckbox },
  { label: 'Number', value: CUSTOM_QUESTION_TYPE.number },
  { label: 'Radio Button', value: CUSTOM_QUESTION_TYPE.radio_button },
  {
    label: 'Paragraph / Long Answer',
    value: CUSTOM_QUESTION_TYPE.paragraph_long_answer,
  },
  { label: 'Date', value: CUSTOM_QUESTION_TYPE.date },
];

export const weightOptions = [
  { label: '1' },
  { label: '2' },
  { label: '3' },
  { label: '4' },
  { label: '5' },
  { label: '6' },
  { label: '7' },
  { label: '8' },
  { label: '9' },
  { label: '10' },
].map((v) => ({
  value: v.label,
  label: v.label,
})) as SelectParams[];

export const regionBasedOptions = [
  { label: 'Asia', value: 'Asia' },
  { label: 'North America', value: 'North America' },
  { label: 'South America', value: 'South America' },
  { label: 'Europe', value: 'Europe' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Africa & Middle East', value: 'Africa' },
  { label: 'Pacific', value: 'Pacific' },
] as SelectParams[];
