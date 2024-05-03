function RectPlusIcon({ width = '24px', fill = '#DDEB18' }) {
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
        d="M20 17.3333V6.66667C20 5.19391 18.8061 4 17.3333 4H6.66667C5.19391 4 4 5.19391 4 6.66667V17.3333C4 18.8061 5.19391 20 6.66667 20H17.3333C18.8061 20 20 18.8061 20 17.3333Z"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.99988V16.0745"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 12.0001H8"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default RectPlusIcon;
