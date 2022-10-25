export type User = {
  id: number;
  email: string;
  first_name: string;
}

export type GetUsersResponse = {
  data: User[];
}
