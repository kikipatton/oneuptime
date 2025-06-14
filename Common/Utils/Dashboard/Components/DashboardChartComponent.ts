import DashboardChartComponent from "../../../Types/Dashboard/DashboardComponents/DashboardChartComponent";
import { ObjectType } from "../../../Types/JSON";
import ObjectID from "../../../Types/ObjectID";
import DashboardBaseComponentUtil from "./DashboardBaseComponent";
import {
  ComponentArgument,
  ComponentInputType,
} from "../../../Types/Dashboard/DashboardComponents/ComponentArgument";
import DashboardComponentType from "../../../Types/Dashboard/DashboardComponentType";

export default class DashboardChartComponentUtil extends DashboardBaseComponentUtil {
  public static override getDefaultComponent(): DashboardChartComponent {
    return {
      _type: ObjectType.DashboardComponent,
      componentType: DashboardComponentType.Chart,
      widthInDashboardUnits: 12,
      heightInDashboardUnits: 6,
      topInDashboardUnits: 0,
      leftInDashboardUnits: 0,
      componentId: ObjectID.generate(),
      minHeightInDashboardUnits: 3,
      minWidthInDashboardUnits: 6,
      arguments: {},
    };
  }

  public static override getComponentConfigArguments(): Array<
    ComponentArgument<DashboardChartComponent>
  > {
    const componentArguments: Array<
      ComponentArgument<DashboardChartComponent>
    > = [];

    componentArguments.push({
      name: "Chart Configuration",
      description: "Please select the metrics to display on the chart",
      required: true,
      type: ComponentInputType.MetricsQueryConfig,
      id: "metricQueryConfig",
    });

    return componentArguments;
  }
}
