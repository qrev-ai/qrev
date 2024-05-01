function DateIcon({ width = '24px', fill = '#303232' }) {
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
        d="M5.14283 2.85715H18.8879C20.1502 2.85715 21.1736 3.8805 21.1736 5.14286V18.8466C21.1736 20.0516 20.2412 21.0388 19.0585 21.126L18.8769 21.1323L5.13186 21.0663C3.87379 21.0603 2.85712 20.0387 2.85712 18.7806V5.14286C2.85712 3.8805 3.88047 2.85715 5.14283 2.85715Z"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.85712 7.42859H21.1737"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5714 17.7143C17.2026 17.7143 17.7142 17.2026 17.7142 16.5714C17.7142 15.9403 17.2026 15.4286 16.5714 15.4286C15.9402 15.4286 15.4285 15.9403 15.4285 16.5714C15.4285 17.2026 15.9402 17.7143 16.5714 17.7143Z"
        fill={fill}
      />
    </svg>
  );
}

export default DateIcon;
