import React, {
  Fragment,
  FunctionComponent,
  ReactElement,
  useEffect,
  useState,
} from "react";
import MetricQueryConfig from "./MetricQueryConfig";
import MetricGraphConfig from "./MetricFormulaConfig";
import Button, {
  ButtonSize,
  ButtonStyleType,
} from "Common/UI/Components/Button/Button";
import Text from "Common/Types/Text";
import HorizontalRule from "Common/UI/Components/HorizontalRule/HorizontalRule";
import MetricsAggregationType from "Common/Types/Metrics/MetricsAggregationType";
import StartAndEndDate, {
  StartAndEndDateType,
} from "Common/UI/Components/Date/StartAndEndDate";
import InBetween from "Common/Types/BaseDatabase/InBetween";
import FieldLabelElement from "Common/UI/Components/Forms/Fields/FieldLabel";
import Card from "Common/UI/Components/Card/Card";
import AggregatedResult from "Common/Types/BaseDatabase/AggregatedResult";
import API from "Common/UI/Utils/API/API";
import { PromiseVoidFunction } from "Common/Types/FunctionTypes";
import ModelAPI from "Common/UI/Utils/AnalyticsModelAPI/AnalyticsModelAPI";
import Metric from "Common/Models/AnalyticsModels/Metric";
import OneUptimeDate from "Common/Types/Date";
import { LIMIT_PER_PROJECT } from "Common/Types/Database/LimitMax";
import ComponentLoader from "Common/UI/Components/ComponentLoader/ComponentLoader";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import ChartGroup, {
  Chart,
  ChartType,
} from "Common/UI/Components/Charts/ChartGroup/ChartGroup";
import AggregatedModel from "Common/Types/BaseDatabase/AggregatedModel";
import IconProp from "Common/Types/Icon/IconProp";
import PageLoader from "Common/UI/Components/Loader/PageLoader";
import Dictionary from "Common/Types/Dictionary";
import YAxisType from "Common/UI/Components/Charts/Types/YAxis/YAxisType";
import XAxisType from "Common/UI/Components/Charts/Types/XAxis/XAxisType";
import ChartCurve from "Common/UI/Components/Charts/Types/ChartCurve";
import { XAxisAggregateType } from "Common/UI/Components/Charts/Types/XAxis/XAxis";
import { YAxisPrecision } from "Common/UI/Components/Charts/Types/YAxis/YAxis";
import MetricNameAndUnit from "./Types/MetricNameAndUnit";
import SeriesPoint from "Common/UI/Components/Charts/Types/SeriesPoints";
import MetricQueryConfigData, {
  ChartSeries,
} from "Common/Types/Metrics/MetricQueryConfigData";
import MetricsViewConfig from "Common/Types/Metrics/MetricsViewConfig";
import MetricFormulaConfigData from "Common/Types/Metrics/MetricFormulaConfigData";
import MetricUtil from "./Utils/Metrics";

export interface MetricViewData extends MetricsViewConfig {
  startAndEndDate: InBetween<Date> | null;
}

export interface ComponentProps {
  data: MetricViewData;
  hideQueryElements?: boolean;
}

