import React, { useState, MouseEvent } from 'react';
import Modal from '@mui/material/Modal';

import calendarLogo from '../../assets/images/calendar.png';

interface MiddleModalProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  handleGoogleLogin: () => void;
}
const MiddleModal = ({
  open,
  setOpen,
  handleGoogleLogin,
}: MiddleModalProps): React.ReactElement => {
  const [showMore, setShowMore] = useState(false);

  const handleContinue = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    setOpen(false);
    handleGoogleLogin();
  };

  return (
    <Modal className="middle-screen-modal" open={open} onClose={() => setOpen(false)}>
      <div className="middle-screen-container">
        <h2>Before you proceed</h2>
        <p>
          On the app permissions screen, please check all the boxes as shown below, for a seamless
          experience.
        </p>
        <div style={{ height: '50px' }}></div>
        <p style={{ marginBottom: '50px' }}>
          The use and transfer to any other app of information received from Google APIs will adhere
          to the{' '}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          <span
            onMouseOver={() => {
              setShowMore(true);
            }}
            onMouseLeave={() => {
              setShowMore(false);
            }}
          >
            Learn more
          </span>{' '}
          about how we use these permissions
        </p>
        <button onClick={handleContinue}>Continue</button>
        {showMore ? (
          <div className="middle-screen-container--learn-more">
            <p>How we use permissions:</p>
            <div className="learn-more-contents">
              <div className="learn-more-item">
                <div className="learn-more-item-icon">
                  <img src={calendarLogo} alt="calendar" />
                </div>
                <p>
                  Calendar: <span>Essential for sharing availability accurately. We</span> do not{' '}
                  <span>create or delete calendars.</span>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default MiddleModal;
