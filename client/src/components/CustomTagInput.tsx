import TagsInput from 'react-tagsinput';

import 'react-tagsinput/react-tagsinput.css';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export const CustomTagInput = ({ value, onChange, placeholder }: Props) => (
  <TagsInput
    value={value}
    onChange={onChange}
    inputProps={{ placeholder }}
    className="custom-tag-input w-full bg-white rounded shadow flex items-center min-h-12 p-2 pb-1"
  />
);
