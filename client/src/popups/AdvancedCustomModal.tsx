import React, { MouseEvent, useRef, useState, useEffect } from 'react';
import loadable from '@loadable/component';
import { SelectParams } from '../models/campaigns';
import { cloneDeep } from 'lodash';
import { CST_QTYPE_OPTIONS } from './const';
import { getNextSiblingFocus, getSelectedLabel } from '../utils/helper';
import { FormControlLabel, Checkbox } from '@mui/material';
import { CUSTOM_QUESTION_TYPE } from '../config/enums';
import { RoutingCustomQuestionParam, RoutingCustomQuestionOption } from '../models/routings';
import { CustomQuestionType } from '../models/enums';
import { v4 as uuid } from 'uuid';

const Modal = loadable(() => import('@mui/material/Modal'));
const CloseIcon = loadable(() => import('../icons/CloseIcon'));
const DeleteIcon = loadable(() => import('../icons/DeleteIcon'));
const CustomButton = loadable(() => import('../components/CustomButton'));
const CustomSelect = loadable(() => import('../components/CustomSelect'));

const FORM_IDS_LIST = ['cst-qtype-selector', 'cst-label-input'];

interface AdvancedCustomModalProps {
  open: boolean;
  editIndex: number;
  customQuestions: RoutingCustomQuestionParam[];
  setCustomQuestions: (val: RoutingCustomQuestionParam[]) => void;
  setOpen: (val: boolean) => void;
  disableOptions: string[];
}

