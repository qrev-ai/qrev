interface TagbuttonProps {
  children: React.ReactNode;
  name: string;
  action?: () => void;
}

export const Tagbutton = ({ children, name, action }: TagbuttonProps) => (
  <div
    onClick={action}
    className="flex items-center gap-2 h-8 shadow-md rounded px-2 border border-[#efedec] justify-center cursor-pointer"
  >
    {children}
    <span className="text-sm">{name}</span>
  </div>
);
