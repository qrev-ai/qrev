function ViewDetailsIcon({ width = '14px', fill = '#264DAF' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.33334 10.3333V3.66666C2.33334 2.93028 2.9303 2.33333 3.66668 2.33333H10.3333C11.0697 2.33333 11.6667 2.93028 11.6667 3.66666V10.3333C11.6667 11.0697 11.0697 11.6667 10.3333 11.6667H3.66668C2.9303 11.6667 2.33334 11.0697 2.33334 10.3333Z"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.3333 10.3333V3.66666C10.3333 2.93028 9.73638 2.33333 9 2.33333H10.3333C11 2.33333 11.6667 2.93028 11.6667 3.66666V10.3333C11.6667 11.0697 11 11.6667 10.3333 11.6667H9C9.73638 11.6667 10.3333 11.0697 10.3333 10.3333Z"
        fill={fill}
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 8.99999L9 6.99999L7 4.99999"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.00002 6.99999H3.66669"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ViewDetailsIcon;
