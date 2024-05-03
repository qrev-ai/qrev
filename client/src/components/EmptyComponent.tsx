import React, { MouseEvent } from 'react';

interface EmptyComponentProps {
  onCreate: (e: MouseEvent<HTMLSpanElement | HTMLButtonElement>) => void;
  note?: string;
  buttonTitle?: string;
}

const EmptyComponent = ({
  onCreate,
  note,
  buttonTitle,
}: EmptyComponentProps): React.ReactElement => {
  return (
    <div className="app-empty">
      <img
        src="https://trackapp-web.s3.us-east-2.amazonaws.com/dt/empty-openlinks.png"
        alt="empty-openlinks"
      />
      <p>
        {note || 'You have not yet created any chatbot.'}
        <span onClick={onCreate}>{buttonTitle || 'Create Chatbot'}</span>
        now!
      </p>
    </div>
  );
};

export default EmptyComponent;
