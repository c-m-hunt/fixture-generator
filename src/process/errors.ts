export class MaxIterationsExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaxIterationsExceededError";
  }
}

export class LowStartPointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LowStartPointError";
  }
}

export class NoProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoProgressError";
  }
}
