function EditExperienceIcon({ width = '18px', fill = '#264DAF' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 18 18"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.4286 1.57155C17.3753 2.51832 17.3753 4.05335 16.4286 5.00012L5.57143 15.8573L1 17.0001L2.14286 12.4931L13.0044 1.57592C13.8992 0.676495 15.3258 0.627993 16.2779 1.43299L16.4286 1.57155Z"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.85712 17.0001H17"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.7143 4.42871L15.8572 5.57157"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default EditExperienceIcon;
