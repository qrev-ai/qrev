function SignOutIcon({ width = '14.000000pt', fill = '#D4D4D6' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.8125 5.875C13.2957 5.875 13.6875 5.48325 13.6875 5C13.6875 4.51675 13.2957 4.125 12.8125 4.125V5.875ZM12.8125 19.875C13.2957 19.875 13.6875 19.4832 13.6875 19C13.6875 18.5168 13.2957 18.125 12.8125 18.125V19.875ZM8.875 17V7H7.125V17H8.875ZM10 5.875H12.8125V4.125H10V5.875ZM12.8125 18.125H10V19.875H12.8125V18.125ZM8.875 7C8.875 6.37868 9.37868 5.875 10 5.875V4.125C8.41218 4.125 7.125 5.41218 7.125 7H8.875ZM7.125 17C7.125 18.5878 8.41218 19.875 10 19.875V18.125C9.37868 18.125 8.875 17.6213 8.875 17H7.125Z"
        fill={fill}
      />
      <path d="M11 12H17.7142" stroke={fill} strokeWidth="2" strokeLinecap="round" />
      <path
        d="M15.1328 16L19.1328 12L15.1328 8"
        stroke={fill}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <rect x="0.5" y="0.5" width="23" height="23" rx="11.5" stroke={fill} />
    </svg>
  );
}

export default SignOutIcon;
