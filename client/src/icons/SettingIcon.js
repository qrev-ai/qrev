function SettingIcon({
  width = '24px',
  fill = '#303232',
  color = '#303232',
  background = 'transparent',
}) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ background, borderRadius: '32px' }}
    >
      <path
        d="M19 8.5C19 8.22386 18.7761 8 18.5 8H16.95C16.7 6.85 15.7 6 14.5 6C13.3 6 12.3 6.85 12.05 8H5.5C5.22386 8 5 8.22386 5 8.5C5 8.77614 5.22386 9 5.5 9H12.05C12.3 10.15 13.3 11 14.5 11C15.7 11 16.7 10.15 16.95 9H18.5C18.7761 9 19 8.77614 19 8.5ZM5 15.5C5 15.7761 5.22386 16 5.5 16H7.05C7.3 17.15 8.3 18 9.5 18C10.7 18 11.7 17.15 11.95 16H18.5C18.7761 16 19 15.7761 19 15.5C19 15.2239 18.7761 15 18.5 15H11.95C11.7 13.85 10.7 13 9.5 13C8.3 13 7.3 13.85 7.05 15H5.5C5.22386 15 5 15.2239 5 15.5Z"
        fill={fill}
      />
      <rect x="0.5" y="0.5" width="23" height="23" rx="11.5" stroke={color} />
    </svg>
  );
}

export default SettingIcon;
