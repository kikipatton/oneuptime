import React, {
  FunctionComponent,
  ReactElement,
  useEffect,
  useRef,
  useState,
} from "react";
import DashboardToolbar from "./Toolbar/DashboardToolbar";
import DashboardCanvas from "./Canvas/Index";
import DashboardMode from "Common/Types/Dashboard/DashboardMode";
import DashboardComponentType from "Common/Types/Dashboard/DashboardComponentType";
import DashboardViewConfig from "Common/Types/Dashboard/DashboardViewConfig";
import { ObjectType } from "Common/Types/JSON";
import DashboardBaseComponent from "Common/Types/Dashboard/DashboardComponents/DashboardBaseComponent";
import DashboardChartComponentUtil from "Common/Utils/Dashboard/Components/DashboardChartComponent";
import DashboardValueComponentUtil from "Common/Utils/Dashboard/Components/DashboardValueComponent";
import DashboardTextComponentUtil from "Common/Utils/Dashboard/Components/DashboardTextComponent";
import BadDataException from "Common/Types/Exception/BadDataException";
import ObjectID from "Common/Types/ObjectID";
import Dashboard from "Common/Models/DatabaseModels/Dashboard";
import ModelAPI from "Common/UI/Utils/ModelAPI/ModelAPI";
import API from "Common/UI/Utils/API/API";
import ErrorMessage from "Common/UI/Components/ErrorMessage/ErrorMessage";
import PageLoader from "Common/UI/Components/Loader/PageLoader";
import DashboardViewConfigUtil from "Common/Utils/Dashboard/DashboardViewConfig";
import DefaultDashboardSize from "Common/Types/Dashboard/DashboardSize";
import { PromiseVoidFunction, VoidFunction } from "Common/Types/FunctionTypes";
import JSONFunctions from "Common/Types/JSONFunctions";
import MetricNameAndUnit from "../Metrics/Types/MetricNameAndUnit";
import MetricUtil from "../Metrics/Utils/Metrics";

export interface ComponentProps {
  dashboardId: ObjectID;
}

