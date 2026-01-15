export type UserType = {
  _id: string;
  email: string;
  roles?: string[];
};

export type UsersListType = {
  _id: string;
  email: string;
  name: string;
}[];
