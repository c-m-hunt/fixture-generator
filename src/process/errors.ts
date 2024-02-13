/**
 * Error thrown when the maximum number of iterations is exceeded.
 */
export class MaxIterationsExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaxIterationsExceededError";
  }
}

/**
 * Error class representing a low start point error.
 */
export class LowStartPointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LowStartPointError";
  }
}

/**
 * Represents an error that occurs when there is no progress.
 */
export class NoProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoProgressError";
  }
}
