export type ProcessStatus = "prepared" | "running" | "finished" | "deleted";

export type OvenProcessDataType = {
  id: string;
  oven: string;
  article: string;
  hydraBatch: string;
  startOperators: string[];
  endOperators?: string[];
  status: ProcessStatus;
  startTime: Date;
  endTime: Date | null;
  startTimeLocaleString: string;
  endTimeLocaleString: string;
  lastAvgTemp: number | null;
  duration?: number; // Duration in seconds for finished processes
  // Saved target values from config at time of process creation
  targetTemp?: number;
  tempTolerance?: number;
  targetDuration?: number; // Duration in seconds
};

// Sensor identifiers
export type SensorKey = "z0" | "z1" | "z2" | "z3";

// Sensor data mapping
export type SensorData = Record<SensorKey, number>;

// Complete temperature log from database
export type OvenTemperatureLogType = {
  _id: string;
  processIds: string[];
  timestamp: Date;
  timestampLocaleString: string;
  sensorData: SensorData;
  avgTemp: number; // Filtered average (excluding sensor outliers)
  medianTemp: number | null;
  // Outlier detection fields
  outlierSensors: SensorKey[];
  hasOutliers: boolean;
  // Historical statistics for temporal outlier detection
  historicalMedian: number | null;
  historicalAverage?: number | null; // 30-day historical average
  isTemporalOutlier?: boolean; // Flag for temporal deviation detection
};

// Enhanced temperature log for chart display
export type ChartTemperatureData = {
  _id: string;
  processIds: string[];
  timestamp: Date;
  sensorData: Partial<SensorData>; // May have nulls for outlier sensors
  avgTemp: number;
  medianTemp: number | null;
  historicalMedian: number | null;
  historicalAverage: number | null;
  isTemporalOutlier: boolean;
  outlierSensors: SensorKey[];
  hasOutliers: boolean;
};

// Temperature analysis result from statistical calculations
export type TemperatureAnalysis = {
  validValues: number[];
  validSensors: SensorKey[];
  outlierSensors: SensorKey[];
  medianTemp: number;
  avgTemp: number; // Filtered average excluding outliers
  hasOutliers: boolean;
};

// Historical statistics structure
export type HistoricalStatistics = {
  medians: Map<number, number>;
  averages: Map<number, number>;
};

// Historical data point for specific time
export type HistoricalDataPoint = {
  median: number | null;
  average: number | null;
};

export type OvenConfigType = {
  id: string;
  article: string;
  temp: number;
  tempTolerance: number;
  duration: number; // Duration in seconds
};

// OEE (Overall Equipment Effectiveness) Types
export type OeeParams =
  | { mode: "day"; date: string; ovens?: string[] }
  | { mode: "week"; year: number; week: number; ovens?: string[] }
  | { mode: "month"; year: number; month: number; ovens?: string[] }
  | {
      mode: "range";
      from: string;
      to: string;
      granularity?: "hour" | "day";
      ovens?: string[];
    };

export type OeeDataPoint = {
  timestamp: string;
  runningMinutes: number;
  availableMinutes: number;
  failureMinutes: number;
  utilizationPercent: number;
  activeOvenCount: number;
  faultCount: number;
};

export type OeeSummary = {
  overallUtilization: number;
  totalRunningHours: number;
  totalAvailableHours: number;
  totalFailureHours: number;
  totalFaults: number;
};

export type OeeFault = {
  id: string;
  oven: string;
  faultKey: string;
  faultName: string;
  status: "active" | "finished";
  startTime: Date;
  endTime: Date | null;
  duration: number;
  reportedBy: string[];
  finishedBy: string[] | null;
};

export type OeeResponse = {
  dataPoints: OeeDataPoint[];
  summary: OeeSummary;
  faults: OeeFault[];
};
