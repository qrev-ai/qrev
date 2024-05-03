function MsgRefreshIcon({ width = '16px', fill = '#2F4858' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M3.61111 6.05553C4.45314 4.58171 6.06995 3.61108 7.88889 3.61108C10.5889 3.61108 12.7778 5.79991 12.7778 8.49997M12.1667 10.9444C11.3062 12.3418 9.65039 13.3889 7.88889 13.3889C5.18883 13.3889 3 11.2 3 8.49997"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.6664 6.05556H3.61084V3"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.11084 10.9446H12.1664V14.0001"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MsgRefreshIcon;
