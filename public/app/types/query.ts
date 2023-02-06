import { DataQuery, DataSourceRef } from '@grafana/data';

export interface QueryGroupOptions {
  queries: DataQuery[];
  dataSource: QueryGroupDataSource;
  maxDataPoints?: number | null;
  minInterval?: string | null;
  cacheTimeout?: string | null;
  // *** START_OF_CHANGE ***
  intervalPBeast?: string | null;
  maxPBeast?: number | null;
  fillGap?: string | null;
  maxSelect?: boolean;
  refString?: string | null;
  errorBar?: boolean;
  beforeInterval?: string | null;
  afterInterval?: string | null;
  // *** END_OF_CHANGE ***
  timeRange?: {
    from?: string | null;
    shift?: string | null;
    hide?: boolean;
  };
}

export interface QueryGroupDataSource extends DataSourceRef {
  name?: string | null;
  default?: boolean;
}
