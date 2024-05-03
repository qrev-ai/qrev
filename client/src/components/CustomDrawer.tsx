interface Props {
  children: React.ReactNode;
  onClose: () => void;
  classes?: string;
}

export const CustomDrawer = ({ onClose, children, classes }: Props) => (
  <div className="fixed inset-0 top-[56px] md:top-0">
    <div
      className="fixed inset-0 z-30 hidden cursor-pointer bg-black opacity-50 md:block"
      onClick={onClose}
    />
    <div
      className={`absolute right-0 z-40 h-full w-full bg-white md:w-[calc(100%-250px)] xl:w-[600px] ${
        classes || ''
      }`}
    >
      {children}
    </div>
  </div>
);
