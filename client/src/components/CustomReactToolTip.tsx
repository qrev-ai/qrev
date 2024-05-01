import React from 'react';
import { Tooltip } from 'react-tooltip';

interface Props {
  children: React.ReactNode;
  id: string;
}

function CustomReactToolTip({ children, id }: Props) {
  return (
    <Tooltip id={id} place="bottom">
      <div className="global-main-tooltip-customize">{children}</div>
    </Tooltip>
  );
}

export default CustomReactToolTip;
