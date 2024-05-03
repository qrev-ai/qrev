import React from 'react';
import { AllyPropsParams } from '../models/enums';

export const a11yProps = (index: number): AllyPropsParams => {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel = (props: TabPanelProps): React.ReactElement => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      className="app-custom-tab-panel"
    >
      {value === index && <React.Fragment>{children}</React.Fragment>}
    </div>
  );
};

export default CustomTabPanel;
