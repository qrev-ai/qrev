import React, { useState, MouseEvent } from 'react';
import { SelectParams } from '../models/campaigns';
import useOnclickOutside from 'react-cool-onclickoutside';
import loadable from '@loadable/component';

const CustomIconView = loadable(() => import('./CustomIconView'));

interface CustomDropdownProps {
  onSelectItem: (val: SelectParams) => void;
  options: SelectParams[];
  selected?: SelectParams;
  headertext?: string;
  preicon?: string;
  suficon?: string;
  suficonwidth?: string;
  preiconwidth?: string;
  fillicon?: string;
}

const CustomDropdown = ({
  onSelectItem,
  options,
  selected,
  preicon,
  suficon,
  suficonwidth,
  preiconwidth,
  headertext,
  fillicon,
}: CustomDropdownProps): React.ReactElement => {
  const dropdownRef = useOnclickOutside(() => onCloseDropdown());

  const [showDropdown, setShowDropdown] = useState(false);

  const onCloseDropdown = () => {
    setShowDropdown(false);
  };

  const onToggleShowDropdown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setShowDropdown(!showDropdown);
  };

  const onSelectRow = (item: SelectParams) => {
    setShowDropdown(false);
    onSelectItem(item);
  };

  return (
    <div ref={dropdownRef} className="app-custom-dropdown">
      <div className="app-custom-dropdown--header clickable" onClick={onToggleShowDropdown}>
        {preicon && (
          <div className="app-dropdown-preicon">
            <CustomIconView icon={preicon} width={preiconwidth || '20px'} fill={fillicon} />
          </div>
        )}

        <p className="app-custom-dropdown-header-text">{headertext || selected?.label}</p>

        {suficon && (
          <div className="app-dropdown-suficon">
            <CustomIconView icon={suficon} width={suficonwidth || '20px'} fill={fillicon} />
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="app-custom-dropdown--options no-scrollbar">
          {options.map((item: SelectParams, index: number) => (
            <div
              className="app-dropdown-row-item clickable"
              key={`app-row-item-${index}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectRow(item);
              }}
            >
              <p>{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
