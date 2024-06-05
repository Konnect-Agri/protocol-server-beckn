import * as winston from "winston";
import "winston-daily-rotate-file";
import * as MongoDB from "winston-mongodb";
import express from 'express';
import { ConsumeMessage } from 'amqplib';
import { getConfig } from "./config.utils";

const myFormat = winston.format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

interface MyRequest extends express.Request {
  body: {
    context: {
      transaction_id?: string;
    };
  };
  query: {
    transaction_id?: string;
  };
}

const mongoURL = getConfig().responseCache.mongoURL;

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.label({ label: "test" }),
    winston.format.timestamp(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    myFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.DailyRotateFile({
      level: "info",
      filename: 'logs/info/%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new winston.transports.DailyRotateFile({
      level: "error",
      filename: 'logs/error/%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new winston.transports.DailyRotateFile({
      level: "http",
      filename: 'logs/http/%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new winston.transports.DailyRotateFile({
      level: "warn",
      filename: 'logs/warn/%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new winston.transports.DailyRotateFile({
      level: "debug",
      filename: 'logs/debug/%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    }),
    new MongoDB.MongoDB({
      level: 'info',
      db: mongoURL as string,
      options: { useUnifiedTopology: true },
      collection: 'logs',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ]
});

logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.simple(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  ),
}));

export const setTransactionIdFromRabbitMQ = (message: ConsumeMessage | null) => {
  if (message && message.properties && message.properties.headers) {
    const requestBody = JSON.parse(message.content.toString());
    const transactionId = requestBody.context?.transaction_id;
    if (transactionId) {
      logger.defaultMeta = { transactionId };
    }
  }
};

export default logger;