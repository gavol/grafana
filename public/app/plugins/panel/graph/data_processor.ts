import _ from 'lodash';
import { colors, getColorFromHexRgbOrName } from '@grafana/ui';
import { TimeRange, FieldType, Field, DataFrame, getTimeField } from '@grafana/data';
import TimeSeries from 'app/core/time_series2';
import config from 'app/core/config';

type Options = {
  dataList: DataFrame[];
  range?: TimeRange;
};

export class DataProcessor {
  constructor(private panel: any) {}

  getSeriesList(options: Options): TimeSeries[] {
    const list: TimeSeries[] = [];
    const { dataList, range } = options;

    if (!dataList || !dataList.length) {
      return list;
    }

    for (let i = 0; i < dataList.length; i++) {
      const series = dataList[i];
      const { timeField } = getTimeField(series);
      if (!timeField) {
        continue;
      }

      const seriesName = series.name ? series.name : series.refId;
      for (let j = 0; j < series.fields.length; j++) {
        const field = series.fields[j];
        if (field.type !== FieldType.number) {
          continue;
        }

        let name = field.config && field.config.title ? field.config.title : field.name;

        if (seriesName && dataList.length > 0 && name !== seriesName) {
          name = seriesName + ' ' + name;
        }

        const datapoints = [];
        for (let r = 0; r < series.length; r++) {
          datapoints.push([field.values.get(r), timeField.values.get(r)]);
        }

        // *** START_OF_CHANGE ***
        const opt = series.hasOwnProperty('options') === false ? undefined : series.options;
        list.push(this.toTimeSeries(field, name, i, j, datapoints, list.length, range, opt));
        // *** END_OF_CHANGE ***
      }
    }

    // Merge all the rows if we want to show a histogram
    if (this.panel.xaxis.mode === 'histogram' && !this.panel.stack && list.length > 1) {
      const first = list[0];
      first.alias = first.aliasEscaped = 'Count';
      for (let i = 1; i < list.length; i++) {
        first.datapoints = first.datapoints.concat(list[i].datapoints);
      }
      return [first];
    }

    return list;
  }

  // *** START_OF_CHANGE ***
  private toTimeSeries(
    field: Field,
    alias: string,
    dataFrameIndex: number,
    fieldIndex: number,
    datapoints: any[][],
    index: number,
    range?: TimeRange,
    opt?: any
  ) // *** END_OF_CHANGE ***
  {
    const colorIndex = index % colors.length;
    const color = this.panel.aliasColors[alias] || colors[colorIndex];

    const series = new TimeSeries({
      datapoints: datapoints || [],
      alias: alias,
      color: getColorFromHexRgbOrName(color, config.theme.type),
      unit: field.config ? field.config.unit : undefined,
      dataFrameIndex,
      fieldIndex,
      // *** START_OF_CHANGE ***
      extraOptions: opt,
      // *** START_OF_CHANGE ***
    });

    if (datapoints && datapoints.length > 0 && range) {
      const last = datapoints[datapoints.length - 1][1];
      const from = range.from;

      if (last - from.valueOf() < -10000) {
        series.isOutsideRange = true;
      }
    }
    return series;
  }

  setPanelDefaultsForNewXAxisMode() {
    switch (this.panel.xaxis.mode) {
      case 'time': {
        this.panel.bars = false;
        this.panel.lines = true;
        this.panel.points = false;
        this.panel.legend.show = true;
        this.panel.tooltip.shared = true;
        this.panel.xaxis.values = [];
        break;
      }
      case 'series': {
        this.panel.bars = true;
        this.panel.lines = false;
        this.panel.points = false;
        this.panel.stack = false;
        this.panel.legend.show = false;
        this.panel.tooltip.shared = false;
        this.panel.xaxis.values = ['total'];
        break;
      }
      case 'histogram': {
        this.panel.bars = true;
        this.panel.lines = false;
        this.panel.points = false;
        this.panel.stack = false;
        this.panel.legend.show = false;
        this.panel.tooltip.shared = false;
        break;
      }
    }
  }

  validateXAxisSeriesValue() {
    switch (this.panel.xaxis.mode) {
      case 'series': {
        if (this.panel.xaxis.values.length === 0) {
          this.panel.xaxis.values = ['total'];
          return;
        }

        const validOptions = this.getXAxisValueOptions({});
        const found: any = _.find(validOptions, { value: this.panel.xaxis.values[0] });
        if (!found) {
          this.panel.xaxis.values = ['total'];
        }
        return;
      }
    }
  }

  getXAxisValueOptions(options: any) {
    switch (this.panel.xaxis.mode) {
      case 'series': {
        return [
          { text: 'Avg', value: 'avg' },
          { text: 'Min', value: 'min' },
          { text: 'Max', value: 'max' },
          { text: 'Total', value: 'total' },
          { text: 'Count', value: 'count' },
        ];
      }
    }

    return [];
  }

  pluckDeep(obj: any, property: string) {
    const propertyParts = property.split('.');
    let value = obj;
    for (let i = 0; i < propertyParts.length; ++i) {
      if (value[propertyParts[i]]) {
        value = value[propertyParts[i]];
      } else {
        return undefined;
      }
    }
    return value;
  }
}
