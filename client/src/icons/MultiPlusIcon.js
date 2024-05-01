function MultiPlusIcon({ width = '20px', fill = '#264DAF' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.1428 12.2857V3.14289C19.1428 1.88053 18.1195 0.857178 16.8571 0.857178H7.71424C6.45188 0.857178 5.42853 1.88053 5.42853 3.14289V12.2857C5.42853 13.5481 6.45188 14.5715 7.71424 14.5715H16.8571C18.1195 14.5715 19.1428 13.5481 19.1428 12.2857Z"
        stroke={fill}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.42855 5.43256H3.14283C1.88047 5.43256 0.857117 6.45591 0.857117 7.71827V16.8572C0.857117 18.1195 1.88047 19.1429 3.14283 19.1429H3.14678L12.2896 19.1271C13.5505 19.1249 14.5714 18.1022 14.5714 16.8414V14.5754"
        stroke={fill}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.2857 4.28577V11.1429"
        stroke={fill}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.7142 7.71429H8.85709"
        stroke={fill}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MultiPlusIcon;
