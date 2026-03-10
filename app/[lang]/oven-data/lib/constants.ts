/**
 * Temperature monitoring and outlier detection constants
 * Centralized configuration for the oven temperature system
 */

// Outlier Detection Thresholds
export const SENSOR_OUTLIER_THRESHOLD = 0.17; // 17% deviation from median for individual sensors
export const TEMPORAL_OUTLIER_THRESHOLD = 0.3; // 30% deviation for temporal outlier detection
export const IQR_MULTIPLIER = 1.5; // Standard IQR multiplier for statistical outlier detection

// Historical Analysis Configuration
export const HISTORICAL_DAYS_LOOKBACK = 30; // Days to look back for historical statistics
export const MIN_SENSORS_FOR_OUTLIER_DETECTION = 2; // Minimum sensors needed for outlier analysis
export const MIN_VALUES_FOR_IQR = 4; // Minimum data points needed for IQR calculation

// Performance and Query Limits
export const MAX_TEMPERATURE_LOGS_PER_QUERY = 1000; // Maximum temperature logs per API request
export const MAX_HISTORICAL_PROCESSES_LIMIT = 10; // Limit for process queries to maintain performance
export const BATCH_PROCESSING_SIZE = 10000; // Standard batch size for large dataset processing

// Notification and Throttling
export const NOTIFICATION_THROTTLE_HOURS = 8; // Hours between outlier notifications
export const CONNECTION_TIMEOUT_MS = 5000; // Timeout for Arduino sensor connections

// Temperature Processing
export const TEMPERATURE_PRECISION_DECIMALS = 1; // Decimal places for temperature rounding
export const RELATIVE_TIME_MINUTE_PRECISION = 1; // Minutes precision for relative time calculations

// Sensor Configuration
export const SENSOR_KEYS = ["z0", "z1", "z2", "z3"] as const;
export const SENSOR_LABELS = {
  z0: "Top Left",
  z1: "Top Right",
  z2: "Bottom Left",
  z3: "Bottom Right",
} as const;
