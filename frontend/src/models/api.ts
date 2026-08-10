export interface ApiProblem {
  title: string;
  status: number;
  detail?: string;
  correlationId?: string;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}
