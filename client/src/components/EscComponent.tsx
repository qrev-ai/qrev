import React, { MouseEvent } from 'react';
import { useSelector } from 'react-redux';
import { StoreParams } from '../models/store';
import loadable from '@loadable/component';

const ShortCutButton = loadable(() => import('./ShortCutButton'));
const CloseIcon = loadable(() => import('../icons/CloseIcon'));

interface EscComponentProps {
  onEscape: () => void;
}

const EscComponent = ({ onEscape }: EscComponentProps): React.ReactElement => {
  const config = useSelector((state: StoreParams) => state.config);

  const onClose = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    onEscape();
  };

  return (
    <div className="esc-component">
      <div className="esc-close clickable" onClick={onClose}>
        <CloseIcon fill={config.theme === 'dark' ? '#7F7F83' : 'black'} width="24px" />
      </div>

      <p>or</p>

      <ShortCutButton content="esc" onClick={onClose} style={{ width: '40px' }} />
    </div>
  );
};

export default EscComponent;