const MetricView: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [xAxisType, setXAxisType] = useState<XAxisType>(XAxisType.Time);

  const [currentQueryVariable, setCurrentQueryVariable] = useState<string>(
    Text.getLetterFromAByNumber(props.data.queryConfigs.length),
  );

  const [metricNamesAndUnits, setMetricNamesAndUnits] = useState<
    Array<MetricNameAndUnit>
  >([]);

  type GetEmptyQueryConfigFunction = () => MetricQueryConfigData;

  const getEmptyQueryConfigData: GetEmptyQueryConfigFunction =
    (): MetricQueryConfigData => {
      const currentVar: string = currentQueryVariable;
      setCurrentQueryVariable(Text.getNextLowercaseLetter(currentVar));

      return {
        metricAliasData: {
          metricVariable: currentVar,
          title: "",
          description: "",
        },
        metricQueryData: {
          filterData: {
            aggegationType: MetricsAggregationType.Avg,
          },
        },
      };
    };

  const [metricViewData, setMetricViewData] = useState<MetricViewData>(
    props.data,
  );

  const [isPageLoading, setIsPageLoading] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string>("");

  const [telemetryAttributes, setTelemetryAttributes] = useState<Array<string>>(
    [],
  );

  type GetChartXAxisTypeFunction = () => XAxisType;

  const getChartXAxisType: GetChartXAxisTypeFunction = (): XAxisType => {
    if (
      metricViewData.startAndEndDate?.startValue &&
      metricViewData.startAndEndDate?.endValue
    ) {
      // if these are less than a day then we can use time
      const hourDifference: number = OneUptimeDate.getHoursBetweenTwoDates(
        metricViewData.startAndEndDate.startValue as Date,
        metricViewData.startAndEndDate.endValue as Date,
      );

      if (hourDifference <= 24) {
        return XAxisType.Time;
      }
    }

    return XAxisType.Date;
  };

  useEffect(() => {
    fetchAggregatedResults().catch((err: Error) => {
      setMetricResultsError(API.getFriendlyErrorMessage(err as Error));
    });

    loadAllMetricsTypes().catch((err: Error) => {
      setPageError(API.getFriendlyErrorMessage(err as Error));
    });

    setCharts(getCharts());
  }, []);

  useEffect(() => {
    if (
      props.hideQueryElements &&
      metricViewData &&
      metricViewData.startAndEndDate &&
      metricViewData.startAndEndDate.startValue &&
      metricViewData.startAndEndDate.endValue
    ) {
      fetchAggregatedResults().catch((err: Error) => {
        setMetricResultsError(API.getFriendlyErrorMessage(err as Error));
      });
    }
  }, [metricViewData]);

  const [metricResults, setMetricResults] = useState<Array<AggregatedResult>>(
    [],
  );

  type GetChartsFunction = () => Array<Chart>;

  const getCharts: GetChartsFunction = (): Array<Chart> => {
    const charts: Array<Chart> = [];

    let index: number = 0;

    if (!metricResults) {
      return [];
    }

    for (const queryConfig of metricViewData.queryConfigs) {
      if (!metricResults[index]) {
        continue;
      }

      let xAxisAggregationType: XAxisAggregateType = XAxisAggregateType.Average;

      if (
        queryConfig.metricQueryData.filterData.aggegationType ===
        MetricsAggregationType.Sum
      ) {
        xAxisAggregationType = XAxisAggregateType.Sum;
      }

      if (
        queryConfig.metricQueryData.filterData.aggegationType ===
        MetricsAggregationType.Count
      ) {
        xAxisAggregationType = XAxisAggregateType.Sum;
      }

      if (
        queryConfig.metricQueryData.filterData.aggegationType ===
        MetricsAggregationType.Max
      ) {
        xAxisAggregationType = XAxisAggregateType.Max;
      }

      if (
        queryConfig.metricQueryData.filterData.aggegationType ===
        MetricsAggregationType.Min
      ) {
        xAxisAggregationType = XAxisAggregateType.Min;
      }

      if (
        queryConfig.metricQueryData.filterData.aggegationType ===
        MetricsAggregationType.Avg
      ) {
        xAxisAggregationType = XAxisAggregateType.Average;
      }

      const chartSeries: Array<SeriesPoint> = [];

      if (queryConfig.getSeries) {
        for (const item of metricResults[index]!.data) {
          const series: ChartSeries = queryConfig.getSeries(item);
          const seriesName: string = series.title;

          //check if the series already exists if it does then add the data to the existing series

          // if it does not exist then create a new series and add the data to it

          const existingSeries: SeriesPoint | undefined = chartSeries.find(
            (s: SeriesPoint) => {
              return s.seriesName === seriesName;
            },
          );

          if (existingSeries) {
            existingSeries.data.push({
              x: OneUptimeDate.fromString(item.timestamp),
              y: item.value,
            });
          } else {
            const newSeries: SeriesPoint = {
              seriesName: seriesName,
              data: [
                {
                  x: OneUptimeDate.fromString(item.timestamp),
                  y: item.value,
                },
              ],
            };

            chartSeries.push(newSeries);
          }
        }
      } else {
        chartSeries.push({
          seriesName:
            queryConfig.metricAliasData?.title ||
            queryConfig.metricQueryData.filterData.metricName?.toString() ||
            "",
          data: metricResults[index]!.data.map((result: AggregatedModel) => {
            return {
              x: OneUptimeDate.fromString(result.timestamp),
              y: result.value,
            };
          }),
        });
      }

      const chart: Chart = {
        id: index.toString(),
        type: ChartType.LINE,
        title:
          queryConfig.metricAliasData?.title ||
          queryConfig.metricQueryData.filterData.metricName?.toString() ||
          "",
        description: queryConfig.metricAliasData?.description || "",
        props: {
          data: chartSeries,
          xAxis: {
            legend: "Time",
            options: {
              type: xAxisType,
              max:
                metricViewData.startAndEndDate?.endValue ||
                OneUptimeDate.getCurrentDate(),
              min:
                metricViewData.startAndEndDate?.startValue ||
                OneUptimeDate.addRemoveHours(
                  OneUptimeDate.getCurrentDate(),
                  -1,
                ),
              aggregateType: xAxisAggregationType,
            },
          },
          yAxis: {
            // legend is the unit of the metric
            legend: "",

            options: {
              type: YAxisType.Number,
              formatter: (value: number) => {
                const metricNameAndUnit: MetricNameAndUnit | undefined =
                  metricNamesAndUnits.find((m: MetricNameAndUnit) => {
                    return (
                      m.metricName ===
                      queryConfig.metricQueryData.filterData.metricName
                    );
                  });

                return `${value} ${metricNameAndUnit?.unit || ""}`;
              },
              precision: YAxisPrecision.NoDecimals,
              max: "auto",
              min: "auto",
            },
          },
          curve: ChartCurve.LINEAR,
          sync: true,
        },
      };

      charts.push(chart);

      index++;
    }

    return charts;
  };

  const [charts, setCharts] = useState<Array<Chart>>(getCharts());

  useEffect(() => {
    setCharts(getCharts());
  }, [metricViewData, metricResults]);

  const [isMetricResultsLoading, setIsMetricResultsLoading] =
    useState<boolean>(false);
  const [metricResultsError, setMetricResultsError] = useState<string>("");

  const loadAllMetricsTypes: PromiseVoidFunction = async (): Promise<void> => {
    try {
      setIsPageLoading(true);

      const {
        metricNamesAndUnits,
        telemetryAttributes,
      }: {
        metricNamesAndUnits: Array<MetricNameAndUnit>;
        telemetryAttributes: Array<string>;
      } = await MetricUtil.loadAllMetricsTypes();

      setMetricNamesAndUnits(metricNamesAndUnits);
      setTelemetryAttributes(telemetryAttributes);

      setIsPageLoading(false);
      setPageError("");
    } catch (err) {
      setIsPageLoading(false);
      setPageError(API.getFriendlyErrorMessage(err as Error));
    }
  };

  const fetchAggregatedResults: PromiseVoidFunction =
    async (): Promise<void> => {
      setIsMetricResultsLoading(true);

      if (
        !metricViewData.startAndEndDate?.startValue ||
        !metricViewData.startAndEndDate?.endValue
      ) {
        setIsMetricResultsLoading(false);
        return;
      }

      const results: Array<AggregatedResult> = [];
      try {
        for (const queryConfig of metricViewData.queryConfigs) {
          const result: AggregatedResult = await ModelAPI.aggregate({
            modelType: Metric,
            aggregateBy: {
              query: {
                time: metricViewData.startAndEndDate!,
                name: queryConfig.metricQueryData.filterData.metricName!,
                attributes: queryConfig.metricQueryData.filterData
                  .attributes as Dictionary<string | number | boolean>,
              },
              aggregationType:
                (queryConfig.metricQueryData.filterData
                  .aggegationType as MetricsAggregationType) ||
                MetricsAggregationType.Avg,
              aggregateColumnName: "value",
              aggregationTimestampColumnName: "time",
              startTimestamp:
                (metricViewData.startAndEndDate?.startValue as Date) ||
                OneUptimeDate.getCurrentDate(),
              endTimestamp:
                (metricViewData.startAndEndDate?.endValue as Date) ||
                OneUptimeDate.getCurrentDate(),
              limit: LIMIT_PER_PROJECT,
              skip: 0,
              groupBy: queryConfig.metricQueryData.groupBy,
            },
          });

          result.data.map((data: AggregatedModel) => {
            // convert to int from float

            if (data.value) {
              data.value = Math.round(data.value);
            }

            return data;
          });

          results.push(result);
        }

        setMetricResults(results);
        setXAxisType(getChartXAxisType());
        setMetricResultsError("");
      } catch (err: unknown) {
        setMetricResultsError(API.getFriendlyErrorMessage(err as Error));
      }

      setIsMetricResultsLoading(false);
    };

  // type GetEmptyFormulaConfigFunction = () => MetricFormulaConfigData;

  // const getEmptyFormulaConfigData: GetEmptyFormulaConfigFunction =
  //   (): MetricFormulaConfigData => {
  //     return {
  //       metricAliasData: { metricVariable: "", title: "", description: "" },
  //       metricFormulaData: {
  //         metricFormula: "",
  //       },
  //     };
  //   };

  if (isPageLoading) {
    return <PageLoader isVisible={true} />;
  }

  if (pageError) {
    return <ErrorMessage error={pageError} />;
  }

  return (
    <Fragment>
      <div className="space-y-3">
        <div className="mb-5">
          <Card>
            <div className="-mt-5">
              <FieldLabelElement title="Start and End Time" required={true} />
              <StartAndEndDate
                type={StartAndEndDateType.DateTime}
                initialValue={props.data.startAndEndDate || undefined}
                onValueChanged={(startAndEndDate: InBetween<Date> | null) => {
                  setMetricViewData({
                    ...metricViewData,
                    startAndEndDate: startAndEndDate,
                  });
                }}
              />
            </div>
          </Card>
        </div>

        {!props.hideQueryElements && (
          <div className="space-y-3">
            {metricViewData.queryConfigs.map(
              (queryConfig: MetricQueryConfigData, index: number) => {
                return (
                  <MetricQueryConfig
                    key={index}
                    onChange={(data: MetricQueryConfigData) => {
                      const newGraphConfigs: Array<MetricQueryConfigData> = [
                        ...metricViewData.queryConfigs,
                      ];
                      newGraphConfigs[index] = data;
                      setMetricViewData({
                        ...metricViewData,
                        queryConfigs: newGraphConfigs,
                      });
                    }}
                    data={queryConfig}
                    telemetryAttributes={telemetryAttributes}
                    metricNameAndUnits={metricNamesAndUnits}
                    onRemove={() => {
                      const newGraphConfigs: Array<MetricQueryConfigData> = [
                        ...metricViewData.queryConfigs,
                      ];
                      newGraphConfigs.splice(index, 1);

                      setMetricViewData({
                        ...metricViewData,
                        queryConfigs: newGraphConfigs,
                      });
                    }}
                  />
                );
              },
            )}
          </div>
        )}
      </div>

      {!props.hideQueryElements && (
        <div className="space-y-3">
          <div className="space-y-3">
            {metricViewData.formulaConfigs.map(
              (formulaConfig: MetricFormulaConfigData, index: number) => {
                return (
                  <MetricGraphConfig
                    key={index}
                    onDataChanged={(data: MetricFormulaConfigData) => {
                      const newGraphConfigs: Array<MetricFormulaConfigData> = [
                        ...metricViewData.formulaConfigs,
                      ];
                      newGraphConfigs[index] = data;
                      setMetricViewData({
                        ...metricViewData,
                        formulaConfigs: newGraphConfigs,
                      });
                    }}
                    data={formulaConfig}
                    onRemove={() => {
                      const newGraphConfigs: Array<MetricFormulaConfigData> = [
                        ...metricViewData.formulaConfigs,
                      ];
                      newGraphConfigs.splice(index, 1);
                      setMetricViewData({
                        ...metricViewData,
                        formulaConfigs: newGraphConfigs,
                      });
                    }}
                  />
                );
              },
            )}
          </div>
          <div>
            <div className="flex -ml-3 mt-8 justify-between w-full">
              <div>
                <Button
                  title="Add Query"
                  buttonSize={ButtonSize.Small}
                  onClick={() => {
                    setMetricViewData({
                      ...metricViewData,
                      queryConfigs: [
                        ...metricViewData.queryConfigs,
                        getEmptyQueryConfigData(),
                      ],
                    });
                  }}
                />
                {/* <Button
              title="Add Formula"
              buttonSize={ButtonSize.Small}
              onClick={() => {
                setMetricViewData({
                  ...metricViewData,
                  formulaConfigs: [
                    ...metricViewData.formulaConfigs,
                    getEmptyFormulaConfigData(),
                  ],
                });
              }}
            /> */}
              </div>
              <div className="flex items-end -mr-3">
                <Button
                  title="Apply"
                  icon={IconProp.Play}
                  buttonStyle={ButtonStyleType.PRIMARY}
                  buttonSize={ButtonSize.Small}
                  onClick={fetchAggregatedResults}
                />
              </div>
            </div>
          </div>
          <HorizontalRule />
        </div>
      )}

      {isMetricResultsLoading && <ComponentLoader />}

      {metricResultsError && <ErrorMessage error={metricResultsError} />}

      {!isMetricResultsLoading && !metricResultsError && (
        <div className="grid grid-cols-1 gap-4">
          {/** charts */}
          <ChartGroup charts={charts} />
        </div>
      )}
    </Fragment>
  );
};

export default MetricView;
