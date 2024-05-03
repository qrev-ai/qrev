function MsgSendIcon({ width = '16px', fill = '#2F4858' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 16 16"
      fill="none"
    >
      <g clipPath="url(#clip0_355_971)">
        <path
          d="M13.4247 7.59685L5.48862 7.61319"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M3.01293 13.0593L5.48885 7.61343L3.01275 2.66463L13.4076 7.61442L3.01293 13.0593Z"
          stroke={fill}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_355_971">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

export default MsgSendIcon;
