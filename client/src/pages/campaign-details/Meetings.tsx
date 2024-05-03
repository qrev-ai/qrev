import momenttz from 'moment-timezone';
import { CampaignDetailsParams } from '../../models/campaigns';
import SearchIcon from '../../icons/SearchIcon';

interface MeetingsTableProps {
  data: CampaignDetailsParams[];
}

const MeetingsTable = ({ data }: MeetingsTableProps): React.ReactElement => {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xl font-semibold text-[#787d7d]">{data.length} meetings</p>
        <div className="w-[200px] h-[38px] flex items-center rounded border border-[#787d7d] p-1 gap-2">
          <SearchIcon width="28px" />
          <input className="w-full h-full outline-none" />
        </div>
      </div>
      <div className="w-full h-full">
        <div className="flex items-center bg-[#E4E5E5] h-12 px-2 justify-between w-full text-[#787D7D] text-xs font-semibold">
          <p className="w-[15%]">Prospect Name</p>
          <p className="w-[15%]">Prospect Email</p>
          <p className="w-[10%]">Prospect Number</p>
          <p className="w-[10%]">Organiser Name</p>
          <p className="w-[10%]">Organiser Email</p>
          <p className="w-[15%]">Meeting Start Time</p>
          <p className="w-[15%]">Booking Time</p>
        </div>
        <div className="[&>*:nth-child(even)]:bg-[#F9F9F8]">
          {data.map((item, index) => (
            <div className="h-[74px] px-2 py-4 flex items-center" key={`insight-row-${index}`}>
              <div
                className="flex items-center justify-between w-full text-sm"
                onClick={(e) => e.preventDefault()}
              >
                <p className="w-[15%] font-semibold">{item.prospect_name}</p>
                <p className="w-[15%]">{item.prospect_email}</p>
                <p className="w-[10%]">+{item.prospect_number}</p>
                <p className="w-[10%]">{item.organiser_name}</p>
                <p className="w-[10%]">{item.organiser_email}</p>
                <p className="w-[15%]">
                  {momenttz(new Date(item.meeting_start_time)).format('MMM DD, YYYY h:mm:ss a')}
                </p>
                <p className="w-[15%]">
                  {momenttz(new Date(item.booked_on_time)).format('MMM DD, YYYY h:mm:ss a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MeetingsTable;
