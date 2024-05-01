import React, { useState, useRef } from 'react';
import Select, { components } from 'react-select';
import { findIndex } from 'lodash';
import ArrowDown from '../icons/ArrowDown';

const { ValueContainer, Placeholder } = components;

export function CustomValueContainer({ children, ...props }) {
  return (
    <ValueContainer {...props}>
      <Placeholder {...props} isFocused={props.isFocused}>
        {props.selectProps.placeholder}
      </Placeholder>
      {React.Children.map(children, (child) =>
        child && child.type !== Placeholder ? child : null,
      )}
    </ValueContainer>
  );
}

function CustomSelect({
  options,
  selected,
  setSelected,
  placeholder = '',
  showArrow = false,
  ...props
}) {
  const selectRef = useRef(null);

  const [customValue, setCustomValue] = useState('');

  const onChangeCustomValue = (query, { action }) => {
    if (action === 'input-change') {
      setCustomValue(query);
    }
  };

  return (
    <div className={`app-select ${props.classes || ''}`}>
      <Select
        ref={selectRef}
        closeMenuOnSelect={!props.isMulti}
        value={selected}
        options={options}
        onChange={(value) => {
          setSelected(value);
          setCustomValue('');
        }}
        styles={colourStyles}
        components={{
          ValueContainer: CustomValueContainer,
        }}
        inputValue={customValue}
        onInputChange={onChangeCustomValue}
        noOptionsMessage={() => null}
        onKeyDown={(e) => {
          if (
            e.key === 'Enter' &&
            customValue &&
            findIndex(options, (o) =>
              o.value?.toLowerCase()?.includes(customValue?.toLowerCase()),
            ) < 0
          ) {
            setSelected({ value: customValue, label: customValue });
            setCustomValue('');
            selectRef.current?.blur();
          } else if (props.onEscape && (e.key === 'Escape' || e.key === '`')) {
            e.preventDefault();
            props.onEscape();
          }
        }}
        placeholder={selected?.length || selected?.value || customValue ? '' : placeholder}
        menuPosition="fixed"
        menuPlacement="auto"
        {...props}
      />

      {showArrow && (
        <div className="app-select-arrow">
          <ArrowDown fill="#787D7D" />
        </div>
      )}
    </div>
  );
}

export default CustomSelect;

export const colourStyles = {
  container: (styles) => ({
    ...styles,
  }),
  control: (styles, { isFocused }) => ({
    ...styles,
    border: '0px',
    background: 'transparent',
    boxShadow: 'none',
    borderRadius: '0px !important',
    color: isFocused ? '#000000' : '#303232',
    '&:hover': {
      ...styles[':hover'],
      border: 'none',
    },
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontSize: '14px',
    lineHeight: '18px',
    height: '100%',
  }),
  input: (styles) => ({
    ...styles,
    color: '#303232',
  }),
  singleValue: (styles) => ({
    ...styles,
    color: 'inherit',
    marginLeft: 0,
  }),
  valueContainer: (styles) => ({
    ...styles,
    paddingLeft: 0,
  }),
  indicatorSeparator: (styles) => ({ ...styles, display: 'none' }),
  indicatorsContainer: (styles) => ({
    ...styles,
    display: 'none',
  }),
  menu: (styles) => ({
    ...styles,
    background: '#FFFFFF',
    width: 'fit-content',
    minWidth: '100% !important',
    maxWidth: '100% !important',
    zIndex: 100000000,
    marginTop: 0,
  }),
  menuPortal: (styles) => ({ ...styles, zIndex: 100000000 }),
  option: (styles, { isDisabled, isFocused, isSelected }) => ({
    ...styles,
    background: isDisabled
      ? '#FFFFFF'
      : isSelected
        ? `${isFocused ? '#efedec' : '#FFFFFF'}`
        : isFocused
          ? '#efedec'
          : '#FFFFFF',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '10px center',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '14px',
    lineHeight: '30px',
    color: '#000000 !important',
    paddingLeft: '20px',
    paddingRight: '20px',
    cursor: isDisabled ? 'not-allowed' : 'default',
    height: '48px',
    borderLeft: isFocused ? '4px solid #D4D4D6' : '4px solid transparent',
    ':active': {
      ...styles[':active'],
      backgroundColor: '#efedec',
    },
    whiteSpace: 'nowrap !important',
    width: 'fit-content !important',
    minWidth: '100% !important',
    maxWidth: '100% !important',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  multiValueRemove: (styles) => ({
    ...styles,
    background: 'transparent',
    marginLeft: '8px',
    marginRight: '8px',
    borderRadius: '50%',
    color: '#606165',
    width: '20px',
    height: '20px',
    paddingLeft: '1px',
    paddingRight: '1px',
    '& svg': {
      width: '18px',
      height: '18px',
      flexShrink: 0,
    },
  }),
  multiValue: (styles, { data }) => ({
    ...styles,
    paddingTop: 3,
    paddingLeft: 9,
    paddingBottom: 3,
    backgroundColor: !data.isValid ? '#D4D4D6' : '#2A2930',
    borderRadius: '50px',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '12px',
    lineHeight: '14px',
    color: !data.isValid ? '#606165 !important' : '#303232 !important',
  }),
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '10px',
    lineHeight: '16px',
    color: data.isValid && 'rgba(255, 255, 255, 0.8) !important',
  }),
};
