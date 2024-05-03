import React, { useState, useEffect, MouseEvent } from 'react';
import ImageUploader from 'react-image-upload';
import DeleteIcon from '../../icons/DeleteIcon';
import EditIcon from '../../icons/EditIcon';
import SaveIcon from '../../icons/SaveIcon';
import { useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';
import loadable from '@loadable/component';

const CustomButton = loadable(() => import('../../components/CustomButton'));

const AVATAR_UPLOAD_STATUS = {
  uploaded: 'uploaded',
  removed: 'removed',
  same: 'same',
};

const MyProfile = (): React.ReactElement => {
  const accounts = useSelector((state: StoreParams) => state.user.accounts);
  const primaryEmail = useSelector((state: StoreParams) => state.user.primaryEmail);
  const account = accounts[primaryEmail];

  const [avatarFile, setAvatarFile] = useState<any>(null);
  const [avatarUploadStatus, setAvatarUploadStatus] = useState(AVATAR_UPLOAD_STATUS.same);
  const [personal, setPersonal] = useState({
    firstName: account.first_name,
    lastName: account.last_name,
    email: primaryEmail,
    phone: account.phone_number,
    avatar: null,
  });
  const [isEditFName, setIsEditFName] = useState(false);
  const [isEditLName, setIsEditLName] = useState(false);
  const [isEditEmail, setIsEditEmail] = useState(false);
  const [isEditPhone, setIsEditPhone] = useState(false);
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    if (
      isEditFName ||
      isEditLName ||
      isEditEmail ||
      isEditPhone ||
      !personal ||
      !personal.firstName ||
      !personal.lastName ||
      !personal.email
    ) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [isEditFName, isEditLName, isEditEmail, isEditPhone, personal]);

  const getImageFileObject = (imageFile: any) => {
    if (imageFile && imageFile.dataUrl && imageFile.file) {
      personal.avatar = imageFile.dataUrl;
      setPersonal({ ...personal });
      setAvatarFile(imageFile.file);
      setAvatarUploadStatus(AVATAR_UPLOAD_STATUS.uploaded);
    }
  };

  const runAfterImageDelete = (file: any) => {
    personal.avatar = null;
    setPersonal({ ...personal });

    if (file && file.file) {
      setAvatarFile(file.file);
      setAvatarUploadStatus(AVATAR_UPLOAD_STATUS.removed);
    }
  };

  const onSubmit = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('user_primary_email', primaryEmail);
    formData.append('account_state', account.stateValue);
    formData.append('account_type', account.type);
    formData.append('profile_first_name', personal.firstName);
    formData.append('profile_last_name', personal.lastName);
    formData.append('profile_email', personal.email);
    formData.append('profile_phone_number', personal.phone);

    formData.append('image', avatarFile);
    formData.append('image_upload_status', avatarUploadStatus);

    console.log('onsubmit', personal, formData);
  };

  return (
    <div className="my-profile">
      <p>Manage your profile picture, personal details and other meeting details</p>

      <div className="my-profile--details">
        <div
          className={
            personal.avatar ? 'personal-pic-uploader uploader-with-image' : 'personal-pic-uploader'
          }
        >
          <div className="uploader-preview-pic">
            {!personal.avatar ? (
              <p>{personal.firstName?.[0]?.toUpperCase()}</p>
            ) : (
              <img src={personal.avatar} alt="personal-pic" />
            )}
          </div>

          <ImageUploader
            onFileAdded={(img) => getImageFileObject(img)}
            onFileRemoved={(img) => runAfterImageDelete(img)}
            deleteIcon={<DeleteIcon fill="#2a2930" />}
          />
        </div>

        <div className="personal-details">
          <p className="personal-details--header">Personal Details</p>

          <div className="personal-details--row">
            <label>first name</label>
            <div>
              {!isEditFName && personal.firstName && (
                <p className="personal-editable">{personal.firstName}</p>
              )}

              {isEditFName && (
                <input
                  placeholder="type firstName..."
                  value={personal.firstName}
                  onChange={(e) => {
                    personal.firstName = e.target.value;
                    setPersonal({ ...personal });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditFName(false);
                    }
                  }}
                />
              )}

              <div
                className="personal-edit-action"
                onClick={() => {
                  setIsEditFName(!isEditFName);
                }}
              >
                {!isEditFName ? (
                  <EditIcon width="12px" fill="#D4D4D6" />
                ) : (
                  <SaveIcon width="14px" fill="#D4D4D6" />
                )}
              </div>
            </div>
          </div>

          <div className="personal-details--row">
            <label>last name</label>
            <div>
              {!isEditLName && personal.lastName && (
                <p className="personal-editable">{personal.lastName}</p>
              )}

              {isEditLName && (
                <input
                  placeholder="type lastName..."
                  value={personal.lastName}
                  onChange={(e) => {
                    personal.lastName = e.target.value;
                    setPersonal({ ...personal });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditLName(false);
                    }
                  }}
                />
              )}

              <div
                className="personal-edit-action"
                onClick={() => {
                  setIsEditLName(!isEditLName);
                }}
              >
                {!isEditLName ? (
                  <EditIcon width="12px" fill="#D4D4D6" />
                ) : (
                  <SaveIcon width="14px" fill="#D4D4D6" />
                )}
              </div>
            </div>
          </div>

          <div className="personal-details--row">
            <label>email</label>
            <div>
              {!isEditEmail && personal.email && (
                <p className="personal-editable">{personal.email}</p>
              )}

              {isEditEmail && (
                <input
                  placeholder="type email..."
                  value={personal.email}
                  onChange={(e) => {
                    personal.email = e.target.value;
                    setPersonal({ ...personal });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditEmail(false);
                    }
                  }}
                />
              )}

              <div
                className="personal-edit-action"
                onClick={() => {
                  setIsEditEmail(!isEditEmail);
                }}
              >
                {!isEditEmail ? (
                  <EditIcon width="12px" fill="#D4D4D6" />
                ) : (
                  <SaveIcon width="14px" fill="#D4D4D6" />
                )}
              </div>
            </div>
          </div>

          <div className="personal-details--row">
            <label>phone number</label>
            <div>
              {!isEditPhone && personal.phone && (
                <p className="personal-editable">{personal.phone}</p>
              )}

              {isEditPhone && (
                <input
                  placeholder="type phone..."
                  value={personal.phone}
                  onChange={(e) => {
                    personal.phone = e.target.value;
                    setPersonal({ ...personal });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditPhone(false);
                    }
                  }}
                />
              )}

              <div
                className="personal-edit-action"
                onClick={() => {
                  setIsEditPhone(!isEditPhone);
                }}
              >
                {!isEditPhone ? (
                  <EditIcon width="12px" fill="#D4D4D6" />
                ) : (
                  <SaveIcon width="14px" fill="#D4D4D6" />
                )}
              </div>
            </div>
          </div>

          <div className="personal-details--row">
            <div className="personal-details-submit">
              <CustomButton type="primary" label="Submit" disabled={disabled} onClick={onSubmit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
