function MsgCopyIcon({ width = '16px', fill = '#2F4858' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.0477 9.52389V4.19056C11.0477 3.34898 10.3655 2.66675 9.52389 2.66675H4.19056C3.34898 2.66675 2.66675 3.34898 2.66675 4.19056V9.52389C2.66675 10.3655 3.34898 11.0477 4.19056 11.0477H9.52389C10.3655 11.0477 11.0477 10.3655 11.0477 9.52389Z"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.95239 11.0476V11.8095C4.95239 12.6511 5.63463 13.3333 6.4762 13.3333H11.8095C12.6511 13.3333 13.3333 12.6511 13.3333 11.8095V6.4762C13.3333 5.63463 12.6511 4.95239 11.8095 4.95239H11.0476"
        stroke={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default MsgCopyIcon;