const AdvancedCustomModal = ({
  open,
  setOpen,
  editIndex,
  customQuestions,
  setCustomQuestions,
  disableOptions,
}: AdvancedCustomModalProps): React.ReactElement => {
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);

  const [customQItem, setCustomQItem] = useState<RoutingCustomQuestionParam>({
    label: '',
    question: '',
    required: false,
    type: '',
    question_uuid: '',
    allowOnlyWorkEmail: false,
    answeroptions: [] as RoutingCustomQuestionOption[],
  });
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    if (editIndex > -1) {
      onPrefill();
    }
  }, [editIndex]);

  useEffect(() => {
    if (
      customQItem.question &&
      (((customQItem.type === CUSTOM_QUESTION_TYPE.dropdown ||
        customQItem.type === CUSTOM_QUESTION_TYPE.checkbox) &&
        customQItem.answeroptions.length >= 2 &&
        customQItem.answeroptions[0].value &&
        customQItem.answeroptions[1].value) ||
        customQItem.type === CUSTOM_QUESTION_TYPE.single ||
        customQItem.type === CUSTOM_QUESTION_TYPE.email ||
        customQItem.type === CUSTOM_QUESTION_TYPE.phone_number ||
        customQItem.type === CUSTOM_QUESTION_TYPE.booleancheckbox ||
        customQItem.type === CUSTOM_QUESTION_TYPE.paragraph_long_answer ||
        customQItem.type === CUSTOM_QUESTION_TYPE.date ||
        customQItem.type === CUSTOM_QUESTION_TYPE.number)
    ) {
      setDisabled(false);
    } else {
      setDisabled(true);
    }
  }, [customQItem]);

  const onClose = () => {
    setOpen(false);
  };

  const onPrefill = () => {
    if (initRef.current) return;

    initRef.current = true;

    const newCustomQItem = {
      ...customQItem,
      ...customQuestions[editIndex],
    };
    setCustomQItem(cloneDeep(newCustomQItem));
  };

  const onConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (editIndex > -1) {
      customQuestions[editIndex] = cloneDeep({
        ...customQuestions[editIndex],
        ...customQItem,
      });
    } else {
      customQuestions.push({
        ...customQItem,
        question_uuid: uuid(),
      });
    }

    setCustomQuestions([...customQuestions]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} className="ownership-modal">
      <div className="ownership-modal-container">
        <div className="ownership-modal-close" onClick={onClose}>
          <CloseIcon width="24px" fill="#7F7F83" />
        </div>

        <h2>{`${editIndex > -1 ? 'Update' : 'Add'} Custom Question`}</h2>

        <div ref={modalBodyRef} className="ownership-modal-body custom-q-modal-body no-scrollbar">
          <div className="queue-item-row">
            <label>type</label>

            <div className="queue-route-setting">
              <div className="queue-route-selector">
                <CustomSelect
                  options={
                    !disableOptions.length
                      ? CST_QTYPE_OPTIONS
                      : CST_QTYPE_OPTIONS.filter((v) => !disableOptions.includes(v.value))
                  }
                  selected={{
                    label: getSelectedLabel(customQItem.type, CST_QTYPE_OPTIONS),
                    value: customQItem.type,
                  }}
                  setSelected={(val: SelectParams) => {
                    customQItem.type = val.value as CustomQuestionType;
                    customQItem.label = val.label;
                    customQItem.answeroptions = [];
                    setCustomQItem({ ...customQItem });
                    getNextSiblingFocus('cst-qtype-selector', FORM_IDS_LIST);
                  }}
                  placeholder="select question type ..."
                  showArrow
                  inputId="cst-qtype-selector"
                  autoFocus={false}
                  openMenuOnFocus
                />
              </div>
            </div>
          </div>

          <div className="queue-item-row">
            <label>label</label>

            <input
              value={customQItem.question}
              onChange={(e) => {
                customQItem.question = e.target.value;
                setCustomQItem({ ...customQItem });
              }}
              placeholder="type label..."
              id="cst-label-input"
            />
          </div>

          {(customQItem.type === CUSTOM_QUESTION_TYPE.dropdown ||
            customQItem.type === CUSTOM_QUESTION_TYPE.radio_button ||
            customQItem.type === CUSTOM_QUESTION_TYPE.checkbox) &&
          customQItem.answeroptions.length ? (
            <React.Fragment>
              {customQItem.answeroptions.map((opt: RoutingCustomQuestionOption, iptx: number) => (
                <div className="queue-item-row" key={`opt-${customQItem.type}-${iptx}`}>
                  <label>{`option ${iptx + 1}`}</label>

                  <input
                    value={opt.value}
                    onChange={(e) => {
                      e.preventDefault();
                      customQItem.answeroptions[iptx].value = e.target.value;
                      setCustomQItem({ ...customQItem });
                    }}
                    placeholder="type option value..."
                  />

                  <div
                    className="opt-remove-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      customQItem.answeroptions.splice(iptx, 1);
                      setCustomQItem({ ...customQItem });
                    }}
                  >
                    <DeleteIcon width={12} fill="#7F7F83" />
                  </div>
                </div>
              ))}
            </React.Fragment>
          ) : null}

          {(customQItem.type === CUSTOM_QUESTION_TYPE.dropdown ||
            customQItem.type === CUSTOM_QUESTION_TYPE.radio_button ||
            customQItem.type === CUSTOM_QUESTION_TYPE.checkbox) && (
            <div className="queue-item-row">
              <p
                className="cst-add-opt-btn"
                onClick={(e) => {
                  e.preventDefault();
                  customQItem.answeroptions.push({ value: '' });
                  setCustomQItem({ ...customQItem });
                }}
              >
                + Add option
              </p>
            </div>
          )}

          <div className="queue-item-row">
            <div className="app-custom-checkbox">
              <FormControlLabel
                value="required"
                control={<Checkbox checked={customQItem.required} />}
                onChange={() => {
                  customQItem.required = !customQItem.required;
                  setCustomQItem({ ...customQItem });
                }}
                label="required"
                labelPlacement="end"
                style={{
                  justifyContent: 'space-between',
                }}
              />
            </div>
          </div>

          {customQItem.type === CUSTOM_QUESTION_TYPE.email && (
            <div className="queue-item-row">
              <div className="app-custom-checkbox">
                <FormControlLabel
                  value="required"
                  control={<Checkbox checked={customQItem.allowOnlyWorkEmail} />}
                  onChange={() => {
                    customQItem.allowOnlyWorkEmail = !customQItem.allowOnlyWorkEmail;
                    setCustomQItem({ ...customQItem });
                  }}
                  label="allow only work email ids"
                  labelPlacement="end"
                  style={{
                    justifyContent: 'space-between',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="ownership-modal-footer">
          <div className="ownership-create-btn">
            <CustomButton label="Cancel" type="primary" onClick={onClose} />
          </div>

          <div className="ownership-create-btn">
            <CustomButton
              label={editIndex > -1 ? 'Update' : 'Create'}
              type="success"
              onClick={onConfirm}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AdvancedCustomModal;
