import winston, { transports } from "winston";

export const logger = winston.createLogger({
  level: process.env.DEBUG ? "debug" : "info",
  transports: [
    new transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.level = "debug";
}
