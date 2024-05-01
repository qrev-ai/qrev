import React from 'react';
import { LoaderType, ThemeType } from '../models/enums';
import loadable from '@loadable/component';

const ReactLoading = loadable(() => import('react-loading'));

interface LoaderProps {
  type?: LoaderType;
  theme: ThemeType;
}
const Loader = ({ type, theme }: LoaderProps): React.ReactElement => {
  return (
    <div className="loader-container">
      <ReactLoading
        type={type || 'bubbles'}
        color={theme === 'dark' ? '#D2D2D2' : '#2a2930'}
        width="80px"
        height="80px"
      />
    </div>
  );
};

export default Loader;
