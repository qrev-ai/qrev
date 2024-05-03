function CampaignsIcon({ width = '40px', fill = '#DDEB18' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 40 40"
      fill="none"
    >
      <path
        d="M4.76196 20L20.0001 27.619L35.2705 20"
        stroke={fill}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.76196 27.619L20.0001 35.2381L35.2705 27.619"
        stroke={fill}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.76196 12.68L20.0153 20L35.2705 12.68L20.0153 4.7619L4.76196 12.68Z"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CampaignsIcon;
