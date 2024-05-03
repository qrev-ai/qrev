function MsgEditIcon({ width = '16px', fill = '#2F4858' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.9525 3.04762C13.5836 3.6788 13.5836 4.70215 12.9525 5.33333L5.71437 12.5714L2.66675 13.3333L3.42865 10.3286L10.6697 3.05053C11.2662 2.45092 12.2173 2.41858 12.852 2.95524L12.9525 3.04762Z"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.23828 13.3333H13.3335"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.8096 4.95239L12.5715 5.7143"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MsgEditIcon;
