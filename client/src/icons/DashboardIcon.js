function DashboardIcon({ width = '24px', fill = '#DDEB18' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.57143 3H18.4286C19.8487 3 21 4.15127 21 5.57143V18.4286C21 19.8487 19.8487 21 18.4286 21H5.57143C4.15127 21 3 19.8487 3 18.4286V5.57143C3 4.15127 4.15127 3 5.57143 3Z"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.14288 17.0593V6.85718"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 17.1236V12"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8571 17.1428V9.42853"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default DashboardIcon;
