import type { Plant } from "./plant";

export interface SubHeaderRoute {
  href: string;
  title: string;
  plant?: Plant;
}

export interface HeaderRoute {
  title: string;
  href: string;
  submenu: SubHeaderRoute[];
}

export const ROUTE_PATHS = {
  dmcheckData: "/dmcheck-data",
  ovenData: "/oven-data",
  deviations: "/deviations",
  failuresLv: "/failures/lv",
  inventory: "/inventory",

  itInventory: "/it-inventory",
  overtimeOrders: "/overtime-orders",
  individualOvertimeOrders: "/individual-overtime-orders",
  overtimeSubmissions: "/overtime-submissions",
  competencyMatrix: "/competency-matrix",
  codesGenerator: "/codes-generator",
  projects: "/projects",
  employeeManagement: "/employee-management",
  dmcheckConfigs: "/dmcheck-configs",
  aviso: "/aviso",
  warehouseCorrections: "/warehouse-corrections",
};

export const plHeaderRoutes: HeaderRoute[] = [
  {
    title: "Produkcja",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.dmcheckData,
        title: "DMCheck Data",
      },
      {
        href: ROUTE_PATHS.ovenData,
        title: "Oven Data",
      },
      {
        href: ROUTE_PATHS.deviations,
        title: "Odchylenia",
      },
      {
        href: ROUTE_PATHS.failuresLv,
        title: "Awarie LV",
      },
    ],
  },
  {
    title: "Pracownik",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.overtimeOrders,
        title: "Zbiorowe zlecenia pracy nadliczbowej",
      },
      {
        href: ROUTE_PATHS.individualOvertimeOrders,
        title: "Zlecenia pracy nadliczbowej",
      },
      {
        href: ROUTE_PATHS.overtimeSubmissions,
        title: "Nadgodziny",
      },
      {
        href: ROUTE_PATHS.competencyMatrix,
        title: "Matrix kompetencji",
      },
    ],
  },
  {
    title: "Logistyka",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.aviso,
        title: "Awizacja",
      },
      {
        href: ROUTE_PATHS.warehouseCorrections,
        title: "Korekty magazynowe",
      },
    ],
  },
  {
    title: "Narzędzia",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.codesGenerator,
        title: "Generator QR/Barcode/DMC",
      },
      {
        href: ROUTE_PATHS.inventory,
        title: "Zatwierdzenie inwentaryzacji",
      },
    ],
  },
];

export const deHeaderRoutes: HeaderRoute[] = [
  {
    title: "Produktion",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.dmcheckData,
        title: "DMCheck Data",
      },
      {
        href: ROUTE_PATHS.ovenData,
        title: "Ofen Daten",
      },
      {
        href: ROUTE_PATHS.deviations,
        title: "Abweichungen",
      },
      {
        href: ROUTE_PATHS.failuresLv,
        title: "LV Störungen",
      },
    ],
  },
  {
    title: "Mitarbeiter",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.overtimeOrders,
        title: "Sammel-Überstundenaufträge",
      },
      {
        href: ROUTE_PATHS.individualOvertimeOrders,
        title: "Überstundenaufträge",
      },
      {
        href: ROUTE_PATHS.overtimeSubmissions,
        title: "Überstunden",
      },
      {
        href: ROUTE_PATHS.competencyMatrix,
        title: "Kompetenzmatrix",
      },
    ],
  },
  {
    title: "Logistik",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.aviso,
        title: "Avisierung",
      },
      {
        href: ROUTE_PATHS.warehouseCorrections,
        title: "Lagerkorrekturen",
      },
    ],
  },
  {
    title: "Werkzeuge",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.codesGenerator,
        title: "QR/Barcode/DMC Generator",
      },
      {
        href: ROUTE_PATHS.inventory,
        title: "Inventurgenehmigung",
      },
    ],
  },
];

export const enHeaderRoutes: HeaderRoute[] = [
  {
    title: "Production",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.dmcheckData,
        title: "DMCheck Data",
      },
      {
        href: ROUTE_PATHS.ovenData,
        title: "Oven Data",
      },
      {
        href: ROUTE_PATHS.deviations,
        title: "Deviations",
      },
      {
        href: ROUTE_PATHS.failuresLv,
        title: "LV Failures",
      },
    ],
  },
  {
    title: "Employee",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.overtimeOrders,
        title: "Collective Overtime Work Orders",
      },
      {
        href: ROUTE_PATHS.individualOvertimeOrders,
        title: "Overtime Orders",
      },
      {
        href: ROUTE_PATHS.overtimeSubmissions,
        title: "Overtime",
      },
      {
        href: ROUTE_PATHS.competencyMatrix,
        title: "Competency Matrix",
      },
    ],
  },
  {
    title: "Logistics",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.aviso,
        title: "Dock Scheduling",
      },
      {
        href: ROUTE_PATHS.warehouseCorrections,
        title: "Warehouse Corrections",
      },
    ],
  },
  {
    title: "Tools",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.codesGenerator,
        title: "QR/Barcode/DMC Generator",
      },
      {
        href: ROUTE_PATHS.inventory,
        title: "Inventory approval",
      },
    ],
  },
];

export const adminHeaderRoutes: HeaderRoute[] = [
  {
    title: "Admin",
    href: "",
    submenu: [
      {
        href: ROUTE_PATHS.itInventory,
        title: "IT Inventory",
      },
      {
        href: ROUTE_PATHS.projects,
        title: "Projects",
      },
      {
        href: ROUTE_PATHS.employeeManagement,
        title: "Employee Management",
        plant: "bri",
      },
      {
        href: ROUTE_PATHS.dmcheckConfigs,
        title: "DMCheck Configs",
      },
    ],
  },
];
