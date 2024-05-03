function AnalyticsIcon({ width = '24', fill = '#D4D4D6' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 21H18V11H21V21ZM16 21H13V8H16V21ZM11 21H8V5H11V21ZM6 21H3V13H6V21Z"
        fill={fill}
      />
    </svg>
  );
}

export default AnalyticsIcon;
