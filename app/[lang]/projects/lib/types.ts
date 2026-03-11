import { ProjectsType } from "./zod";

export type ProjectsLocaleStringType = ProjectsType & {
  dateLocaleString: string;
};
