import { useMemo, useState } from 'react';
import { SelectParams } from '../../models/campaigns';
import CustomSelect from '../../components/CustomSelect';
import { useSelector } from 'react-redux';
import { StoreParams } from '../../models/store';
import { campaignSenderList } from '../../utils/api-campaign';

const SettingsCampaign = (): React.ReactElement => {
  const [selected, setSelected] = useState<SelectParams[]>();
  const storeAccountUsers = useSelector((state: StoreParams) => state.data.accountUsers || []);
  const accountId = useSelector((state: StoreParams) => state.user.workspace?.cnt_account_id || '');

  const options = useMemo(
    () =>
      storeAccountUsers?.map((item) => ({
        label: item.email,
        value: item.email,
      })) || [],
    [storeAccountUsers],
  );

  const onSubmit = async () => {
    const res = await campaignSenderList(accountId, {
      sender_list: selected?.map((item) => item.value) || [],
    });
    console.log(res);
  };

  return (
    <div className="flex items-center justify-center h-2/3">
      <div className="w-[600px] rounded-lg shadow-xl p-8 bg-[#fdfdfc]">
        <p className="text-lg font-bold">Email Sender List</p>
        <div className="my-8">
          <CustomSelect
            options={options}
            selected={selected}
            setSelected={(val: SelectParams[]) => setSelected(val)}
            placeholder="Select emails ..."
            showArrow
            inputId="send-email-campaign-selector"
            autoFocus={false}
            isMulti
            openMenuOnFocus
            classes="border border-[#2f4858] rounded"
          />
        </div>
        <button
          onClick={onSubmit}
          className="border border-[#2f4858] px-4 py-1 rounded text-sm font-semibold"
        >
          Submit
        </button>
      </div>
    </div>
  );
};

export default SettingsCampaign;
