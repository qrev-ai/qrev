export type StepsType = {
  title: string;
  subject?: string;
  content: string;
};

export const overviewSteps: StepsType[] = [
  {
    title: 'Step 1: Email - Day 1',
    subject: 'Subject',
    content:
      'Lorem ipsum {{dolor sit}} amet, consectetur adipiscing elit, sed do {{!eiusmod} tempor! incididunt} ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'Step 2: Email - Day 3',
    subject: 'Subject',
    content:
      'Lorem ipsum {{dolor sit}} amet, consectetur adipiscing elit, sed do {{!eiusmod} tempor! incididunt} ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    title: 'Step 2: WhatsApp - Day 6',
    content:
      'Lorem ipsum {{dolor sit}} amet, consectetur adipiscing elit, sed do {{!eiusmod} tempor! incididunt} ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
];
