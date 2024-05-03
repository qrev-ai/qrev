function SendIcon({ width = '48px', fill = '#2F4858', color = '#DDEB18' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="24" fill={fill} />
      <path
        d="M37.3333 24L12 34.6667L16.7507 24L12 13.3334L37.3333 24ZM37.3333 24H16.6667"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default SendIcon;
