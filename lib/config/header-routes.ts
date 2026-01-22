export interface SubHeaderRoute {
  href: string;
  title: string;
}

export interface HeaderRoute {
  title: string;
  href: string;
  submenu: SubHeaderRoute[];
}

export const ROUTE_PATHS = {
  dmcheckData: '/dmcheck-data',
  ovenData: '/oven-data',
  deviations: '/deviations',
  failuresLv: '/failures/lv',
  inventory: '/inventory',

  newsAdd: '/news/add',
  itInventory: '/it-inventory',
  overtimeProduction: '/production-overtime',
  overtimeOrders: '/overtime-orders',
  individualOvertimeOrders: '/individual-overtime-orders',
  overtimeSubmissions: '/overtime-submissions',
  codesGenerator: '/codes-generator',
  projects: '/projects',
};

export const plHeaderRoutes: HeaderRoute[] = [
  {
    title: 'Produkcja',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.dmcheckData,
        title: 'DMCheck Data',
      },
      {
        href: ROUTE_PATHS.ovenData,
        title: 'Oven Data',
      },
      {
        href: ROUTE_PATHS.deviations,
        title: 'Odchylenia',
      },
      {
        href: ROUTE_PATHS.failuresLv,
        title: 'Awarie LV',
      },
    ],
  },
  {
    title: 'Pracownik',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.overtimeProduction,
        title: 'Zlecenia godzin nadliczbowych - produkcja',
      },
      {
        href: ROUTE_PATHS.overtimeOrders,
        title: 'Zbiorowe zlecenia pracy nadliczbowej',
      },
      {
        href: ROUTE_PATHS.individualOvertimeOrders,
        title: 'Zlecenia pracy nadliczbowej',
      },
      {
        href: ROUTE_PATHS.overtimeSubmissions,
        title: 'Nadgodziny',
      },
    ],
  },
  {
    title: 'Narzędzia',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.codesGenerator,
        title: 'Generator QR/Barcode/DMC',
      },
      {
        href: ROUTE_PATHS.inventory,
        title: 'Zatwierdzenie inwentaryzacji',
      },
    ],
  },
];

export const deHeaderRoutes: HeaderRoute[] = [
  {
    title: 'Produktion',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.dmcheckData,
        title: 'DMCheck Data',
      },
      {
        href: ROUTE_PATHS.ovenData,
        title: 'Ofen Daten',
      },
      {
        href: ROUTE_PATHS.deviations,
        title: 'Abweichungen',
      },
      {
        href: ROUTE_PATHS.failuresLv,
        title: 'LV Störungen',
      },
    ],
  },
  {
    title: 'Mitarbeiter',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.overtimeProduction,
        title: 'Überstundenaufträge - Produktion',
      },
      {
        href: ROUTE_PATHS.overtimeOrders,
        title: 'Sammel-Überstundenaufträge',
      },
      {
        href: ROUTE_PATHS.individualOvertimeOrders,
        title: 'Überstundenaufträge',
      },
      {
        href: ROUTE_PATHS.overtimeSubmissions,
        title: 'Überstunden',
      },
    ],
  },
  {
    title: 'Werkzeuge',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.codesGenerator,
        title: 'QR/Barcode/DMC Generator',
      },
      {
        href: ROUTE_PATHS.inventory,
        title: 'Inventurgenehmigung',
      },
    ],
  },
];

export const enHeaderRoutes: HeaderRoute[] = [
  {
    title: 'Production',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.dmcheckData,
        title: 'DMCheck Data',
      },
      {
        href: ROUTE_PATHS.ovenData,
        title: 'Oven Data',
      },
      {
        href: ROUTE_PATHS.deviations,
        title: 'Deviations',
      },
      {
        href: ROUTE_PATHS.failuresLv,
        title: 'LV Failures',
      },
    ],
  },
  {
    title: 'Employee',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.overtimeProduction,
        title: 'Overtime Orders - Production',
      },
      {
        href: ROUTE_PATHS.overtimeOrders,
        title: 'Group Overtime Orders',
      },
      {
        href: ROUTE_PATHS.individualOvertimeOrders,
        title: 'Overtime Orders',
      },
      {
        href: ROUTE_PATHS.overtimeSubmissions,
        title: 'Overtime',
      },
    ],
  },
  {
    title: 'Tools',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.codesGenerator,
        title: 'QR/Barcode/DMC Generator',
      },
      {
        href: ROUTE_PATHS.inventory,
        title: 'Inventory approval',
      },
    ],
  },
];

export const adminHeaderRoutes: HeaderRoute[] = [
  {
    title: 'Admin',
    href: '',
    submenu: [
      {
        href: ROUTE_PATHS.itInventory,
        title: 'IT Inventory',
      },
      {
        href: ROUTE_PATHS.projects,
        title: 'Projects',
      },
      {
        href: ROUTE_PATHS.newsAdd,
        title: 'Add news',
      },
    ],
  },
];