const DashboardViewer: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>(
    DashboardMode.View,
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ref for dashboard div.

  const dashboardViewRef: React.RefObject<HTMLDivElement> =
    useRef<HTMLDivElement>(null);

  const [dashboardTotalWidth, setDashboardTotalWidth] = useState<number>(
    dashboardViewRef.current?.offsetWidth || 0,
  );

  const [telemetryAttributes, setTelemetryAttributes] = useState<string[]>([]);

  const [metricNameAndUnits, setMetricNamesAndUnits] = useState<
    MetricNameAndUnit[]
  >([]);

  const loadAllMetricsTypes: PromiseVoidFunction = async (): Promise<void> => {
    const {
      metricNamesAndUnits,
      telemetryAttributes,
    }: {
      metricNamesAndUnits: Array<MetricNameAndUnit>;
      telemetryAttributes: Array<string>;
    } = await MetricUtil.loadAllMetricsTypes();

    setMetricNamesAndUnits(metricNamesAndUnits);
    setTelemetryAttributes(telemetryAttributes);
  };

  const [dashboardName, setDashboardName] = useState<string>("");

  const handleResize: VoidFunction = (): void => {
    setDashboardTotalWidth(dashboardViewRef.current?.offsetWidth || 0);
  };

  const saveDashboardViewConfig: PromiseVoidFunction =
    async (): Promise<void> => {
      try {
        setIsSaving(true);
        await ModelAPI.updateById({
          modelType: Dashboard,
          id: props.dashboardId,
          data: {
            dashboardViewConfig: dashboardViewConfig,
          },
        });
      } catch (err) {
        setError(API.getFriendlyErrorMessage(err as Error));
      }

      setIsSaving(false);
    };

  useEffect(() => {
    setDashboardTotalWidth(dashboardViewRef.current?.offsetWidth || 0);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const [selectedComponentId, setSelectedComponentId] =
    useState<ObjectID | null>(null);

  const [dashboardViewConfig, setDashboardViewConfig] =
    useState<DashboardViewConfig>({
      _type: ObjectType.DashboardViewConfig,
      components: [],
      heightInDashboardUnits: DefaultDashboardSize.heightInDashboardUnits,
    });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const fetchDashboardViewConfig: PromiseVoidFunction =
    async (): Promise<void> => {
      const dashboard: Dashboard | null = await ModelAPI.getItem({
        modelType: Dashboard,
        id: props.dashboardId,
        select: {
          dashboardViewConfig: true,
          name: true,
          description: true,
        },
      });

      if (!dashboard) {
        setError("Dashboard not found");
        return;
      }

      setDashboardViewConfig(
        JSONFunctions.deserializeValue(
          dashboard.dashboardViewConfig ||
            DashboardViewConfigUtil.createDefaultDashboardViewConfig(),
        ) as DashboardViewConfig,
      );
      setDashboardName(dashboard.name || "Untitled Dashboard");
    };

  const loadPage: PromiseVoidFunction = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await loadAllMetricsTypes();
      await fetchDashboardViewConfig();
    } catch (err) {
      setError(API.getFriendlyErrorMessage(err as Error));
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Fetch the dashboard view config from the server
    loadPage().catch((err: Error) => {
      setError(API.getFriendlyErrorMessage(err as Error));
    });
  }, []);

  const isEditMode: boolean = dashboardMode === DashboardMode.Edit;

  const sideBarWidth: number = isEditMode && selectedComponentId ? 650 : 0;

  useEffect(() => {
    handleResize();
  }, [dashboardMode, selectedComponentId]);

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (isLoading) {
    return <PageLoader isVisible={true} />;
  }

  return (
    <div
      ref={dashboardViewRef}
      style={{
        minWidth: "1000px",
        width: `calc(100% - ${sideBarWidth}px)`,
      }}
    >
      <DashboardToolbar
        dashboardMode={dashboardMode}
        onFullScreenClick={() => {
          setIsFullScreen(true);
        }}
        onCollapseScreenClick={() => {
          setIsFullScreen(false);
        }}
        dashboardName={dashboardName}
        isFullScreen={isFullScreen}
        isSaving={isSaving}
        onSaveClick={() => {
          saveDashboardViewConfig().catch((err: Error) => {
            setError(API.getFriendlyErrorMessage(err));
          });
          setDashboardMode(DashboardMode.View);
        }}
        onCancelEditClick={() => {
          setDashboardMode(DashboardMode.View);
        }}
        onEditClick={() => {
          setDashboardMode(DashboardMode.Edit);
        }}
        onAddComponentClick={(componentType: DashboardComponentType) => {
          let newComponent: DashboardBaseComponent | null = null;

          if (componentType === DashboardComponentType.Chart) {
            newComponent = DashboardChartComponentUtil.getDefaultComponent();
          }

          if (componentType === DashboardComponentType.Value) {
            newComponent = DashboardValueComponentUtil.getDefaultComponent();
          }

          if (componentType === DashboardComponentType.Text) {
            newComponent = DashboardTextComponentUtil.getDefaultComponent();
          }

          if (!newComponent) {
            throw new BadDataException(
              `Unknown component type: ${componentType}`,
            );
          }

          const newDashboardConfig: DashboardViewConfig =
            JSONFunctions.deserializeValue(
              DashboardViewConfigUtil.addComponentToDashboard({
                component: newComponent,
                dashboardViewConfig: dashboardViewConfig,
              }),
            ) as DashboardViewConfig;

          setDashboardViewConfig(newDashboardConfig);
        }}
      />

      <DashboardCanvas
        dashboardViewConfig={dashboardViewConfig}
        onDashboardViewConfigChange={(newConfig: DashboardViewConfig) => {
          setDashboardViewConfig(newConfig);
        }}
        onComponentSelected={(componentId: ObjectID) => {
          // Do nothing
          setSelectedComponentId(componentId);
        }}
        onComponentUnselected={() => {
          setSelectedComponentId(null);
        }}
        selectedComponentId={selectedComponentId}
        isEditMode={isEditMode}
        currentTotalDashboardWidthInPx={dashboardTotalWidth}
        metrics={{
          telemetryAttributes,
          metricNameAndUnits,
        }}
      />
    </div>
  );
};

export default DashboardViewer;
