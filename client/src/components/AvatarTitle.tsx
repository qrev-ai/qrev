import React from 'react';

interface AvatarTitleProps {
  text: string;
  email: string;
}

const AvatarTitle = ({ text, email }: AvatarTitleProps): React.ReactElement => {
  return (
    <div className="app-avatar-title">
      <div className="app-avatar-title--avatar">
        <p>{email[0]}</p>
      </div>

      <p>{text}</p>
    </div>
  );
};

export default AvatarTitle;
