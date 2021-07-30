import { DashboardCursorSync, Field, PanelProps } from '@grafana/data';
import { config } from '@grafana/runtime';
import { TooltipDisplayMode, usePanelContext, TimeSeries, TooltipPlugin, ZoomPlugin } from '@grafana/ui';
import { getFieldLinksForExplore } from 'app/features/explore/utils/links';
import React, { useMemo } from 'react';
import { AnnotationsPlugin } from './plugins/AnnotationsPlugin';
import { ContextMenuPlugin } from './plugins/ContextMenuPlugin';
import { ExemplarsPlugin } from './plugins/ExemplarsPlugin';
import { TimeSeriesOptions } from './types';
import { prepareGraphableFields } from './utils';

interface TimeSeriesPanelProps extends PanelProps<TimeSeriesOptions> {}

export const TimeSeriesPanel: React.FC<TimeSeriesPanelProps> = ({
  data,
  timeRange,
  timeZone,
  width,
  height,
  options,
  onChangeTimeRange,
  replaceVariables,
}) => {
  //*** START_OF_CHANGE ****
  let allSeries = data.series;
  let mainSeries = {};

  // Check the properties of the "main" series
  for(let i = 0; i < allSeries.length; ++i) {
      let s = allSeries[i];
      // The "main" series have no "meta" attribute
      if(s.meta === undefined || s.hasOwnProperty("meta") === false) {
          let sName = s.name;
          for(let j = 0; j < s.fields.length; ++j) {
              let f = s.fields[j];
              if(f.name === "Value") {
                  mainSeries[sName] = {
                      viz: undefined,
                      axisPlacement: undefined,
                  };
                  // The "low" and "high" series must have the same visibility and Y-axis of the
                  // corresponding main series
                  mainSeries[sName]['viz'] = f.config.custom.hideFrom['viz'];
                  mainSeries[sName]['axisPlacement'] = f.config.custom.['axisPlacement'];
              }
          }
      }
  }

  // Loop over the "not-main" series in order to add the "meta" attributes 
  for(let i = 0; i < allSeries.length; ++i) {
      let s = allSeries[i];
      if(s.meta !== undefined && s.hasOwnProperty("meta") === true) {
          let extraOpts = s.meta.v2;
          for(let j = 0; j < s.fields.length; ++j) {
              let f = s.fields[j];
              if(f.name === "Value") {
                  for(let opt in extraOpts) {
                      if(extraOpts.hasOwnProperty(opt) === true) {
                          f.config.custom[opt] = extraOpts[opt];
                      }
                  }
                  let ms = extraOpts.mainSeries;
                  let v = mainSeries[ms];
                  if(v !== undefined) {
                      f.config.custom.hideFrom.viz = v['viz'];
                      f.config.custom.axisPlacement = v['axisPlacement'];
                  }
              }
          }
      }
  }
  //*** END_OF_CHANGE ****

  const { sync } = usePanelContext();

  const getFieldLinks = (field: Field, rowIndex: number) => {
    return getFieldLinksForExplore({ field, rowIndex, range: timeRange });
  };

  const { frames, warn } = useMemo(() => prepareGraphableFields(data?.series, config.theme2), [data]);

  if (!frames || warn) {
    return (
      <div className="panel-empty">
        <p>{warn ?? 'No data found in response'}</p>
      </div>
    );
  }

  return (
    <TimeSeries
      frames={frames}
      structureRev={data.structureRev}
      timeRange={timeRange}
      timeZone={timeZone}
      width={width}
      height={height}
      legend={options.legend}
    >
      {(config, alignedDataFrame) => {
        return (
          <>
            <ZoomPlugin config={config} onZoom={onChangeTimeRange} />
            <TooltipPlugin
              data={alignedDataFrame}
              config={config}
              mode={sync === DashboardCursorSync.Tooltip ? TooltipDisplayMode.Multi : options.tooltip.mode}
              timeZone={timeZone}
            />
            <ContextMenuPlugin
              data={alignedDataFrame}
              config={config}
              timeZone={timeZone}
              replaceVariables={replaceVariables}
            />
            {data.annotations && (
              <AnnotationsPlugin annotations={data.annotations} config={config} timeZone={timeZone} />
            )}

            {data.annotations && (
              <ExemplarsPlugin
                config={config}
                exemplars={data.annotations}
                timeZone={timeZone}
                getFieldLinks={getFieldLinks}
              />
            )}
          </>
        );
      }}
    </TimeSeries>
  );
};
