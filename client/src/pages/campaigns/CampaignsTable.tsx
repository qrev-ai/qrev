import { useNavigate } from 'react-router-dom';
import { CampaignTableRowParams } from '../../models/campaigns';

interface CampaignsTableProps {
  data: CampaignTableRowParams[];
}

const CampaignsTable = ({ data }: CampaignsTableProps): React.ReactElement => {
  const navigate = useNavigate();

  const getPercentage = (prev: number, after: number) => {
    const percent = (prev / after) * 100;
    return !isNaN(percent) ? `${percent.toFixed(0)} %` : '--';
  };

  return (
    <div className="w-full h-full">
      <div className="flex items-center bg-[#E4E5E5] h-12 px-2 justify-between w-full text-[#787D7D] text-xs font-semibold">
        <p className="w-[15%]">Campaign Name</p>
        <p className="w-2/5">Current Prospects</p>
        <p className="w-[100px]">Contacted</p>
        <p className="w-[100px]">Opened</p>
        <p className="w-[100px]">Clicked</p>
        <p className="w-[100px]">Replied</p>
        <p className="w-[100px]">Booked</p>
      </div>
      <div className="[&>*:nth-child(even)]:bg-[#F9F9F8]">
        {data.map((item, index) => (
          <div className="h-[74px] px-2 py-4 flex items-center" key={`insight-row-${index}`}>
            <div
              className="flex items-center justify-between w-full text-sm"
              onClick={(e) => e.preventDefault()}
            >
              <p
                className="w-[15%] font-semibold cursor-pointer hover:text-[#264DAF] hover:underline"
                onClick={() => navigate(`/campaigns/details?id=${item._id}&name=${item.name}`)}
              >
                {item.name}
              </p>
              <p className="w-2/5 flex items-center gap-20">
                <p className="text-[#157A37] flex flex-col">
                  <span className="font-semibold">{item.current_prospects.active}</span>
                  <span className="text-xs">Active</span>
                </p>
                <p className="text-[#264DAF] flex flex-col">
                  <span className="font-semibold">0</span>
                  <span className="text-xs">Paused</span>
                </p>
                <p className="text-[#787D7D] flex flex-col">
                  <span className="font-semibold">0</span>
                  <span className="text-xs">Failed</span>
                </p>
                <p className="text-[#930000] flex flex-col">
                  <span className="font-semibold">{item.current_prospects.bounced}</span>
                  <span className="text-xs">Bounced</span>
                </p>
              </p>
              <p className="w-[100px]">{item.sequence_analytics.contacted}</p>
              <p className="w-[100px] flex flex-col">
                <span className="font-semibold">
                  {getPercentage(item.sequence_analytics.opened, item.sequence_analytics.contacted)}
                </span>
                {item.sequence_analytics.opened}
              </p>
              <p className="w-[100px] flex flex-col">
                <span className="font-semibold">
                  {getPercentage(
                    item.sequence_analytics.clicked,
                    item.sequence_analytics.contacted,
                  )}
                </span>
                {item.sequence_analytics.clicked}
              </p>
              <p className="w-[100px] flex flex-col">
                <span className="font-semibold">
                  {getPercentage(
                    item.sequence_analytics.replied,
                    item.sequence_analytics.contacted,
                  )}
                </span>
                {item.sequence_analytics.replied}
              </p>
              <p className="w-[100px] flex flex-col">
                <span className="font-semibold">
                  {getPercentage(item.sequence_analytics.booked, item.sequence_analytics.contacted)}
                </span>
                {item.sequence_analytics.booked}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignsTable;
