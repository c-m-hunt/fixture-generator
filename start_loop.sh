#!/bin/bash

# Check if exactly one argument is provided
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <number_of_iterations>"
  exit 1
fi

# Validate that the argument is a number
if ! [[ $1 =~ ^[0-9]+$ ]]; then
  echo "Error: Argument must be a positive integer."
  exit 1
fi

# Assign the argument to a variable
loop_count=$1

# Loop the specified number of times
for i in $(seq 1 $loop_count)
do
   echo "Iteration: $i"
   bun run ./src/index.ts
done