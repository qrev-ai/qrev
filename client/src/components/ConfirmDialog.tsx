import React, { MouseEvent } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CustomButton from './CustomButton';

interface ConfirmDialogProps {
  open: boolean;
  setOpen: (val: boolean) => void;
  onConfirm: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  description?: string;
}

const ConfirmDialog = ({
  open,
  setOpen,
  onConfirm,
  title,
  description,
}: ConfirmDialogProps): React.ReactElement => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOpen(false);
  };

  return (
    <div>
      <Dialog
        fullScreen={fullScreen}
        open={open}
        onClose={handleClose}
        aria-labelledby="responsive-dialog-title"
        className="app-confirm-dialog"
      >
        <DialogTitle id="responsive-dialog-title">
          {title || "Use Google's location service?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {description ||
              'Let Google help apps determine location. This means sending anonymous location data to Google, even when no apps are running.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <CustomButton onClick={handleClose} label="Cancel" type="primary" />
          <CustomButton onClick={onConfirm} label="Confirm" type="error" />
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ConfirmDialog;
