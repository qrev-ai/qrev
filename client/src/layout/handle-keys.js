import Mousetrap from 'mousetrap';

export const SHORTCUT_KEYS = [
  /* main left-sidebar */
  {
    key: 'p d',
    route: '/',
  },
  {
    key: 'p c',
    route: '/chatbots',
  },
  {
    key: 'p i',
    route: '/insights',
  },
  {
    key: 'p p',
    route: '/campaigns',
  },
  {
    key: 'p r',
    route: '/crm',
  },
  {
    key: 'p s',
    route: '/scheduler',
  },
  {
    key: 'p a',
    route: '/apps',
  },
  {
    key: 'p t',
    route: '/settings',
  },

  /* OL, RL, CL create pages */
  {
    key: 'l',
    route: '/openlink/create',
  },
  {
    key: 'r l',
    route: '/robinlink/create',
  },
  {
    key: 'c l',
    route: '/collectivelink/create',
  },
];

export function registerKey(key, route, navigate) {
  Mousetrap.bind(key, (e) => {
    e.preventDefault();
    navigate(route);
  });
}

export function unRegisterKey(key) {
  Mousetrap.unbind(key);
}
