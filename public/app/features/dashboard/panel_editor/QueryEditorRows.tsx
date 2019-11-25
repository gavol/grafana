// Libraries
import React, { PureComponent } from 'react';

// @ts-ignore ignoring this for now, otherwise we would have to extend _ interface with move
import _ from 'lodash';

// Types
import { PanelModel } from '../state/PanelModel';
import { DataQuery, PanelData, DataSourceSelectItem } from '@grafana/data';
import { DashboardModel } from '../state/DashboardModel';
import { QueryEditorRow } from './QueryEditorRow';
import { addQuery } from 'app/core/utils/query';
//*** START_OF_CHANGE ***
import { QueryEditorOptions } from './QueryEditorOptions';
//*** END_OF_CHANGE ***

interface Props {
  // The query configuration
  queries: DataQuery[];
  datasource: DataSourceSelectItem;

  // Query editing
  onChangeQueries: (queries: DataQuery[]) => void;
  onScrollBottom: () => void;

  // Dashboard Configs
  panel: PanelModel;
  dashboard: DashboardModel;

  // Query Response Data
  data: PanelData;
}

export class QueryEditorRows extends PureComponent<Props> {
  onAddQuery = (query?: Partial<DataQuery>) => {
    const { queries, onChangeQueries } = this.props;
    onChangeQueries(addQuery(queries, query));
    this.props.onScrollBottom();
  };

  onRemoveQuery = (query: DataQuery) => {
    const { queries, onChangeQueries, panel } = this.props;
    const removed = queries.filter(q => {
      return q !== query;
    });
    onChangeQueries(removed);
    panel.refresh();
  };

  onMoveQuery = (query: DataQuery, direction: number) => {
    const { queries, onChangeQueries, panel } = this.props;

    const index = _.indexOf(queries, query);
    // @ts-ignore
    _.move(queries, index, index + direction);
    onChangeQueries(queries);
    panel.refresh();
  };

  onChangeQuery(query: DataQuery, index: number) {
    const { queries, onChangeQueries } = this.props;

    // ensure refId is maintained
    query.refId = queries[index].refId;

    // update query in array
    onChangeQueries(
      queries.map((item, itemIndex) => {
        if (itemIndex === index) {
          return query;
        }
        return item;
      })
    );
  }

  render() {
    const { props } = this;
    return (
      /* *** START_OF_CHANGE *** */
      <>
        {/* *** END_OF_CHANGE *** */}
        <div className="query-editor-rows">
          {props.queries.map((query, index) => (
            <QueryEditorRow
              dataSourceValue={query.datasource || props.datasource.value}
              key={query.refId}
              panel={props.panel}
              dashboard={props.dashboard}
              data={props.data}
              query={query}
              onChange={query => this.onChangeQuery(query, index)}
              onRemoveQuery={this.onRemoveQuery}
              onAddQuery={this.onAddQuery}
              onMoveQuery={this.onMoveQuery}
              inMixedMode={props.datasource.meta.mixed}
            />
          ))}
        </div>
        {/* *** START_OF_CHANGE *** */}
        <div className="query-editor-options">
          <QueryEditorOptions
            dataSourceValue={props.panel.targets[0].datasource || props.panel.datasource}
            key={props.panel.targets[0].refId}
            panel={props.panel}
            dashboard={props.dashboard}
            data={props.data}
            query={props.panel.targets[0]}
            onChange={query => this.onChangeQuery(query, 0)}
            onRemoveQuery={this.onRemoveQuery}
            onAddQuery={this.onAddQuery}
            onMoveQuery={this.onMoveQuery}
            inMixedMode={props.datasource.meta.mixed}
          />
        </div>
        {/* *** END_OF_CHANGE *** */}
        {/* *** START_OF_CHANGE *** */}
      </>
      /* *** END_OF_CHANGE *** */
    );
  }
}
