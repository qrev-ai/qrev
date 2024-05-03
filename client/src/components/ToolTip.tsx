import React from 'react';
import { PlacementType } from '../models/enums';
import loadable from '@loadable/component';

const Tooltip = loadable(() => import('@mui/material/Tooltip'));
const Typography = loadable(() => import('@mui/material/Typography'));

interface TooltipProps {
  title: string;
  options: string[];
  placement: PlacementType;
  description?: string;
  children: React.ReactElement;
}

const ToolTip = ({
  title,
  options,
  description,
  children,
  placement,
}: TooltipProps): React.ReactElement => {
  return (
    <div>
      <Tooltip
        title={
          <React.Fragment>
            <div>
              <div className="tooltip-container">
                <Typography color="inherit">{title}</Typography>

                {options.length > 0 ? (
                  <div className="tooltip-options-container">
                    {options.map((v, index) => (
                      <div className="tooltip-options" key={index}>
                        <Typography noWrap color="inherit">
                          {v}
                        </Typography>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {description && (
                <Typography gutterBottom variant="caption" color="inherit">
                  {description}
                </Typography>
              )}
            </div>
          </React.Fragment>
        }
        placement={placement}
      >
        {children}
      </Tooltip>
    </div>
  );
};

export default ToolTip;
