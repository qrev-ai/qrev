import React, { MouseEvent } from 'react';
import { CustomButtonType } from '../models/enums';
import loadable from '@loadable/component';

const CustomIconView = loadable(() => import('./CustomIconView'));

interface CustomButtonProps {
  label: string;
  disabled?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  type: CustomButtonType;
  icon?: string;
  iconFill?: string;
  classes?: string;
}

const CustomButton = ({
  label,
  disabled,
  onClick,
  type,
  icon,
  iconFill,
  classes,
}: CustomButtonProps): React.ReactElement => {
  return (
    <button
      className={`${classes} ${
        !disabled
          ? `app-button app-button-${type}`
          : `app-button app-button-${type} app-button-disabled`
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {icon && <CustomIconView icon={icon} fill={iconFill} />}

      {label}
    </button>
  );
};

export default CustomButton;
