import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class ProgressTracker {
  private spinner: Ora | null = null;
  private startTime: number = 0;
  private current: number = 0;
  private total: number = 0;

  /**
   * Start tracking progress with a spinner
   */
  start(message: string, total: number = 0) {
    this.startTime = Date.now();
    this.current = 0;
    this.total = total;
    this.spinner = ora(message).start();
  }

  /**
   * Update progress
   */
  update(current: number, message?: string) {
    this.current = current;

    if (!this.spinner) return;

    const percentage = this.total > 0 ? (current / this.total * 100).toFixed(1) : '0.0';
    const elapsed = this.getElapsed();

    let text = message || this.spinner.text;

    if (this.total > 0) {
      text += ` ${current}/${this.total} (${percentage}%)`;
    } else {
      text += ` ${current} items`;
    }

    text += chalk.gray(` [${elapsed}]`);

    this.spinner.text = text;
  }

  /**
   * Increment progress by 1
   */
  increment(message?: string) {
    this.update(this.current + 1, message);
  }

  /**
   * Mark as successful and stop
   */
  succeed(message?: string) {
    if (this.spinner) {
      const elapsed = this.getElapsed();
      const finalMessage = message || this.spinner.text;
      this.spinner.succeed(`${finalMessage} ${chalk.gray(`[${elapsed}]`)}`);
      this.spinner = null;
    }
  }

  /**
   * Mark as failed and stop
   */
  fail(message?: string) {
    if (this.spinner) {
      const elapsed = this.getElapsed();
      const finalMessage = message || this.spinner.text;
      this.spinner.fail(`${finalMessage} ${chalk.gray(`[${elapsed}]`)}`);
      this.spinner = null;
    }
  }

  /**
   * Mark as warning and stop
   */
  warn(message?: string) {
    if (this.spinner) {
      const elapsed = this.getElapsed();
      const finalMessage = message || this.spinner.text;
      this.spinner.warn(`${finalMessage} ${chalk.gray(`[${elapsed}]`)}`);
      this.spinner = null;
    }
  }

  /**
   * Stop the spinner
   */
  stop() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Get elapsed time since start
   */
  private getElapsed(): string {
    const elapsed = Date.now() - this.startTime;
    return formatDuration(elapsed);
  }

  /**
   * Check if spinner is running
   */
  isRunning(): boolean {
    return this.spinner !== null;
  }
}

/**
 * Format duration in milliseconds to human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Create a simple progress bar
 */
export function createProgressBar(
  current: number,
  total: number,
  width: number = 40
): string {
  const percentage = total > 0 ? current / total : 0;
  const filled = Math.round(width * percentage);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  const percent = (percentage * 100).toFixed(1);

  return `[${bar}] ${percent}%`;
}

/**
 * Display a progress update with bar
 */
export function displayProgress(
  current: number,
  total: number,
  message?: string
) {
  const bar = createProgressBar(current, total);
  const msg = message ? `${message} ` : '';
  console.log(`${msg}${bar} ${current}/${total}`);
}

/**
 * Create a batch progress tracker for processing items in batches
 */
export class BatchProgressTracker {
  private totalItems: number;
  private batchSize: number;
  private processedItems: number = 0;
  private tracker: ProgressTracker;

  constructor(totalItems: number, batchSize: number) {
    this.totalItems = totalItems;
    this.batchSize = batchSize;
    this.tracker = new ProgressTracker();
  }

  start(message: string) {
    this.tracker.start(message, this.totalItems);
  }

  updateBatch(batchNumber: number, itemsInBatch: number) {
    this.processedItems += itemsInBatch;
    const totalBatches = Math.ceil(this.totalItems / this.batchSize);
    this.tracker.update(
      this.processedItems,
      `Processing batch ${batchNumber}/${totalBatches}`
    );
  }

  succeed(message?: string) {
    this.tracker.succeed(message || `Processed ${this.processedItems} items`);
  }

  fail(message?: string) {
    this.tracker.fail(message);
  }
}

/**
 * Estimate time remaining
 */
export function estimateTimeRemaining(
  current: number,
  total: number,
  elapsedMs: number
): string {
  if (current === 0) return 'calculating...';

  const rate = current / elapsedMs; // items per ms
  const remaining = total - current;
  const estimatedMs = remaining / rate;

  return formatDuration(estimatedMs);
}

/**
 * Display a summary table
 */
export function displaySummaryTable(data: Record<string, any>) {
  console.log('\n' + chalk.bold('Summary:'));
  console.log(chalk.gray('─'.repeat(50)));

  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

  for (const [key, value] of Object.entries(data)) {
    const paddedKey = key.padEnd(maxKeyLength);
    let displayValue = value;

    // Color code values
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('error') && value > 0) {
        displayValue = chalk.red(value);
      } else if (key.toLowerCase().includes('success') || key.toLowerCase().includes('inserted')) {
        displayValue = chalk.green(value);
      } else if (key.toLowerCase().includes('warning') && value > 0) {
        displayValue = chalk.yellow(value);
      } else {
        displayValue = chalk.cyan(value);
      }
    } else if (typeof value === 'boolean') {
      displayValue = value ? chalk.green('✓') : chalk.red('✗');
    }

    console.log(`  ${chalk.gray(paddedKey)} : ${displayValue}`);
  }

  console.log(chalk.gray('─'.repeat(50)) + '\n');
}

/**
 * Create a simple step indicator
 */
export class StepIndicator {
  private currentStep: number = 0;
  private steps: string[];

  constructor(steps: string[]) {
    this.steps = steps;
  }

  start() {
    console.log(chalk.bold('\nExecution Plan:'));
    this.steps.forEach((step, index) => {
      console.log(chalk.gray(`  ${index + 1}. ${step}`));
    });
    console.log('');
  }

  next(message?: string) {
    this.currentStep++;
    const step = message || this.steps[this.currentStep - 1];
    console.log(chalk.blue(`\n[Step ${this.currentStep}/${this.steps.length}]`) + ` ${step}`);
  }

  complete() {
    console.log(chalk.green.bold('\n✓ All steps completed!\n'));
  }
}
