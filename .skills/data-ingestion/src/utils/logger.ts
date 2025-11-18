import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: any;
}

export class Logger {
  private entries: LogEntry[] = [];
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  private log(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      details
    };

    this.entries.push(entry);

    // Only output if verbose or if level is WARN/ERROR/SUCCESS
    if (this.verbose || level >= LogLevel.WARN) {
      this.output(entry);
    }
  }

  private output(entry: LogEntry) {
    const time = entry.timestamp.toLocaleTimeString();
    let prefix = '';
    let colorFn = chalk.white;

    switch (entry.level) {
      case LogLevel.DEBUG:
        prefix = '🔍';
        colorFn = chalk.gray;
        break;
      case LogLevel.INFO:
        prefix = 'ℹ️ ';
        colorFn = chalk.blue;
        break;
      case LogLevel.WARN:
        prefix = '⚠️ ';
        colorFn = chalk.yellow;
        break;
      case LogLevel.ERROR:
        prefix = '❌';
        colorFn = chalk.red;
        break;
      case LogLevel.SUCCESS:
        prefix = '✅';
        colorFn = chalk.green;
        break;
    }

    console.log(`${chalk.gray(`[${time}]`)} ${prefix} ${colorFn(entry.message)}`);

    if (entry.details && this.verbose) {
      console.log(chalk.gray('   Details:'), entry.details);
    }
  }

  debug(message: string, details?: any) {
    this.log(LogLevel.DEBUG, message, details);
  }

  info(message: string, details?: any) {
    this.log(LogLevel.INFO, message, details);
  }

  warn(message: string, details?: any) {
    this.log(LogLevel.WARN, message, details);
  }

  error(message: string, details?: any) {
    this.log(LogLevel.ERROR, message, details);
  }

  success(message: string, details?: any) {
    this.log(LogLevel.SUCCESS, message, details);
  }

  getEntries(): LogEntry[] {
    return this.entries;
  }

  getErrorCount(): number {
    return this.entries.filter(e => e.level === LogLevel.ERROR).length;
  }

  getWarningCount(): number {
    return this.entries.filter(e => e.level === LogLevel.WARN).length;
  }

  clear() {
    this.entries = [];
  }

  // Format a summary of logs
  summary(): string {
    const errors = this.getErrorCount();
    const warnings = this.getWarningCount();
    const infos = this.entries.filter(e => e.level === LogLevel.INFO).length;
    const successes = this.entries.filter(e => e.level === LogLevel.SUCCESS).length;

    return `
${chalk.bold('Log Summary:')}
  ${chalk.green('✅ Successes:')} ${successes}
  ${chalk.blue('ℹ️  Info:')} ${infos}
  ${chalk.yellow('⚠️  Warnings:')} ${warnings}
  ${chalk.red('❌ Errors:')} ${errors}
  ${chalk.gray('Total entries:')} ${this.entries.length}
    `.trim();
  }
}

// Create a singleton logger instance
let globalLogger: Logger | null = null;

export function getLogger(verbose?: boolean): Logger {
  if (!globalLogger || verbose !== undefined) {
    globalLogger = new Logger(verbose ?? false);
  }
  return globalLogger;
}

export function resetLogger() {
  globalLogger = null;
}
