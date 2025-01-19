export async function executeFnWithRetryPolicy<
  Fn extends (...args: unknown[]) => any,
  Args extends Parameters<Fn>,
  FnReturnType = ReturnType<Fn>
>(
  fn: Fn,
  args: Args,
  maxRetries = 5,
  delay = 3_000
): Promise<Awaited<FnReturnType>> {
  let retries = 0;
  let result: FnReturnType | null = null;

  while (retries < maxRetries) {
    try {
      result = fn(...args) as FnReturnType;
      break;
    } catch (e) {
      retries++;
      console.error(
        `Failed to execute function ${fn.name}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (result !== null) {
    return await result;
  } else {
    throw new Error(`Failed to execute function ${fn.name} after max retries.`);
  }
}
