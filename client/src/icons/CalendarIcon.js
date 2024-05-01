function CalendarIcon({ width = '24px', fill = '#7F7F83' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 7.25C3 6.14543 3.89543 5.25 5 5.25H19C20.1046 5.25 21 6.14543 21 7.25V9.75H3V7.25Z"
        fill={fill}
      />
      <path d="M6 2.25H7.5V4.5H6V2.25Z" fill={fill} />
      <path d="M16.5 2.25H18V4.5H16.5V2.25Z" fill={fill} />
      <path
        d="M3 11.25H21V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V11.25Z"
        fill={fill}
      />
    </svg>
  );
}

export default CalendarIcon;
