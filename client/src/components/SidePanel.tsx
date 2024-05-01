import React from 'react';
import useOnclickOutside from 'react-cool-onclickoutside';
import { useSelector } from 'react-redux';
import { StoreParams } from '../models/store';
import loadable from '@loadable/component';

const CloseIcon = loadable(() => import('../icons/CloseIcon'));

interface SidePanelProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  children: React.ReactNode;
  width?: string;
}

const SidePanel = ({ open, setOpen, children, width }: SidePanelProps): React.ReactElement => {
  const sidepanelRef = useOnclickOutside(() => onClose());

  const config = useSelector((state: StoreParams) => state.config);

  const onClose = () => {
    setOpen(false);
  };

  return (
    <div
      className={open ? 'app-sidepanel' : 'app-sidepanel app-sidepanel-hidden'}
      style={{ width }}
      ref={sidepanelRef}
    >
      <div className="app-sidepanel-container">
        <div className="app-sidepanel-close clickable" onClick={onClose}>
          <CloseIcon width="24px" fill={config.theme === 'dark' ? '#D4D4D6' : '#1e1c23'} />
        </div>

        <div className="app-sidepanel-children">{children}</div>
      </div>
    </div>
  );
};

export default SidePanel;
