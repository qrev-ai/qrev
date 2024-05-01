import React from 'react';
import loadable from '@loadable/component';

const SearchIcon = loadable(() => import('../icons/SearchIcon'));

interface CustomSearchProps {
  value: string;
  setValue: (val: string) => void;
  fill?: string;
  bgCol?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'date';
}

const CustomSearch = ({
  value,
  setValue,
  fill,
  bgCol,
  placeholder,
  type,
}: CustomSearchProps): React.ReactElement => {
  return (
    <div className="app-custom-search" style={{ background: bgCol || 'white' }}>
      <SearchIcon fill={fill || '#c9cbcb'} />
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        placeholder={placeholder || 'Search'}
        type={type || 'text'}
      />
    </div>
  );
};

export default CustomSearch;
