import React from 'react';
import loadable from '@loadable/component';

const AlertIcon = loadable(() => import('../icons/AlertIcon'));
const ICPWarningIcon = loadable(() => import('../icons/ICPWarningIcon'));
const ArrowDown = loadable(() => import('../icons/ArrowDown'));
const DashedRectIcon = loadable(() => import('../icons/DashedRectIcon'));
const RectPlusIcon = loadable(() => import('../icons/RectPlusIcon'));

interface CustomIconViewProps {
  icon: string;
  width?: string;
  fill?: string;
}

const CustomIconView = ({ icon, width, fill }: CustomIconViewProps): React.ReactElement => {
  return (
    <React.Fragment>
      {icon === 'alert' && <AlertIcon width={width} fill={fill} />}

      {icon === 'icp_warning' && <ICPWarningIcon width={width} fill={fill} />}

      {icon === 'arrow_down' && (
        <ArrowDown width={width} fill={fill} style={{ transform: 'rotate(180deg)' }} />
      )}

      {icon === 'dashed_rect' && <DashedRectIcon width={width} fill={fill} />}

      {icon === 'rect_plus' && <RectPlusIcon width={width} fill={fill} />}
    </React.Fragment>
  );
};

export default CustomIconView;
