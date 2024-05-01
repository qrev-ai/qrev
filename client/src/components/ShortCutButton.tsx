import React, { MouseEvent } from 'react';

interface ShortCutButtonProps {
  content: string;
  active?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
}
const ShortCutButton = ({
  content,
  active,
  style,
  onClick,
  className,
}: ShortCutButtonProps): React.ReactElement => {
  return (
    <div
      className={className ? `shortcut-button ${className}` : 'shortcut-button'}
      style={{
        borderBottom: active ? '2px solid white' : '2px solid #7F7F83',
        ...style,
      }}
      onClick={onClick}
    >
      {content}
    </div>
  );
};

export default ShortCutButton;
