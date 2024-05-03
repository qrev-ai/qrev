import { FiEdit3 } from 'react-icons/fi';
import { FaRegTrashAlt } from 'react-icons/fa';
import Switch from 'react-switch';

import { CampaignOverviewResponse } from '../../models/campaigns';

interface CampaignOverviewProps {
  data?: CampaignOverviewResponse;
}

const Overview = ({ data }: CampaignOverviewProps): React.ReactElement => {
  if (!data) return <div />;

  return (
    <div>
      <div className="flex items-center gap-8">
        <div className="flex items-center bg-[#f9f9f8] justify-between px-8 py-6 gap-8 rounded">
          <div className="flex flex-col text-center">
            <p className="text-2xl font-bold">{data.step_details?.steps}</p>
            <span className="text-sm text-[#787D7D]">Steps</span>
          </div>
          <div className="flex flex-col text-center">
            <p className="text-2xl font-bold">{data.step_details?.days}</p>
            <span className="text-sm text-[#787D7D]">Days</span>
          </div>
        </div>
        <div className="flex items-center bg-[#f9f9f8] justify-between px-8 py-6 gap-8 rounded">
          <div className="flex flex-col text-center text-[#157A37]">
            <p className="text-2xl font-bold">{data.current_prospects?.active}</p>
            <span className="text-sm">Actives</span>
          </div>
          <div className="flex flex-col text-center text-[#930000]">
            <p className="text-2xl font-bold">{data.current_prospects?.bounced}</p>
            <span className="text-sm">Bounced</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-10 mb-6">
        <p className="text-xl font-semibold text-[#787D7D]">
          {data.steps?.length} steps by interval
        </p>
        <div className="flex items-center gap-3">
          <button className="w-12 h-10 rounded border border-[#787D7D] flex items-center justify-center">
            <FiEdit3 color="#787D7D" size={20} />
          </button>
          <button className="w-12 h-10 rounded border border-[#787D7D] flex items-center justify-center">
            <FaRegTrashAlt color="#787D7D" size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-auto relative">
        {data.steps?.map((item, k) => (
          <div key={k} className="mb-8 bg-[#F9F9F8] px-6 py-4 rounded">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Switch
                  checked={item.active}
                  onChange={() => void 0}
                  onColor="#C9CBCB"
                  onHandleColor="#AEB1B1"
                  handleDiameter={22}
                  uncheckedIcon={false}
                  checkedIcon={false}
                  boxShadow="none"
                  activeBoxShadow="none"
                  height={12}
                  width={36}
                  className="react-switch"
                  id="material-switch"
                />
                <p className="text-sm text-[#787D7D] font-semibold uppercase">{item.type}</p>
              </div>
              <button className="flex items-center gap-2 text-sm text-[#787D7D]">
                <FiEdit3 size={16} />
                Edit
              </button>
            </div>
            {item.draft_type === 'ai_generated' ? (
              <div className="py-2">
                <span>AI-generated content</span>
              </div>
            ) : (
              <>
                <div className="border-b border-[#C9CBCB] py-2 text-xs font-semibold">Content</div>
                <div className="flex flex-col py-2">
                  {item.subject && <p className="text-[#303232] text-sm font-semibold">Subject</p>}
                  <p className="text-sm text-[#787D7D]">{item.body}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Overview;
